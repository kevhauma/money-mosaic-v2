# TICKET-SRV-15 — Restore prunes an orphan transfer when its legs aren't the importer's

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-DAT-2 (import a backup); CR6-1 ([code review](../../releases/v3_code_review_2/code-review.md)); same mistake 0317fe74 fixed for soft references

## User story

As someone restoring an old backup onto a server other people also use, I want leftover links between deleted transactions to be dropped, so my restore isn't refused because of rows that belong to someone else.

## Description

Pre-v3 backups carry transfers whose two transactions were deleted long ago. The restore prunes those, but it decides "deleted" by asking whether a transaction with that id exists for **anyone**. On a server with a second user, those old low ids usually belong to the other user's transactions, so the orphan survives and the whole restore is refused.

## Current situation (as-is)

- `pruneOrphanTransfer` in [`data.ts`](../../../server/src/routes/data.ts) (lines 234–254) treats a transfer as an orphan only when a leg fails `rowExists(tx, transactions, leg)` (line 243). [`rowExists`](../../../server/src/http/ownership.ts) (line 132) looks across every user, unlike `ownsRow` (line 121) right above it.
- A leg that isn't in the document is never renumbered by `remapReferences`, so it still carries the backup's old id. If another user holds that id, the transfer is kept. `assertReferencesOwned` (lines 319–329) then sees a hard reference to a row the importer doesn't own and answers 400 "…references a row that is not in the backup, or belongs to another account. Nothing was imported."
- The existing spec ([`data.spec.ts`](../../../server/src/routes/data.spec.ts), "drops a transfer whose legs are not in the backup…", line 404) uses leg ids 999_998/999_999, which nobody holds, so it never hits this path.

## Desired result (to-be)

- The orphan check asks whether the importer owns each leg: `ownsRow(tx, transactions, leg, userId)`. A transfer with a leg the importer doesn't own after the writes is pruned, whoever else holds that id.
- Pruning still clears the importer's own surviving leg's `transferId`, and never touches another user's rows.

## Acceptance criteria

- [ ] A backup holding a transfer whose legs are ids of **another user's** transactions restores with 204. The transfer is gone, and the other user's transactions and their `transferId`s are unchanged. (`data.spec.ts` → new case "prunes an orphan transfer whose leg ids another account holds".)
- [ ] The existing "drops a transfer whose legs are not in the backup" case and the cross-account renumbering cases still pass.
- [ ] A transfer whose legs are both in the document, including legs renumbered by `planImportIds`, is kept.
- [ ] `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- In `merge` mode `ownsRow` also accepts an importer-owned transaction that was there before the restore. A pre-v3 leg id that happens to match one of the importer's own rows would therefore keep the transfer pointing at an unrelated transaction. `rowExists` has the same gap today, so this ticket doesn't widen it; [TICKET-SRV-18](./TICKET-SRV-18-cross-account-merge-idempotent.md) narrows cross-account merges anyway.
- [TICKET-SRV-17](./TICKET-SRV-17-restore-prunes-dangling-hard-references.md) (recurring overrides) and [TICKET-SRV-23](./TICKET-SRV-23-restore-handles-orphan-loans.md) (orphan loans) build on this same post-write step.
