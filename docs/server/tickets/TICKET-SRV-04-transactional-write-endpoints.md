# TICKET-SRV-04 — The multi-table write paths become transactional server endpoints

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** preserves NFR-RESIL-1 (transactional writes) across the move to a server; planned for v3

## User story

As someone importing a bank file or deleting an account, I want the whole operation to either finish or not happen at all, so a dropped connection cannot leave me with transactions that reference a batch that was never written.

## Description

Nine write paths in the app currently span more than one table inside a single Dexie transaction. A per-table REST API cannot express them — two HTTP calls are two transactions, and the gap between them is where the data gets corrupted. This ticket moves each of those operations behind one endpoint that runs inside one SQLite transaction.

## Current situation (as-is)

Every direct `appDb.transaction('rw', [...])` in the app, which is precisely the set that has to move:

- [`import.service.ts:223`](../../../src/app/core/import/import.service.ts) — **commit an import**: creates the `ImportBatch`, bulk-adds the accepted `Transaction` rows with the new `batchId`, applies the `rawLine`/`rawRow` backfill updates to rows that already existed, then re-reads the batch and throws `Import batch failed to persist` if it is missing. Spans `transactions` + `importBatches`.
- [`import.service.ts:287`](../../../src/app/core/import/import.service.ts) — **undo an import**: reads the batch's transactions, runs `removeTransactionsWithTransferCleanup`, deletes the batch. Spans `transactions` + `importBatches` + `transfers`, because a removed transaction may have been auto-linked to one from a *different* import (FR-TRF-2 re-links across the whole dataset).
- [`transaction-deletion.service.ts:17`](../../../src/app/core/transactions/transaction-deletion.service.ts) — **delete transactions**, with the same transfer cleanup. Spans `transactions` + `transfers`.
- [`transfer-linking.service.ts:58,85,113`](../../../src/app/core/transfers/transfer-linking.service.ts) — **link**, **unlink** and **relink** a transfer: writing a `Transfer` row and stamping/clearing `transferId` on both legs is one fact expressed in two tables.
- [`account-deletion.service.ts:31,42`](../../../src/app/core/accounts/account-deletion.service.ts) — **delete an account's transactions** and **delete the account itself**, the latter spanning `accounts` + `transactions` + `transfers`.
- [`transfer-cleanup.service.ts`](../../../src/app/core/transfers/transfer-cleanup.service.ts) — not a transaction of its own; its doc comments state it **must run inside the caller's `rw` scope** covering at least `transactions` + `transfers`. It is the shared body three of the above call into.

Also multi-table, and generic over every table at once:

- [`data-management.repository.ts`](../../../src/app/core/data-access/data-management.repository.ts) — `exportAll`, `importAll(data, mode)` (transactional per NFR-RESIL-1, and guarded by a `schemaVersion > appDb.verno` rejection) and `deleteAll`.

## Desired result (to-be)

- **One endpoint per operation**, each running inside a single `better-sqlite3` transaction so partial application is impossible:
  - `POST /api/import/commit` — batch + transactions + backfill, returning the same `{ batch, addedTransactions, duplicateCount, backfilledTransactions }` shape `commitImport` returns today.
  - `POST /api/import/:batchId/undo` — returns `{ unlinkedTransferIds, clearedTransferTransactionIds }`.
  - `GET /api/import/:batchId/undo-preview` — the read-only `previewUndo` counts, unchanged in meaning.
  - `POST /api/transactions/delete` — ids in, transfer cleanup applied, cleanup result out.
  - `POST /api/transfers/link`, `POST /api/transfers/:id/unlink`, `POST /api/transfers/:id/relink`.
  - `POST /api/accounts/:id/transactions/delete` and `DELETE /api/accounts/:id` (the account plus everything hanging off it).
  - `GET /api/data/export`, `POST /api/data/import` (with the `replace | merge` mode), `DELETE /api/data` — the whole-dataset three, each over the signed-in user's rows only.
- **The cleanup logic moves, it is not rewritten.** `removeTransactionsWithTransferCleanup` and its sibling port to the server as a shared function with the same rules — the surviving leg of a broken transfer gets its `transferId` cleared, the `Transfer` row goes, and a transaction linked to one from another batch is handled. Its current behaviour is the specification; the existing specs port with it.
- **Everything the client keeps** is what the operation *returns*. `ImportService`, `TransactionDeletionService`, `TransferLinkingService` and `AccountDeletionService` stay where they are and keep their public signatures — their bodies become a single call. The CSV parsing, mapping, fingerprinting and dedupe decisions stay **client-side** in the web worker; only the commit crosses the wire.
- **Import commit sends decided rows, not a file.** The worker still parses and maps; the endpoint receives the already-accepted transactions and the backfill updates and writes them. No CSV parsing moves to the server in this version.
- **The `schemaVersion` guard survives** on `POST /api/data/import`: a payload from a newer schema than the server knows is rejected before anything is written, exactly as `importAll` rejects it against `appDb.verno` today.
- **Errors are rollbacks.** A failure anywhere inside an endpoint rolls the whole transaction back and returns a 4xx/5xx with a message the existing UI can show. The `Import batch failed to persist` invariant becomes a transaction abort rather than a thrown error after a partial write.

## Implementation notes (2026-09-25)

Four scope calls made while building this, recorded here rather than left implicit:

- **This ticket ships the server half only.** Every operation below is an endpoint with tests; the
  four client services keep their Dexie bodies for now. They could not call these endpoints yet even
  if they wanted to: `HttpClient` and its credentials interceptor arrive in
  [TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md), which this
  ticket deliberately does not depend on, and rewiring the repositories is
  [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md)'s job — the one it calls "the point of
  no return", since up to it the app still works with the server switched off. The two criteria that
  assumed the rewiring are amended below rather than ticked.
- **There is no "relink".** The three transfer write paths the as-is section points at
  (`transfer-linking.service.ts:58,85,113`) are link, the **auto-link batch** (`linkAutoBatch`,
  TICKET-PERF-04) and unlink; nothing in the app relinks, and `POST /api/transfers/:id/relink` would
  have been an endpoint with no caller. `POST /api/transfers/link/batch` took its place.
- **`categoryModel` is not in the export document.** Three blob columns of `Float32` weights cannot
  survive JSON — `JSON.stringify` turns an `ArrayBuffer` into `{}`, which is how the Dexie export has
  always silently lost them (TICKET-DAT-05's closing note). A backup carries the transactions the
  model is trained *from*, so the cost is one retraining rather than any data, and
  `/api/categoryModel` already moves it as bytes. `DELETE /api/data` and a `replace` import still
  clear the row, because it describes a dataset that is being replaced.
- **`DELETE /api/accounts/:id` answers 200 with the cascade report** rather than the shared entity
  router's 204: `AccountsStore.removeAccount` mirrors the removed transactions, the removed transfers
  and the cleared stamps into three stores and has no other way to learn them. `ENTITY_SAMPLES` grew
  a `deleteStatus` so the shared isolation spec still asserts an exact status rather than a range.

## Review fixes (2026-09-25)

The `conventions-reviewer` pass confirmed the transactional properties hold — one transaction per
endpoint, nothing escaping it, ownership genuinely inside it, `transfer-cleanup.ts` a faithful
line-by-line port, and user scoping on every statement of every new path. The scope call (server
half only) was judged sound and honestly recorded. Five things were fixed.

1. **Deleting a category froze its transactions permanently.** The endpoint leaned on the column's
   `ON DELETE SET NULL`, which clears `categoryId` — but `CategoriesStore.removeCategory` clears
   **`categoryManual` with it**, and both `RulesEngineService` and the co-owner attribution skip
   any row where that flag is set. So every transaction whose category had been set by hand would
   have become a category-less row the rules engine is forbidden from ever categorising again —
   invisible until SRV-05 switched the client over. Now written explicitly inside the same
   transaction, with a regression test confirmed to fail without it. The schema comment claiming
   SET NULL "is exactly what `removeCategory` does" was false and has been corrected.
2. **`merge` was a patch, not a `bulkPut`.** `parseEntityBody` builds only the keys the document
   carries, and the export strips nulls — so a field absent from the backup survived the merge,
   where Dexie's `put` replaces the object wholesale. Export, add a note, merge the backup back,
   and the note stayed. Now routed through `asReplacement`, which existed for exactly this and was
   unused here.
3. **`POST /api/transactions/delete` was stricter than the service it replaces**, 404-ing the whole
   request if any id was already gone — where `bulkDelete` is a no-op on a missing key. A stale
   selection (a row deleted in another tab, or an import batch just undone) would have failed
   wholesale. Missing ids are now skipped; the property that matters is unchanged and still tested:
   another user's row is never touched and never appears in the report.
4. **`importBatches.mappingProfileId` was an unchecked cross-user reference** — a real reference
   declared as a plain column, so SRV-03's derivation could not see it and it was missing from
   `SOFT_REFERENCES`. Added, inventory count bumped.
5. The raw `DELETE /api/transfers/:id` and `DELETE /api/transactions/bulk` still perform no
   transfer cleanup — that is the orphan state this ticket exists to prevent — and `api.spec.ts`
   was pointing SRV-05 at them as "the endpoint it will call". Both endpoints and both registry
   entries now carry a warning saying so, and noting that their only caller is a service whose body
   is now server-side, so SRV-05 should **delete those repository methods** rather than wire them.

Two criteria were reworded rather than quietly left standing: the loan refusal counts **archived**
loans too (wider than "an active loan" said), and there are **ten** transactional write endpoints
rather than nine, the tenth proving its rollback by a refused batch candidate instead of an
`abortOn` trigger.

Left as-is: a failed import commit answers a bare 500 rather than a message the UI can show. The
invariant it guards is unreachable by construction, and the wording criterion is the one thing it
misses.

## Acceptance criteria

- [x] **Ownership is validated inside the transaction, not before it.** Every foreign-key field these multi-table writes touch is confirmed to belong to the signed-in user as part of the same transaction that writes, so a concurrent delete cannot slip between the check and the write. Carries the same 404-not-403 rule as TICKET-SRV-03. (Every check is a statement *of* the writing transaction: `ownsRow` opens `cascadeTransactions` in [`accounts.ts`](../../../server/src/routes/accounts.ts), `insertOwnedRow`/`updateOwnedRow` carry `assertReferencesOwned` in [`import.ts`](../../../server/src/routes/import.ts) and [`transfers.ts`](../../../server/src/routes/transfers.ts), `POST /api/transactions/delete` re-reads the ids user-scoped and 404s if one is missing, and [`data.ts`](../../../server/src/routes/data.ts) runs its reference pass after the inserts but before COMMIT. A "refuses another user's row, and writes nothing" case in each of `import.spec.ts`, `transfers.spec.ts`, `accounts.spec.ts`, `transactions.spec.ts` and `data.spec.ts` — 404 every time, except the whole-document import, where the same check reports the malformed payload as a 400 that still does not say which of "absent" or "somebody else's" it was.)
- [x] **Deleting a category a loan still tracks is refused with a readable message**, not a raw SQLite constraint failure. (_Amended 2026-09-25: this said "an **active** loan". The check deliberately counts **archived** loans too — the foreign key does not care whether a loan is archived, and neither should the refusal, or archiving a loan would quietly re-enable a delete that destroys its category link. The shipped behaviour is wider than the original wording, not narrower._) TICKET-SRV-02 gave `loans.categoryId` a NO ACTION foreign key precisely so this surfaces as a refusal rather than silently destroying the loan; this endpoint turns that into a 409 that names the loan. ([`categories.ts`](../../../server/src/routes/categories.ts) asks which of the user's loans track the category and throws a 409 naming them — built from that query, never from a caught constraint message. `categories.spec.ts` covers one loan, an **archived** loan (the constraint does not care, so neither does the check), two loans named in one sentence, and the 404 another user still gets instead of a 409; `entity-router.spec.ts`'s former "never answers with a SQLite constraint message" case now asserts the 409 contains `"Car"` and does not contain `constraint`.)
- [x] Each of the nine operations is one endpoint, and each runs in exactly one SQLite transaction — asserted per endpoint by forcing a failure at the last step and confirming **nothing** was written. (`abortOn` in [`app.testing.ts`](../../../server/src/app.testing.ts) installs a `BEFORE <event>` trigger that raises, so the failure lands *after* the earlier writes rather than at a validation. Nine such cases: commit and undo (`import.spec.ts`), `POST /api/transactions/delete` (`transactions.spec.ts`), link and unlink (`transfers.spec.ts`), account delete and clear (`accounts.spec.ts`), data import and delete-all (`data.spec.ts`) — each asserts the 500 and then re-reads every row the endpoint would have touched.

  _Amended 2026-09-25: the implementation has **ten** transactional write endpoints, not nine — the second scope call below promoted `POST /api/transfers/link/batch` to a third transfer write path after this criterion was written. Nine carry an `abortOn` case; the tenth's rollback is proven differently, by a batch whose second candidate is refused, which rolls back an item already inserted (`transfers.spec.ts`). Same property, different forcing mechanism._)
- [x] `POST /api/import/commit` returns the same shape `commitImport` returns today, ~~and the client-side `ImportService` needs no change beyond its body~~ — **amended 2026-09-25**: the endpoint half is done, and the client keeps its Dexie body until TICKET-SRV-05 (see the implementation notes above), so what is asserted here is that the response is the shape that body will return. (`import.spec.ts` asserts the response keys are exactly `batch`, `addedTransactions`, `duplicateCount`, `backfilledTransactions`, that every added row carries the new batch's `importBatchId`, and that the backfill echoes `{ id, changes }` the way `patchMany` wants it.)
- [x] Undoing an import removes its transactions and batch **and** cleans up transfers that linked into a different batch — the FR-TRF-2 cross-batch case, tested explicitly. (`import.spec.ts` → "cleans up a transfer that linked into a different batch (FR-TRF-2)": two committed batches, one link between them, and undoing the first reports `unlinkedTransferIds: [transfer]` and `clearedTransferTransactionIds: [the other batch's row]`, with that row reading back without a `transferId`.)
- [x] Undoing an already-undone batch is a stated no-op reporting zeroes, matching `previewUndo`'s current contract. (`import.spec.ts` → "is a no-op reporting zeroes when the batch was already undone", plus the preview's own zeroes case. The same answer covers an unknown id and another user's — every statement is user-scoped, so there is nothing to refuse and nothing is confirmed either way, which "does nothing to another user's batch" pins.)
- [x] `previewUndo`'s counts and the undo's actual effect cannot disagree — both read through the same query, covered by a test asserting the reported `rowCount` equals the rows deleted. (One `batchTransactions` in `import.ts` serves both routes; `import.spec.ts` → "cannot disagree with what the undo removes" asserts `before - after === preview.rowCount`.)
- [x] Deleting an account removes its transactions and repairs every transfer that pointed at them, leaving no orphan `transferId` on a surviving transaction — with foreign keys enabled, so an incomplete cleanup fails the test rather than passing quietly. (`accounts.spec.ts` links a transaction in the doomed account to one in a second account, deletes the account, then reads the survivor back: still there, `transferId` gone, transfer row gone. `openDatabase` sets `foreign_keys = ON` for every test database, so the cascade half is SQLite's own.)
- [x] Link / unlink / ~~relink~~ **the auto-link batch** each leave both legs and the `Transfer` row consistent, or leave all three untouched — **amended 2026-09-25**, see the implementation notes: nothing in the app relinks, so `linkAutoBatch` is the third write path. (`transfers.spec.ts`: link stamps both legs and clears their category, the batch links a whole pass and aborts it entirely when one candidate is refused, unlink removes all three plus any `attributionOverride.reimbursementTransferId` that named the transfer, and the two forced-failure cases leave every row as it was.)
- [x] `POST /api/data/import` rejects a payload whose `schemaVersion` exceeds the server's and writes nothing. (`data.spec.ts` → "rejects a payload from a newer schema than the server, and writes nothing": a 400 quoting the version, with every pre-existing row unchanged, because the guard runs before the transaction opens. `DATA_SCHEMA_VERSION` is the Dexie verno this schema ports rather than the migration count, and the first test in that file pins it against the highest `.version(n)` in `app-db.ts`, so a future Dexie version cannot be ported without raising it.)
- [x] `GET /api/data/export` returns only the signed-in user's rows; a two-user test confirms no cross-contamination in either direction. (`data.spec.ts` → "returns only the signed-in user's rows, in both directions", plus one case asserting the document carries every transportable table and none of `users`/`sessions`/`categoryModel`, and one asserting entity shapes — no `userId`, no nulls.)
- [x] `DELETE /api/data` clears the signed-in user's rows and leaves every other user's intact. (`data.spec.ts` → "clears the signed-in user's rows and leaves every other user's intact"; a second case forces one table's delete to fail and finds every table still populated.)
- [x] The ported transfer-cleanup specs pass against the server implementation with the same cases they cover today. ([`server/src/operations/transfer-cleanup.spec.ts`](../../../server/src/operations/transfer-cleanup.spec.ts) carries all six cases of `transfer-cleanup.service.spec.ts` — no-op without a `transferId`, clear the surviving side, leave a doomed survivor alone, de-duplicate a shared `transferId`, cleanup-then-delete, and the empty selection — asserted against real rows instead of mocked calls, plus two new ones for user scoping. The doc comments explaining the caller-scope contract ported with the code.)
- [x] Backend tests cover every case above; the existing client-side service specs still pass ~~against a mocked HTTP layer~~ — **amended 2026-09-25**: they still run against Dexie, because this ticket does not rewire them (see the implementation notes); the mocked-HTTP conversion belongs to TICKET-SRV-05. (`npm --prefix server run test`: 30 files, 362 tests passing, of which 58 live in the six new spec files (`operations/transfer-cleanup.spec.ts` 8, `import.spec.ts` 14, `transfers.spec.ts` 11, `accounts.spec.ts` 6, `categories.spec.ts` 5, `data.spec.ts` 14), with more added to `transactions.spec.ts` and `api.spec.ts`. `ng test`: 307 files, 3602 tests passing, unchanged — `git diff` touches nothing under `src/`.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` both exit 0; `ng lint`, `npm --prefix server run lint` and `npm --prefix server run typecheck` all clean. The new modules follow the conventions SRV-03's routers established: a router takes the Drizzle instance alone, literal routes are registered before the shared factory, only deliberate 4xx wording reaches a body, and prettier ran over `server/src`.)
- [ ] Verified live in the browser: import a real CSV, confirm the batch and rows appear, undo it, and confirm both the rows and the batch are gone and no transfer is left dangling. — not ticked: browser verification waived by the user for the v3 server/auth run. Nothing in the browser reaches these endpoints yet either (TICKET-SRV-05 is what points the client at them), so the live check that proves this one is the check on that ticket.

## Notes

- **This is the ticket where "just swap the repositories" stops being true.** [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) can mechanically reimplement seventeen repositories; these nine paths cannot be reimplemented mechanically, because atomicity across tables does not survive being split into two HTTP calls. Doing them first means SRV-05 has nothing left that spans tables.
- **Why the CSV worker stays client-side**: it is already off the main thread, it needs no database, and moving it would mean uploading files and streaming progress back — a much larger change for no correctness gain. Revisit only if someone wants server-side scheduled imports.
- `transfer-cleanup.service.ts`'s doc comments explicitly describe the transaction-scope contract it relies on. Port those comments with the code — they are the reason the function is shaped the way it is, and they will be the first thing a reader questions.
- Depends on [TICKET-SRV-03](./TICKET-SRV-03-rest-api-per-entity.md) (routing, auth scoping, validation conventions) and [TICKET-SRV-02](./TICKET-SRV-02-drizzle-schema-per-user.md).
