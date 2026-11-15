# TICKET-SRV-20 — Restore never hands out a deleted id again

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-DAT-2 (import a backup); CR6-34 ([code review](../../releases/v3_code_review_2/code-review.md)); follows [TICKET-SRV-14](./TICKET-SRV-14-import-renumbers-colliding-ids.md)

## User story

As someone restoring a backup into my account, I want renumbered rows to get ids that were never used before, so an old leftover reference in my data can't suddenly point at the wrong account or batch.

## Description

When a restore has to renumber a row, it picks ids just above the table's current highest id. If the highest rows were deleted earlier, those ids were already used once. Soft references, which are allowed to outlive their parent, can still name them, and the renumbered row then quietly becomes their target.

## Current situation (as-is)

- `freshIdsFor` in [`import-ids.ts`](../../../server/src/operations/import-ids.ts) (lines 50–58) starts from `max(id)` of the table and the document's highest id.
- Every per-user table is `AUTOINCREMENT` (for example [`accounts.ts`](../../../server/src/schema/accounts.ts) line 25), so SQLite keeps a high-water mark in `sqlite_sequence` and never reuses an id itself. The restore ignores it.
- Soft references (`SOFT_REFERENCES` in [`ownership.ts`](../../../server/src/http/ownership.ts), lines 53–70) are exactly the fields that may name a deleted row:
  - `importBatches.accountId` and `mappingProfileId`
  - `mappingProfiles.defaultAccountId`
  - `transactions.transferId` and `importBatchId`
  - `recurringOverrides.mergedIntoTransactionId`
- Example: the backup holds a batch whose account 50 was deleted before the export, and the table's highest id is now 49. A colliding account from the same backup gets fresh id 50, and the batch now appears to belong to it.
- In `replace` mode the importer's own rows are cleared first, which lowers `max(id)` further and makes this more likely.

## Desired result (to-be)

- The floor for fresh ids is the highest of three values: `sqlite_sequence.seq` for the table, `max(id)`, and the document's highest id. A fresh id is therefore above every id the table has ever handed out.
- Nothing else about the plan changes. Free ids and ids the importer already owns are kept.

## Acceptance criteria

- [ ] With the table's highest row deleted, a renumbered row gets an id above the deleted one. (`import-ids.spec.ts` → new case "fresh ids skip ids a deleted row once held".)
- [ ] A restore whose soft reference names a deleted id doesn't end with that reference pointing at a renumbered row. (`data.spec.ts`, new case using `importBatches.accountId`.)
- [ ] The existing renumbering cases in `import-ids.spec.ts` and `data.spec.ts` still pass.
- [ ] `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- SQLite raises `sqlite_sequence` when a row is inserted with an explicit id above it, so restored rows keep it correct with no extra writes.
- `sqlite_sequence` has no row for a table nothing has been inserted into yet; treat that as 0.
- Sequenced after [TICKET-SRV-18](./TICKET-SRV-18-cross-account-merge-idempotent.md), which may change when renumbering happens at all.
