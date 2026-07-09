# TICKET-INC-02 — Income-by-category trend chart

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-2 (new)
- **Source story:** user-stories.md §9 — *"As a user, I want an income-by-category trend chart on this page (one line/area per income category, bucketed at my chosen granularity), so I can see whether growth is coming from my salary or from elsewhere, rather than staring at one lumped-together income line."*

## Description

The page's first real content: a multi-series trend chart (one line/area per income category) so growth by source is visible instead of one lumped income line.

## Current situation (as-is)

- [trend-buckets.ts](../../../src/app/core/stats/trend-buckets.ts)'s `computeTrendBuckets()` only returns a single lumped `income`/`expense`/`net` total per bucket — no per-category split.
- [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)'s `computeCategoryBreakdown()` splits by category but only for one `[from, to]` snapshot, not a bucketed series over time.
- [net-worth-history-chart.component.ts](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) is the precedent for "always full-history data, `RangeStore` only drives bucket granularity + chart zoom window" (via `computeFullHistoryRange` + `computeZoomWindow`) — this ticket follows the same shape rather than the dashboard's range-scoped trend.

## Desired result (to-be)

- New pure helper `computeIncomeCategorySeries(transactions, categoriesById, selectedCategoryIds, from, to, granularity)` in `core/stats/income-category-series.ts`: one pass, gap-filled buckets (reusing `bucketKeysInRange`/`bucketKeyForDate` from [date-buckets.ts](../../../src/app/core/stats/date-buckets.ts)), returns `{ bucketKey, bucketStart, bucketEnd, totalsByCategoryId: Map<number, number> }[]`. Only sums transactions whose `categoryId` is in `selectedCategoryIds` (FR-INC-3) and excludes linked transfers, exactly like `trend-buckets.ts`.
- `IncomeOverviewComponent` computes `range = computeFullHistoryRange(accounts, transactions, todayIso())`, `granularity = rangeStore.groupBy()`, and renders an `NgxEchartsDirective` stacked-area/multi-line chart (one series per selected category, coloured by `category.color`), with `dataZoom` driven by `computeZoomWindow` against `rangeStore.from()/to()` — same pattern as `net-worth-history-chart.component.ts`.
- Legend click toggles a category's line (native echarts behaviour, no extra code).

## Acceptance criteria

- [ ] `computeIncomeCategorySeries()` returns one bucket per `bucketKeysInRange(from, to, granularity)` entry (gap-filled, zero for buckets with no matching income); unit tests cover an empty range, a range with two overlapping income categories, and a category excluded via `selectedCategoryIds`.
- [ ] Linked transfers (`transferId != null`) are excluded, matching `trend-buckets.ts`'s existing exclusion.
- [ ] Chart renders one line/area per selected income category, coloured via `category.color`; deselecting a category (FR-INC-3) removes its line without recomputing the others' totals.
- [ ] Uses `computeFullHistoryRange`/`computeZoomWindow` (not the dashboard's range-scoped `computeTrendBuckets`), so scrolling/zooming never drops data outside the topbar's currently selected range.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: chart shows separate lines for Salary and Other Income on seeded data; toggling a category off in the FR-INC-3 selector removes its line.

## Notes

- Ships the **raw**, unsmoothed series. FR-INC-04's annual lump-sum smoothing wraps this same helper's output — build this one first so there's a real series to smooth.
