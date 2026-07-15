# TICKET-INC-06 — Yearly income view

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-6 (new)

## User story

As a user, I want a yearly view — one bar per calendar year across my full history, each with its %-change vs. the previous year — so I can see my income trend at a glance without mentally averaging monthly buckets.

## Description

A bar chart with one bar per calendar year across the user's full history, each annotated with its %-change vs. the previous year — an at-a-glance yearly trend, independent of the topbar's selected date range.

## Current situation (as-is)

- No calendar-year rollup exists anywhere in `core/stats/`. The closest precedent for "always full-history, range-independent" is [net-worth-history-chart.component.ts](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) (`computeFullHistoryRange` + `RangeStore.groupBy` for bucketing only) — this ticket follows the same "ignore the topbar range" shape but with a fixed `year` granularity rather than the topbar's `groupBy`.

## Desired result (to-be)

- New pure helper `computeYearlyIncomeSummary(transactions, categoriesById, selectedCategoryIds, from, to)` in `core/stats/yearly-income-summary.ts`: groups selected-category income by calendar year (`bookingDate.slice(0, 4)`) across `[from, to]` (always `computeFullHistoryRange`'s span, not the topbar range), excludes linked transfers, and returns `{ year: string; total: number; pctVsPriorYear: number | null }[]` sorted ascending — `pctVsPriorYear` is `null` for the first year in the series (no prior year to compare) or when the prior year's total is zero.
- Uses the **raw**, unsmoothed totals — a full calendar year already contains its own lump-sum bonus in full, so FR-INC-4's smoothing (a within-year redistribution) has no effect at yearly granularity and is correctly skipped here.
- `IncomeOverviewComponent` renders this as a bar chart (`NgxEchartsDirective`), one bar per year, with the %-change shown as a label/tooltip on each bar.

## Acceptance criteria

- [ ] One entry per calendar year touched by `computeFullHistoryRange()`'s span, including years with zero selected-category income (rendered as a zero bar, not skipped) — matches the existing gap-filled-bucket convention used elsewhere in `core/stats/`.
- [ ] `pctVsPriorYear` is `null` (not `±∞%`) for the first year or a zero-total prior year; unit test covers both.
- [ ] Excludes linked transfers, matching the app-wide convention.
- [ ] Only counts `selectedIncomeCategoryIds` (FR-INC-3).
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser on 2+ years of seeded data: one bar per year, each with a visible %-change vs. the year before.

## Notes

- Independent of FR-INC-02/04/05's monthly series — its own aggregator over raw transactions, not a re-bucketing of the monthly one. Can be built in parallel with FR-INC-02.
