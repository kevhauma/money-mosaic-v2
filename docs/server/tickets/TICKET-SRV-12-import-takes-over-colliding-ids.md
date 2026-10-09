# TICKET-SRV-12 — An import takes over a colliding id instead of refusing the document

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** FR-DAT-2 (import a backup); removes the cross-account refusal TICKET-SRV-04 added to `upsertRow`

## User story

As someone holding a backup whose ids are already taken on this server, I want the import to go through, so a restore is not refused by a guard about rows I do not care about.

## Description

`POST /api/data/import` refused the whole document with a 409 when any row's id already belonged to another account. This removes that refusal: a colliding row is **taken over** — its contents become the backup's and its ownership moves to the importer. Requested directly, with the destructive consequence accepted; the cost is recorded here and in `upsertRow` because it cannot be undone.

## Current situation (as-is)

- [`data.ts`](../../../server/src/routes/data.ts) → `upsertRow` read the existing row's owner and threw `409 … id N in "accounts" already belongs to another account` whenever it was somebody else's, so **nothing** was written and the transaction rolled back.
- Ids collide by construction. They are unique per table across **all** users (SQLite autoincrement), where the pre-v3 browser database numbered each table from 1 for its single owner. This endpoint also preserves ids deliberately — every `accountId` / `categoryId` / `transferId` in the document points at them — so it cannot sidestep a collision by renumbering.
- **The remapping engine that existed for this is gone.** [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md) built it — "id remapping is the substance of this ticket", 700 lines plus 884 lines of spec — and `d4cd478` ([TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md), retire Dexie) deleted `server/src/operations/migrate-local.{ts,spec.ts}` with the Dexie reader that was its only caller. SRV-07's acceptance criteria are still ticked and still cite those paths, so that ticket is a false record; recoverable from `git show 200f6a6` if the capability is ever wanted back.
- Removing the 409 on its own would **not** have let an import finish. `asReplacement` skips `IGNORED_FIELDS`, which includes `userId`, so the `UPDATE` would have overwritten the other account's row while leaving it theirs — and `assertReferencesOwned`, which runs after the writes and before `COMMIT`, would then have rejected the document for referencing a row the importer does not own. The result was corruption of the other account *plus* a failed import.

## Desired result (to-be)

- A colliding row **changes hands**: the `UPDATE` writes `userId` along with the replacement values, so the row becomes the importer's and `assertReferencesOwned` is satisfied.
- Writing `userId` for a row that is already the importer's is a no-op, so the ordinary same-account restore is unchanged.
- The import succeeds and answers 204; there is no 409 on this path any more.
- **The other account loses the row.** Not a copy — the single row moves. A row that account still holds pointing at this id now references something it does not own; SQLite's foreign keys still resolve, because the row exists, but the reference stops meaning what it meant.
- The cost is stated where someone will meet it: in `upsertRow`'s comment, in `server/README.md`'s endpoint notes, and in the spec that pins it.

## Acceptance criteria

- [x] `POST /api/data/import` answers 204 for a document whose ids belong to another account, and the rows are the importer's afterwards under the same ids. (`data.spec.ts` -> "takes over a row whose id belongs to another account, and that account loses it": Bob's whole export imported into Alice's account answers 204, and `GET /api/accounts/<bob's id>` as **Alice** reads the row back. The 204 is the load-bearing assertion — before this change the same request was a 409, and with `userId` left unwritten it would have been a 400 from `assertReferencesOwned`.)
- [x] The account that held those ids can no longer read them. (Same test: `GET /api/accounts/<its own id>` as Bob is a 404, and `GET /api/accounts` as Bob is `[]` — his backup described his whole account, so he is left with nothing. Asserted rather than implied, because this is the half that cannot be undone.)
- [x] A same-account restore is unaffected — ids preserved, contents replaced, no change in behaviour from before this ticket. (Writing `userId` for a row that is already the importer's is a no-op. The three pre-existing cases — "restores an export of the same account, ids and all", "replaces, so a row absent from the backup is gone afterwards" and "merges without clearing, updating the rows it carries" — pass unchanged and untouched.)
- [x] `assertReferencesOwned` still rejects a document that references a row which is in neither the backup nor the importer's own rows, so the takeover does not weaken the dangling-reference guard. (Unchanged and still passing: "rejects a document whose rows reference rows it does not contain". The guard only ever stopped weakening for ids the *document itself* carries — a row that is not in the document is not taken over, so a reference to a stranger's row the backup does not include is still a 400.)
- [x] The `replace`-mode and `merge`-mode cases, the `schemaVersion` guard, the rollback-on-later-failure case and every TICKET-SRV-11 staging case keep passing. (`npm --prefix server run test`: 33 files, 430 tests, all passing — the same 430 as before this change, since one case was rewritten rather than added.)
- [x] Unit tests cover: the takeover, the loss on the other side, and the unchanged same-account restore. (One rewritten case carries the first two with a doc comment saying what it is pinning and why; the three pre-existing restore cases carry the third.)
- [x] `server/README.md` states the destructive behaviour rather than the removed 409. (Its endpoint notes now say an import takes the row over and the other account loses it, and add that there is **no** id remapping on this path because TICKET-SRV-07's engine was deleted with Dexie — so restoring a backup into an account other than its own is a destructive operation on whoever holds those ids.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues` both exit 0 — `upsertRow` got *simpler*, since a branch was removed. `ng lint`, `npm --prefix server run lint`, `npm --prefix server run typecheck`, `ng test` (3843) and `ng build --configuration development` all clean. No convention departures: the change is four lines of behaviour inside an existing function plus the comment that explains it.)
- [ ] Verified live in the browser: import the backup that prompted this and confirm it lands.

## Notes

- **This is a data-loss path, accepted knowingly.** It was requested as "remove the 'belongs to another account' restriction", the overwrite consequence was spelled out beforehand, and the reply was that the destructive outcome did not matter. Recorded in that much detail because the next person to read `upsertRow` will reasonably assume a cross-account write is a bug.
- **A household server is the context that makes it sharp.** Money Mosaic is hosted for several accounts on one SQLite file (TICKET-AUTH-03 gives it an admin panel), so "another account" is a real person in the same house, not a hypothetical tenant. Restoring one person's backup into another person's account moves that person's rows across.
- **The safe alternative, if this is ever regretted:** restore the remap engine from `200f6a6` and route the import through it when a collision is detected — a fresh id for the colliding row and every reference to it rewritten inside the same transaction. It was offered and declined in favour of the smaller change; nothing here forecloses it.
- **A follow-up worth its own ticket:** TICKET-SRV-07's criteria claim files that TICKET-SRV-08 deleted. Either the criteria should be amended to record the deletion, or the capability restored — but the ticket should not keep asserting a `migrate-local.ts` that is not in the tree.
- Depends on [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) (the endpoint and the guard it is removing) and sits on top of [TICKET-SRV-11](./TICKET-SRV-11-staged-import-upload.md) (the staged upload the same endpoint now takes).
