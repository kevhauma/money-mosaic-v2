# TICKET-INC-02 — Income-by-category trend chart

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-2 (new)

## User story

As a user, I want an income-by-category trend chart on this page (one line/area per income category, bucketed at my chosen granularity), so I can see whether growth is coming from my salary or from elsewhere, rather than staring at one lumped-together income line.

## Description

The page's first real content: a multi-series trend chart (one line/area per income category) so growth by source is visible instead of one lumped income line.

## Current situation (as-is)

- `trend-buckets.ts`/`computeTrendBuckets()` **no longer exist** — the dashboard's trend chart was split into per-category income/expense series by TICKET-STAT-17. Its replacement, [category-composition-trend.ts](../../../src/app/core/stats/category-composition-trend.ts)'s `computeCategoryCompositionTrend()`, already returns `{ bucketKeys, incomeSeries, expenseSeries }` with one `CategorySeriesEntry { categoryId, name, color, values[] }` per category — but capped at the **top 5** categories per kind (selected once from a whole-range breakdown, no "Other" catch-all) and scoped to the topbar's `[from, to]`. That cap and range-scoping are exactly what this ticket needs to differ on.
- [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)'s `computeCategoryBreakdown()` splits by category but only for one `[from, to]` snapshot; `computeCategoryCompositionTrend()` calls it once per bucket rather than reimplementing the per-transaction rules.
- Transfer exclusion is **not** a raw `transferId != null` check anymore: [classify-for-stats.ts](../../../src/app/core/stats/classify-for-stats.ts)'s `classifyForStats()` is the single classification pipeline (range → `nullified` → zero-amount → savings movement → linked transfer, plus `neutral`-kind, joint-leg attribution and TICKET-STAT-11's signed netting), and every income/expense aggregate goes through it.
- [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts) — not the chart components themselves — is the precedent for "always full-history data, the topbar range only drives the chart zoom window" (`computeFullHistoryRange` + `computeZoomWindow`), shared by `AccountBalanceChartComponent`/`NetWorthHistoryChartComponent`.
- Granularity is **chart-local state, not on `RangeStore`** (TICKET-STAT-15): `RangeStore` holds only `preset`/`from`/`to`, and each chart seeds its own `signal<Granularity>(pickGranularityForSpan(from, to))` fed by an `mm-granularity-picker`.
- `bucketKeysInRange`/`bucketDateBoundaries` live in [`@/shared/utils`](../../../src/app/shared/utils/date-buckets.ts), not in `core/stats/`.
- Chart theming goes through [`@/shared/echarts`](../../../src/app/shared/echarts/index.ts) (`resolveChartCategoricalColors`, `resolveChartAnimation`, `formatAxisTooltip`) since the v1.9 redesign — see [trend-chart-panel.component.ts](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts).

## Desired result (to-be)

- New pure helper `computeIncomeCategorySeries(transactions, categoriesById, selectedCategoryIds, from, to, granularity, ownSavingsIbans, accountsById)` in `core/stats/income-category-series.ts`, gap-filled via `bucketKeysInRange`/`bucketDateBoundaries` from `@/shared/utils`, returning `{ bucketKeys: string[]; series: CategorySeriesEntry[] }` — reusing `category-composition-trend.ts`'s existing `CategorySeriesEntry` shape so FR-INC-04/05/08's consumers and the chart builders line up with the dashboard's.
  - It differs from `computeCategoryCompositionTrend()` on exactly three axes, which is why it's its own helper rather than a call into that one: **no top-5 cap** (every selected income category gets a series), **selection-parameterised** (`selectedCategoryIds`, FR-INC-3), and **full-history-scoped** rather than topbar-range-scoped.
  - It must **not** re-derive per-transaction rules: route every transaction through `classifyForStats()` (or reuse `computeCategoryBreakdown()` per bucket the way `computeCategoryCompositionTrend()` does) so transfer/nullified/savings/joint/signed-netting behaviour can't drift from the rest of the app.
- `IncomeOverviewComponent` computes `range = computeFullHistoryRange(accounts, transactions, todayIso())`, owns a chart-local `granularity = signal(pickGranularityForSpan(rangeStore.from(), rangeStore.to()))` with an `mm-granularity-picker`, and renders an `NgxEchartsDirective` stacked-area/multi-line chart (one series per selected category, coloured by `category.color` via `resolveChartCategoricalColors`), with `dataZoom` driven by `computeZoomWindow(bucketKeys, rangeStore.from(), rangeStore.to(), granularity())` — same chain as `balanceTrendSignals()`.
- Legend click toggles a category's line (native echarts behaviour, no extra code).

## Acceptance criteria

- [ ] `computeIncomeCategorySeries()` returns one value per `bucketKeysInRange(from, to, granularity)` entry for every series (gap-filled, zero for buckets with no matching income); unit tests cover an empty range, a range with two overlapping income categories, and a category excluded via `selectedCategoryIds`.
- [ ] Every income/expense decision goes through `classifyForStats()` (directly or via `computeCategoryBreakdown()`) — no local `transferId`/`nullified`/savings re-checks; unit test covers a linked transfer leg and a `nullified` transaction being ignored.
- [ ] No top-N cap: a user with 7 selected income categories gets 7 series (the one behavioural difference from the dashboard's `computeCategoryCompositionTrend()`).
- [ ] Chart renders one line/area per selected income category, coloured via `category.color`; deselecting a category (FR-INC-3) removes its line without recomputing the others' totals.
- [ ] Uses `computeFullHistoryRange`/`computeZoomWindow` with a chart-local granularity signal (TICKET-STAT-15's per-chart control — **not** a `RangeStore.groupBy`, which doesn't exist), so scrolling/zooming never drops data outside the topbar's currently selected range.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: chart shows separate lines for Salary and Other Income on seeded data; toggling a category off in the FR-INC-3 selector removes its line.

## Notes

- Ships the **raw**, unsmoothed series. FR-INC-04's annual lump-sum smoothing wraps this same helper's output — build this one first so there's a real series to smooth.
- If, while building, the only differences from `computeCategoryCompositionTrend()` turn out to be parameters rather than logic, prefer widening that helper (an optional `topN`/`categoryIds` argument) over shipping a near-duplicate — fallow flags duplication, and the two would have to be kept in sync forever otherwise.
