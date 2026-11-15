# TICKET-SRV-17 — Restore prunes recurring overrides whose anchor transaction is gone

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-DAT-2 (import a backup), TICKET-REC-11 (recurring overrides); CR6-5, part ([code review](../../releases/v3_code_review_2/code-review.md))

## User story

As someone restoring a backup made by the old browser-only app, I want leftover "dismissed" or "merged" marks on recurring payments I deleted back then to be dropped, so the restore works instead of refusing the whole file.

## Description

The pre-v3 app never deleted recurring overrides when their transactions went away. A backup can therefore hold an override anchored on a transaction that no longer exists, and the restore refuses the whole backup with a generic "references a row that is not in the backup" message. The server would have cascaded such an override away anyway, so it should be pruned the way orphan transfers are.

## Current situation (as-is)

- `importDocument` in [`data.ts`](../../../server/src/routes/data.ts) runs `pruneOrphanTransfer` (lines 312–315), then `assertReferencesOwned` on every kept row (lines 319–329). Only transfers are pruned.
- `recurringOverrides.anchorTransactionId` is a hard foreign key with `onDelete: 'cascade'` ([`recurring-overrides.ts`](../../../server/src/schema/recurring-overrides.ts) lines 35–37).
- On main, nothing deletes `recurringOverrides` on import undo or account delete: `git grep recurringOverrides main -- src` finds only the Dexie schema, its repository and specs. So a pre-v3 backup can hold an override whose anchor is gone, and the restore answers 400.

## Desired result (to-be)

- After the writes, any override whose `anchorTransactionId` the importer doesn't own is deleted, in the same step that prunes orphan transfers.
- `mergedIntoTransactionId` is a soft reference and keeps its current rules.

## Acceptance criteria

- [ ] A backup with a recurring override whose anchor transaction isn't in it restores with 204, without that override. The other overrides are kept. (`data.spec.ts` → new case "drops a recurring override whose anchor transaction is not in the backup".)
- [ ] The same holds when the anchor id belongs to **another user's** transaction, and that user's rows are untouched. (`data.spec.ts`, second case.)
- [ ] The orphan-transfer cases from [TICKET-SRV-15](./TICKET-SRV-15-restore-prunes-orphan-transfers-by-ownership.md) and the existing "writes nothing when a later table fails" case still pass.
- [ ] `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Build after SRV-15: both change the same prune step. One prune pass over `written`, with a rule per table, is the natural shape.
- The CR6 finding is marked _likely_ (not reproduced); the code path above is confirmed.
- Orphan loans, the other half of CR6-5, are [TICKET-SRV-23](./TICKET-SRV-23-restore-handles-orphan-loans.md).
