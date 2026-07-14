# TICKET-STAT-18 — Category composition over time (stacked)

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** extends FR-STAT-3/FR-STAT-4 (adds FR-STAT-15)

## User story

As a user reviewing my dashboard, I want to see how my top categories' spending and income have moved bucket-to-bucket over the selected range, not just their totals for the whole range, so I can spot a category creeping up or down over time instead of only ever seeing a single-range snapshot.

## Description

`category-breakdown-panel` (TICKET-STAT-13) shows expense-by-category and income-by-source as two donuts, each a snapshot of the *whole* selected range — it has no time axis. This ticket adds a new, separate dashboard panel with two stacked-area charts, side by side (Expense composition, Income composition), each bucketed at its own granularity (day/week/month/quarter, same local-control pattern as every other trend chart per TICKET-STAT-15) — one band per top category, stacked so the top edge of each chart is that bucket's total expense/income. This reuses the same stacked-area technique `net-worth-history-chart` already established for per-account bands, applied to per-category bands instead.

## Current situation (as-is)

- No bucketed-by-time, per-category view exists today. [category-breakdown-panel](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) only ever computes one range's totals via `computeCategoryBreakdown()`; [trend-chart-panel](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) buckets by time but only at the income/expense level, never per-category.
- [computeCategoryBreakdown()](../../../src/app/core/stats/category-breakdown.ts) already does all the correct netting/exclusion work (transfers, nullified transactions, savings movements, joint-account ownership share, signed category-kind netting per TICKET-STAT-11) for a single `[from, to]` range and `categoriesById`/`ownSavingsIbans`/`accountsById` — it must be reused per bucket, never reimplemented, exactly like [category-period-comparison.ts:36-41](../../../src/app/core/stats/category-period-comparison.ts) already does ("`computeCategoryBreakdown()` is reused once per window period — never reimplemented").
- [category-period-comparison.ts:7](../../../src/app/core/stats/category-period-comparison.ts) — `TOP_CATEGORY_COUNT = 4` is the existing precedent for capping a multi-category chart to a manageable top-N (selected there from the *current* period alone, remaining categories simply dropped, no "Other" catch-all bucket). Reuse the same top-N-by-total, no-"Other"-bucket convention here for consistency, rather than inventing a different truncation rule.
- [net-worth-history-chart.component.ts:26-56](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) (`buildNetWorthHistoryChartOption`) is the stacked-area precedent: one `{ type: 'line', stack: 'net-worth', areaStyle: {} }` series per band, sharing one `xAxis` of bucket keys.
- [date-buckets.ts](../../../src/app/core/stats/date-buckets.ts) — `bucketKeysInRange(from, to, granularity)` and `bucketDateBoundaries(bucketKey, granularity)` are the existing gap-filled bucketing helpers `computeTrendBuckets()` already uses; reuse both rather than re-deriving bucket boundaries.
- [savingsAccountIbans()](../../../src/app/core/transfers/transfer-matching.ts) is how `stats.store.ts` and other panels derive `ownSavingsIbans` from `AccountsStore.accounts()` — the new panel needs the same call, made locally (this panel is not range-scoped through `StatsStore.categoryBreakdown()`, since it needs one breakdown *per bucket*, not one for the whole range).

## Desired result (to-be)

- New pure aggregate `computeCategoryCompositionTrend(transactions, categoriesById, from, to, granularity, ownSavingsIbans, accountsById)` in `core/stats/category-composition-trend.ts`, exported via `core/stats`'s barrel:
  - Selects the top-N categories (reuse `TOP_CATEGORY_COUNT`-style constant, e.g. 5) separately for expense and income, ranked by each category's total over the **entire** `[from, to]` range (via one whole-range `computeCategoryBreakdown()` call) — not re-picked per bucket, so the same categories/colours stay stable across buckets even if their rank order shifts bucket-to-bucket.
  - Calls `computeCategoryBreakdown()` once per bucket (using `bucketKeysInRange`/`bucketDateBoundaries` for each bucket's own `[from, to]`), and for each bucket extracts just the selected top-N categories' totals (`0` for a bucket where that category has no activity) — categories outside the top-N are simply not plotted, no "Other" catch-all band (matching `category-period-comparison`'s convention).
  - Returns `{ bucketKeys: string[]; expenseSeries: CategorySeriesEntry[]; incomeSeries: CategorySeriesEntry[] }` where `CategorySeriesEntry = { categoryId: number | null; name: string; color: string; values: number[] }`.
- New `category-composition-panel` component (`feature-dashboard/components/category-composition-panel/`) added to the dashboard, structured like `trend-chart-panel`/`net-worth-history-chart`: injects `TransactionsStore`, `CategoriesStore`, `AccountsStore`, `RangeStore`; owns a local `granularity` signal defaulted via `pickGranularityForSpan` (TICKET-STAT-15 pattern, independent of every other chart's control); computes `ownSavingsIbans` locally via `savingsAccountIbans(accountsStore.accounts())`.
- Renders one card, one shared local granularity picker, and a `grid grid-cols-1 lg:grid-cols-2` row with two independent stacked-area charts (Expense composition, Income composition), each built the same way as `buildNetWorthHistoryChartOption` — one `{ type: 'line', stack, areaStyle: {} }` series per category band, coloured with that category's existing colour (same `category.color` source `category-breakdown-panel` already uses).
- Chart-click on a stacked segment navigates to `/transactions` filtered to that bucket's date range **and** that category (reusing `buildTransactionDrilldownParams` with both `from`/`to` and `categoryId`, same helper `category-breakdown-panel`'s row-level drilldown already uses).
- Placed as a new full-width row on the Dashboard, near the existing category-breakdown row (both are category-scoped panels) — exact placement documented in `dashboard-layout.md` as part of this ticket.
- Empty state: a bucket with no activity for a category renders as a zero-height segment (no special empty-state copy needed at the bucket level); the whole panel's empty state (no categorised transactions at all in range) follows the same "No data for this range." pattern `category-breakdown-panel` uses per column.

## Acceptance criteria

- [ ] `computeCategoryCompositionTrend()` exists in `core/stats/category-composition-trend.ts`, exported via `core/stats`'s barrel, and reuses `computeCategoryBreakdown()` internally (whole-range call for top-N selection + one call per bucket) rather than reimplementing any transfer/nullified/savings-movement/joint-ownership/signed-netting logic.
- [ ] Top-N category selection (expense and income independently) is stable across buckets — the same set of categories/colours is plotted in every bucket for a given render, even when a category has zero activity in some buckets.
- [ ] `category-composition-panel` renders two independent stacked-area charts side by side (`grid grid-cols-1 lg:grid-cols-2`, stacking to 1 column below `1024px` per the existing breakpoint convention), driven by one shared `mm-granularity-picker` (matching STAT-17's shared-picker decision for the same reason: both charts share one `bucketKeysInRange` source).
- [ ] Each stacked band uses the same category colour shown elsewhere on the dashboard (`category.color`, with the existing uncategorised grey fallback for the `categoryId === null` entry when it ranks in the top-N).
- [ ] Clicking a segment navigates to `/transactions` filtered to that bucket's date range and that category.
- [ ] The panel is added to `dashboard-overview.component.html` and to [dashboard-layout.md](../dashboard-layout.md)'s row table, in a documented position.
- [ ] Unit tests cover `computeCategoryCompositionTrend()`: top-N selection is by whole-range total (not per-bucket), a category outside the top-N never appears in any bucket's series, a bucket with no activity for a selected category yields `0` (not a missing entry — series arrays stay aligned to `bucketKeys` length), and the aggregate produces identical per-bucket totals to calling `computeCategoryBreakdown()` directly for that bucket's `[from, to]` (no drift between the two).
- [ ] Verified live in the browser (both charts render, stacking looks correct, drilldown works, responsive collapse works) — ask the user before doing this verification per this repo's `CLAUDE.md` browser-check rule.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Deliberately does **not** replace or modify `category-breakdown-panel`'s donuts — this is an additive new panel, chosen over replacing the donuts specifically so the existing single-range snapshot view and this new over-time view coexist without regressing STAT-13's acceptance criteria.
- Deliberately does **not** introduce an "Other" catch-all band for categories outside the top-N — matches `category-period-comparison`'s existing top-N convention rather than inventing a new truncation rule; if that turns out to read as misleading (top-N total looking smaller than the panel's own total), a follow-up ticket can add an "Other" band.
- Calling `computeCategoryBreakdown()` once per bucket (plus once for whole-range top-N selection) is the same repeated-aggregate-call pattern `category-period-comparison.ts` already uses for its window periods — accepted precedent, not a new performance concern to relitigate here.
- Independent of [TICKET-STAT-17](./TICKET-STAT-17-split-trend-chart-income-expense.md) (trend-chart split) — no shared files, can ship in either order.
