# TICKET-STAT-51 — A refund marked shared reduces expense instead of counting as income

- **Area:** Statistics (core/stats)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-32 (shared-refund part); fixes FR-STAT-2/FR-STAT-3 for the `attributionOverride` modes of TICKET-TXN-03/TXN-04; same netting rule TICKET-STAT-11 set for plain accounts

## User story

As a user who marks a refund of a shared purchase as "shared", I want it to reduce my expense in that category, so my income, expense and savings rate aren't inflated by money that was only ever my own spending coming back.

## Description

A positive amount on an expense category with a `shared` override is bucketed by the sign of its weight, so it lands in income. Every other path nets a refund back against its category: a plain account through `categoryKindContribution`, a `personal` override likewise, and an untagged joint refund by deducting the share from expense. `shared` is the one path that doesn't.

## Current situation (as-is)

- [classify-for-stats.ts:129-145](../../../src/app/core/stats/classify-for-stats.ts) — inside the joint/override branch, `personal` nets by category kind (129-133), the untagged joint refund is deducted from expense (134-141), and everything else falls to `if (weight > 0) return { kind: 'income', … }` (142).
- [classify-joint-leg.ts:121-127](../../../src/app/core/stats/classify-joint-leg.ts) — a `shared` override's weight is `amount × jointAccount.ownershipShare`.
- Example: +€40 refund under "Groceries" (expense), `shared` override on a 50% joint account → weight +20 → income +€20. Expense stays €20 too high and income €20 too high, so the savings-rate denominator grows too.
- Found while confirming: a `shared` row under a `neutral` category also counts by weight sign today, though `neutral` is meant to be excluded.

## Desired result (to-be)

- A `shared` override row is netted by category kind on its weight — `categoryKindContribution(weight, category?.kind)` — the same as `personal`. A positive weight on an expense category reduces expense; a negative weight on an income category reduces income; an uncategorised row still buckets by sign; a `neutral` category is skipped.

## Acceptance criteria

- [ ] +€40 under an expense category, `shared` on a 50% joint account → `{ kind: 'expense', amount: -20 }`.
- [ ] −€40 under the same category, same override → `{ kind: 'expense', amount: 20 }` (unchanged).
- [ ] +€40 uncategorised with a `shared` override → `{ kind: 'income', amount: 20 }` (unchanged).
- [ ] A `shared` row under a `neutral` category → `{ kind: 'skip' }`.
- [ ] `computePeriodStats` over a −€100 shared expense and its +€100 shared refund on a 50% account gives expense 0 and income 0.
- [ ] `classify-for-stats.decision-table.spec.ts` gains the `shared` × expense-category × positive-amount row; the rest of the table passes.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: mark a refund as shared; the dashboard's expense for that period drops by the share and income does not move.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The other half of CR6-32 (top transactions and `nullified`) is [TICKET-STAT-54](./TICKET-STAT-54-top-transactions-skip-nullified.md).
- `'raw'` and `'cashflow'` modes don't enter this branch and are unaffected.
