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

## Acceptance criteria

- [ ] Each of the nine operations is one endpoint, and each runs in exactly one SQLite transaction — asserted per endpoint by forcing a failure at the last step and confirming **nothing** was written.
- [ ] `POST /api/import/commit` returns the same shape `commitImport` returns today, and the client-side `ImportService` needs no change beyond its body.
- [ ] Undoing an import removes its transactions and batch **and** cleans up transfers that linked into a different batch — the FR-TRF-2 cross-batch case, tested explicitly.
- [ ] Undoing an already-undone batch is a stated no-op reporting zeroes, matching `previewUndo`'s current contract.
- [ ] `previewUndo`'s counts and the undo's actual effect cannot disagree — both read through the same query, covered by a test asserting the reported `rowCount` equals the rows deleted.
- [ ] Deleting an account removes its transactions and repairs every transfer that pointed at them, leaving no orphan `transferId` on a surviving transaction — with foreign keys enabled, so an incomplete cleanup fails the test rather than passing quietly.
- [ ] Link / unlink / relink each leave both legs and the `Transfer` row consistent, or leave all three untouched.
- [ ] `POST /api/data/import` rejects a payload whose `schemaVersion` exceeds the server's and writes nothing.
- [ ] `GET /api/data/export` returns only the signed-in user's rows; a two-user test confirms no cross-contamination in either direction.
- [ ] `DELETE /api/data` clears the signed-in user's rows and leaves every other user's intact.
- [ ] The ported transfer-cleanup specs pass against the server implementation with the same cases they cover today.
- [ ] Backend tests cover every case above; the existing client-side service specs still pass against a mocked HTTP layer.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: import a real CSV, confirm the batch and rows appear, undo it, and confirm both the rows and the batch are gone and no transfer is left dangling.

## Notes

- **This is the ticket where "just swap the repositories" stops being true.** [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) can mechanically reimplement seventeen repositories; these nine paths cannot be reimplemented mechanically, because atomicity across tables does not survive being split into two HTTP calls. Doing them first means SRV-05 has nothing left that spans tables.
- **Why the CSV worker stays client-side**: it is already off the main thread, it needs no database, and moving it would mean uploading files and streaming progress back — a much larger change for no correctness gain. Revisit only if someone wants server-side scheduled imports.
- `transfer-cleanup.service.ts`'s doc comments explicitly describe the transaction-scope contract it relies on. Port those comments with the code — they are the reason the function is shaped the way it is, and they will be the first thing a reader questions.
- Depends on [TICKET-SRV-03](./TICKET-SRV-03-rest-api-per-entity.md) (routing, auth scoping, validation conventions) and [TICKET-SRV-02](./TICKET-SRV-02-drizzle-schema-per-user.md).
