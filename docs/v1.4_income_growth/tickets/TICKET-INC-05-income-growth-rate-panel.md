# TICKET-INC-05 — Income growth-rate panel

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-5 (new)
- **Source story:** user-stories.md §9 — *"As a user, I want a growth-rate panel showing period-over-period and year-over-year growth % for my selected income categories (smoothed per FR-INC-4 where applicable), so I can tell 'am I actually getting ahead' apart from 'this month was an outlier'."*

## Description

A dedicated period-over-period and year-over-year growth-% panel scoped to the user's selected income categories (and their smoothing choice), distinct from v1.3's whole-dashboard income/expense/net delta badge.

## Current situation (as-is)

- No income-specific growth-rate computation exists. v1.3's [TICKET-STAT-07](../../v1.3_dashboard_insights/tickets/TICKET-STAT-07-year-over-year-comparison.md) (if landed) adds `shiftRangeByYears()`/`computeYearOverYearComparison()` in `core/stats/year-over-year.ts`, but scoped to `PeriodStats` (income+expense+net as one bundle), not to a selected subset of income categories.

## Desired result (to-be)

- New pure helper `computeIncomeGrowth(transactions, categoriesById, selectedCategoryIds, granularity, from, to)` in `core/stats/income-growth.ts`:
  - Builds `smoothAnnualLumpSums(computeIncomeCategorySeries(...))` for `[from, to]` and for the immediately-preceding same-length window, and sums each window's selected-category totals → period-over-period `%`.
  - Reuses `shiftRangeByYears()` (from `core/stats/year-over-year.ts` if TICKET-STAT-07 has landed; otherwise adds the minimal leap-safe year-shift locally, with a note to dedupe later) to compute the same-range-one-year-back window's selected-category total → YoY `%`.
  - Returns `{ current: number; priorPeriod: { total: number; pct: number | null }; priorYear: { total: number; pct: number | null } | null }` — `pct` is `null` (not `±∞%`) when the prior total is zero, and `priorYear` is `null` entirely when no comparable prior-year data exists (same "hide, don't lie" rule as TICKET-STAT-07).
- `IncomeOverviewComponent` renders this as a small panel (reusing `mm-stat-card` with `subLabel` for the deltas, consistent with TICKET-STAT-05/07's approach) near the trend chart.

## Acceptance criteria

- [ ] Growth % uses the **smoothed** series (FR-INC-4) so a category's annual bonus month never reads as a growth spike or crash in the period-over-period figure.
- [ ] `pct` is `null` rather than `Infinity`/`NaN` when the comparison total is zero; unit test covers a fresh category with no prior-period data.
- [ ] Only counts `selectedIncomeCategoryIds` (FR-INC-3) — deselecting a category removes it from both the current and prior totals.
- [ ] Unit tests cover: a flat category (0% growth), a category with an all-months increase (positive %), a category present now but absent in the prior window (no `±∞%`).
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser on 2+ years of seeded data: panel shows a period-over-period and a YoY % that update when a category is deselected.

## Notes

- If TICKET-STAT-07 hasn't landed yet when this ticket is built, implement `shiftRangeByYears()` locally in `income-growth.ts` and leave a note to dedupe into `core/stats/year-over-year.ts` once that ticket ships — don't block this ticket on ordering.
