# TICKET-SRV-16 — Restore renumbers `attributionOverride.jointAccountId`

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-DAT-2 (import a backup), TICKET-TXN-03 (attribution override); CR6-4 ([code review](../../releases/v3_code_review_2/code-review.md)); follows [TICKET-SRV-14](./TICKET-SRV-14-import-renumbers-colliding-ids.md)

## User story

As someone restoring a backup into a different account, I want my shared expenses to keep pointing at my joint account, so they still count at my share and I can still edit them.

## Description

When a restore renumbers a joint account, transactions marked "shared" keep the joint account's old id inside their attribution override. Stats then count them at 100%, and the edit form refuses them.

## Current situation (as-is)

- The `transactions` entry of `EMBEDDED` in [`import-ids.ts`](../../../server/src/operations/import-ids.ts) (lines 125–141) rewrites only `attributionOverride.reimbursementTransferId`. `jointAccountId` (defined at [`shared/entities.ts`](../../../shared/entities.ts) line 65) is copied unchanged.
- Example: joint account 3 is renumbered to 812, but shared-mode overrides still say `jointAccountId: 3`.
  - [`classify-joint-leg.ts`](../../../src/app/core/stats/classify-joint-leg.ts) (lines 121–125) can't find account 3, so the share falls back to 1 and a 50/50 expense counts at 100%.
  - Saving that transaction fails with "The selected joint account no longer exists." ([`attribution-override.ts`](../../../src/app/core/transactions/attribution-override.ts) line 41).

## Desired result (to-be)

- `attributionOverride.jointAccountId` is rewritten through the `accounts` plan, next to the `reimbursementTransferId` rewrite. An absent key stays absent, and an id the plan doesn't renumber is left alone.

## Acceptance criteria

- [ ] `remapReferences` rewrites `attributionOverride.jointAccountId` when the plan renumbers that account, and leaves it alone when it doesn't. (`import-ids.spec.ts`, extending "rewrites foreign keys and the transfer id inside attributionOverride".)
- [ ] A cross-account restore of a transaction with a shared-mode override ends with `jointAccountId` naming the importer's renumbered copy of the joint account. (`data.spec.ts`, new case.)
- [ ] `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **This doesn't repair rows an earlier cross-account restore already wrote.** Those still carry the old `jointAccountId`. Re-picking the joint account in the edit form fixes one; a one-off SQL fix covers many.
- [TICKET-SRV-22](./TICKET-SRV-22-restore-remap-covers-every-id-field.md) adds the spec that would have caught this, and builds on this fix.
