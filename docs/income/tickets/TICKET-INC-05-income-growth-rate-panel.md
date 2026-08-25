# TICKET-INC-05 — Income growth-rate panel

- **Area:** Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
- **Type:** Feature
- **Traceability:** adds FR-INC-5 (new)

## User story

As a user, I want a growth-rate panel showing period-over-period and year-over-year growth % for my selected income categories (smoothed per FR-INC-4 where applicable), so I can tell 'am I actually getting ahead' apart from 'this month was an outlier'.

## Description

A dedicated period-over-period and year-over-year growth-% panel scoped to the user's selected income categories (and their smoothing choice), distinct from v1.3's whole-dashboard income/expense/net delta badge.

## Current situation (as-is)

- No income-specific growth-rate computation exists. TICKET-STAT-07 **has landed**: [year-over-year.ts](../../../src/app/core/stats/year-over-year.ts) exports `shiftRangeByYears()` and `computeYearOverYearComparison()`, but scoped to `PeriodStats` (income+expense+net as one bundle), not to a selected subset of income categories.
- [period-window.ts](../../../src/app/core/stats/period-window.ts)'s `computeComparisonWindow()` (TICKET-STAT-04) is the existing "N preceding same-length periods" helper — check whether it can supply this ticket's prior-period window before writing a new one.

## Desired result (to-be)

- New pure helper `computeIncomeGrowth(transactions, categoriesById, selectedCategoryIds, granularity, from, to)` in `core/stats/income-growth.ts`:
  - Builds `smoothAnnualLumpSums(computeIncomeCategorySeries(...))` for `[from, to]` and for the immediately-preceding same-length window, and sums each window's selected-category totals → period-over-period `%`.
  - Reuses `shiftRangeByYears()` from `core/stats/year-over-year.ts` (leap-safe, already shipped — do not reimplement) to compute the same-range-one-year-back window's selected-category total → YoY `%`.
  - Returns `{ current: number; priorPeriod: { total: number; pct: number | null }; priorYear: { total: number; pct: number | null } | null }` — `pct` is `null` (not `±∞%`) when the prior total is zero, and `priorYear` is `null` entirely when no comparable prior-year data exists (same "hide, don't lie" rule as TICKET-STAT-07).
- `IncomeOverviewComponent` renders this as a small panel (reusing `mm-stat-card`'s `subLabel` for the deltas and its `tooltip` input for the figures behind them, consistent with TICKET-STAT-05/07/21's approach) near the trend chart.

## Acceptance criteria

**Implementation notes, 2026-08-01 — four deviations from the to-be above, recorded as built:**

1. **`computeIncomeGrowth` takes the page's already-built series, not raw transactions.** The
   planned `(transactions, categoriesById, selectedCategoryIds, granularity, from, to)` signature
   predates TICKET-INC-04, whose smoothing is now a *page-level* setting the helper would also have
   had to take. More importantly, it cannot work: smoothing spreads a lump sum across its **calendar
   year**, so a helper that rebuilt the series over only `[from, to]` — one month — would smooth
   across one bucket and do nothing, silently failing the first acceptance criterion. The signature
   is therefore `computeIncomeGrowth(trend, granularity, from, to)`, where `trend` is
   `IncomeStore.incomeTrend()` — the smoothed, selection-scoped series over the *whole* income
   range — and both comparison windows are read out of it rather than recomputed.
2. **`IncomeStore` gained `incomeTrend`**, and `INCOME_GRANULARITY` moved from
   `IncomeOverviewComponent` to `feature-income/income-granularity.ts`. Three panels now need that
   series (the trend chart, this one, and FR-INC-8's step-change detector); one shared `computed()`
   re-buckets the user's whole transaction history once instead of once per panel, and removes the
   chance of two panels passing subtly different arguments.
3. **The compared window is the last *complete* calendar month.** The to-be left the window
   unstated. It cannot be `incomeRange` itself — there is no "preceding all-of-history" to compare
   against — and it cannot include the newest bucket, because `incomeRange.to` is *today*, so that
   bucket is a part-month eleven months out of twelve. `lastCompleteBucketKey()` picks the newest
   fully-covered bucket, the same refusal `computeYearlyIncomeSummary` applies to a partial year.
   A month is a short window, which is exactly why both comparisons are rendered: a single good
   month moves the month-over-month figure and leaves the year-over-year one alone.
4. **`priorPeriod` can be `null`**, not only `priorYear`. The to-be typed it as always present, but
   the first month of a history has nothing before it, and a half-covered prior window understates
   by exactly as much as it is missing. `null` means "no comparable window"; `pct: null` inside a
   present window means "the window totalled zero". `computeComparisonWindow()` (TICKET-STAT-04)
   was checked as the to-be asks and does not fit — it is anchored to a `RangePreset` and to today,
   whereas this needs the plain preceding window of an arbitrary range.

- [x] Growth % uses the **smoothed** series (FR-INC-4) so a category's annual bonus month never reads as a growth spike or crash in the period-over-period figure. (`IncomeStore.incomeTrend` is `smoothAnnualLumpSums(computeIncomeCategorySeries(...))`, and the panel reads that signal. Panel spec pairs `spreads a smoothed bonus over its year instead of reading it as a raise (FR-INC-4)` — `0%` — with `reads the bonus as a spike when it is not marked for smoothing` — `+300%` — over identical transactions.)
- [x] `pct` is `null` rather than `Infinity`/`NaN` when the comparison total is zero; unit test covers a fresh category with no prior-period data. (Specs `is null (not ±∞%) for a category that did not exist in the prior period` and `never yields NaN or Infinity when both windows are zero` in [income-growth.spec.ts](../../../src/app/core/stats/income-growth.spec.ts); the panel renders `—` and its spec asserts the DOM contains neither `Infinity` nor `NaN`.)
- [x] Only counts `selectedIncomeCategoryIds` (FR-INC-3) — deselecting a category removes it from both the current and prior totals. (The selection is applied upstream by `computeIncomeCategorySeries`, so a deselected category is absent from every window at once — spec `counts only what the caller put in the series — a deselected category is simply absent`, and end-to-end in the panel spec's `drops a deselected category from both sides of the comparison (FR-INC-3)`.)
- [x] Unit tests cover: a flat category (0% growth), a category with an all-months increase (positive %), a category present now but absent in the prior window (no `±∞%`). (`is 0% for a category that pays exactly the same every month`, `is positive for a category that rises every month`, `is null (not ±∞%) for a category that did not exist in the prior period` — plus a decline, a multi-month window, and both year-over-year truncation cases.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`; the change adds one pure helper plus a panel built from the shipped `mm-paper`/`mm-stat-card`.)
- [ ] Verified live in the browser on 2+ years of seeded data: panel shows a period-over-period and a YoY % that update when a category is deselected. — **not done:** the user waived live browser checks for this v1.6 batch. Covered instead by the panel spec, which renders the real component over two years of transactions with the clock pinned to 2026-08-12 and asserts `+20%` / `+50%` on the two cards, then `—` on both once the category is excluded.

## Notes

- The original "if TICKET-STAT-07 hasn't landed, implement `shiftRangeByYears()` locally" fallback is dead — it shipped, so import it. A second copy would be flagged as duplication.
