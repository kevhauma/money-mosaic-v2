# TICKET-INC-06 — Yearly income view

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-6 (new)

## User story

As a user, I want a yearly view — one bar per calendar year across my full history, each with its %-change vs. the previous year — so I can see my income trend at a glance without mentally averaging monthly buckets.

## Description

A bar chart with one bar per calendar year across the user's full history, each annotated with its %-change vs. the previous year — an at-a-glance yearly trend, independent of the topbar's selected date range.

## Current situation (as-is)

- No calendar-year rollup exists anywhere in `core/stats/`. The precedent for "always full-history, range-independent" is [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts) (`computeFullHistoryRange` for the data span, the topbar range only feeding `computeZoomWindow`) — this ticket follows the same "ignore the topbar range" shape but pins granularity to `'year'` instead of exposing a picker. Note `RangeStore` has no `groupBy`: granularity has been chart-local since TICKET-STAT-15.
- `'year'` is already a member of the shared `Granularity` union in [date-buckets.ts](../../../src/app/shared/utils/date-buckets.ts), so `bucketKeysInRange(from, to, 'year')` gives the gap-filled year list for free.

## Desired result (to-be)

- New pure helper `computeYearlyIncomeSummary(transactions, categoriesById, selectedCategoryIds, from, to, ownSavingsIbans, accountsById)` in `core/stats/yearly-income-summary.ts`: groups selected-category income by calendar year across `[from, to]` (always `computeFullHistoryRange`'s span, not the topbar range) using `bucketKeysInRange(from, to, 'year')` for gap-filling, and returns `{ year: string; total: number; pctVsPriorYear: number | null }[]` sorted ascending — `pctVsPriorYear` is `null` for the first year in the series (no prior year to compare) or when the prior year's total is zero.
- Per-transaction inclusion goes through `classifyForStats()` (or `computeCategoryBreakdown()` per year), **not** a local `transferId != null` check — that's no longer how exclusion works; nullified rows, zero amounts, savings movements, `neutral` categories, and joint-leg attribution all ride along with it.
- Uses the **raw**, unsmoothed totals — a full calendar year already contains its own lump-sum bonus in full, so FR-INC-4's smoothing (a within-year redistribution) has no effect at yearly granularity and is correctly skipped here.
- `IncomeOverviewComponent` renders this as a bar chart (`NgxEchartsDirective`), one bar per year, with the %-change shown as a label/tooltip on each bar — themed via `@/shared/echarts`'s `resolveChartCategoricalColors`/`resolveChartAnimation`/`formatAxisTooltip` like every other chart since the v1.9 redesign.

## Acceptance criteria

- [ ] One entry per calendar year touched by `computeFullHistoryRange()`'s span, including years with zero selected-category income (rendered as a zero bar, not skipped) — matches the existing gap-filled-bucket convention used elsewhere in `core/stats/`.
- [ ] `pctVsPriorYear` is `null` (not `±∞%`) for the first year or a zero-total prior year; unit test covers both.
- [ ] Exclusions run through `classifyForStats()` — a linked transfer leg, a `nullified` row, and a savings movement are each ignored without any local re-check; unit test.
- [ ] Only counts `selectedIncomeCategoryIds` (FR-INC-3).
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser on 2+ years of seeded data: one bar per year, each with a visible %-change vs. the year before.

## Notes

- Independent of FR-INC-02/04/05's monthly series — its own aggregator over raw transactions, not a re-bucketing of the monthly one. Can be built in parallel with FR-INC-02.
