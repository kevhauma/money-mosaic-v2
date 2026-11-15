# TICKET-STAT-54 — The top-transactions card skips nullified rows

- **Area:** Statistics (core/stats)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-32 (top-transactions part); fixes FR-STAT-12 ([TICKET-STAT-08](./TICKET-STAT-08-biggest-transactions.md)) against the `nullified` exclusion every other stat applies (`classifyForStats`)

## User story

As a user who nullified a bounced or reversed payment, I want it gone from "biggest transactions", so the card shows spending that actually happened.

## Description

Every stats aggregation skips `nullified` rows through `classifyForStats`. `computeTopTransactions` has its own filter and never checks the flag, so a nullified €1,200 debit can still be the top expense.

## Current situation (as-is)

- [top-transactions.ts:38-43](../../../src/app/core/stats/top-transactions.ts) — the filter checks range, own-movement (unless `cashflow`) and `amount < 0`; `transaction.nullified` is never read.
- Consumer: [stats.store.ts:146](../../../src/app/feature-dashboard/stats.store.ts) (dashboard) and the per-account scope (`'cashflow'` mode).

## Desired result (to-be)

- `computeTopTransactions` drops `nullified` rows in every mode, including `'cashflow'` (where `classifyForStats` also skips them).

## Acceptance criteria

- [ ] A nullified −€1,200 row and a −€80 row in range → only the −€80 row is returned.
- [ ] Same in `'cashflow'` mode.
- [ ] Non-nullified ordering and tie-break (amount, then newest date) unchanged; existing `top-transactions.spec.ts` cases pass.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: nullify the largest expense in the range; it leaves the dashboard's biggest-transactions card.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The other half of CR6-32 (shared refunds) is [TICKET-STAT-51](./TICKET-STAT-51-shared-refund-reduces-expense.md).
