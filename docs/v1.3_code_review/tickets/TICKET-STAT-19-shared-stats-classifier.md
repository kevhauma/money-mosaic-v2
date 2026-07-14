# TICKET-STAT-19 — Extract the shared per-transaction stats classifier

- **Area:** Statistics (core/stats)
- **Type:** Refactor
- **Traceability:** CR3-2.1; consolidates the semantics of TICKET-STAT-03, TICKET-STAT-11, TICKET-TXN-03, TICKET-TXN-04, TICKET-CAT-02, TICKET-TRF-02
- **Fallow evidence (2026-07-14):** `computeCategoryBreakdown` (cyclomatic 29 / cognitive 45) and `computePeriodStats` (27/45) are the two worst complexity findings in the app and both **accelerating** churn hotspots; `dup:a29a2c00` and `dup:edea22f4` fingerprint the shared code directly

## User story

As a developer, I want the per-transaction classification pipeline (exclusions + joint/`attributionOverride` routing + bucketing) defined once and consumed by every stats aggregation, so a semantic change (like TICKET-STAT-18's ordering fix) lands in one place and the three copies can never drift again.

## Description

`computePeriodStats`, `computeCategoryBreakdown`, and `computeWeekdayWeekendSplit` each re-implement the same pipeline: range/transfer/nullified/savings exclusions, then `resolveContribution` routing for joint accounts and attribution overrides with its two special cases (`personal`-mode netting by category kind; the untagged positive-amount-on-expense-category refund rule), then income/expense bucketing. The copies have already drifted once (check ordering — TICKET-STAT-18). `computeSpendingRate` shows the right shape by delegating to `computePeriodStats`.

## Current situation (as-is)

- [period-stats.ts:76-127](../../../src/app/core/stats/period-stats.ts) — full pipeline, copy 1.
- [category-breakdown.ts:100-152](../../../src/app/core/stats/category-breakdown.ts) — full pipeline, copy 2 (plus per-category bucketing).
- [weekday-weekend-split.ts:72+](../../../src/app/core/stats/weekday-weekend-split.ts) — expense-only pipeline, copy 3; its docblock admits it "mirrors `computePeriodStats` exactly … so this can't drift" — a manual mirror is the drift mechanism.
- [spending-rate.ts:31](../../../src/app/core/stats/spending-rate.ts) — already delegates; not affected.

## Desired result (to-be)

- One shared classifier in `core/stats` — e.g. `classifyForStats(transaction, ctx): { kind: 'skip' } | { kind: 'savings' | 'income' | 'expense'; amount: number; categoryId: number | null }` — owning the exclusion order (per TICKET-STAT-18) and the joint/override routing with both special cases.
- `computePeriodStats`, `computeCategoryBreakdown`, and `computeWeekdayWeekendSplit` reduce to loops over the classifier's results (breakdown keeps its own per-category accumulation and share/clamp finalisation; weekday/weekend ignores non-expense results).
- The three docblocks shrink to their aggregation-specific parts and point at the classifier for the shared semantics.

## Acceptance criteria

- [ ] Exactly one implementation of the exclusion order and the joint/override special cases exists in `core/stats` (grep for `attributionOverride?.mode === 'personal'` outside the classifier returns no stats-aggregation hits).
- [ ] All existing specs for `period-stats`, `category-breakdown`, `weekday-weekend-split`, and `spending-rate` pass **unchanged** — this is a pure refactor of shipped semantics (with TICKET-STAT-18 already merged).
- [ ] The classifier has its own spec covering: transfer leg, nullified, savings movement (incl. nullified-savings), neutral category, joint `mineIn`/`jointSpend`/`coOwnerIn`, `personal`/`shared`/`notMine` overrides, and the untagged expense-category refund rule.
- [ ] Fallow re-run: `computeCategoryBreakdown` and `computePeriodStats` drop out of the critical complexity findings; `dup:a29a2c00` and `dup:edea22f4` no longer appear.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Sequenced after TICKET-STAT-18 (the classifier must codify the *corrected* order).
- Do not fold `computeAccountBalanceTrends`/net-worth weighting in — those use `resolveContribution` for stake deltas, a different contract (weights hit balances even when income/expense excludes them). Scope is the three income/expense/savings aggregations only.
