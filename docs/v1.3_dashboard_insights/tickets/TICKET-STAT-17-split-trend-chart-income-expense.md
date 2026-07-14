# TICKET-STAT-17 — Split trend chart into independent income/expense charts

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** extends FR-STAT-4 (adds FR-STAT-14)

## User story

As a user reviewing my dashboard trend, I want income and expense shown as two separate charts side by side instead of mirrored bars on one shared axis, so each series reads clearly on its own scale instead of visually cancelling against the other.

## Description

`trend-chart-panel` currently draws income and expense as two bar series on one shared chart, with expense negated so its bars point down from a common zero line. This ticket splits that into two independent charts — Income and Expense — rendered side by side within the same panel, each with its own zero-based y-axis and positive-valued bars, mirroring the two-independent-charts-in-one-panel pattern `category-breakdown-panel` already established for its expense/income donut columns (TICKET-STAT-13).

## Current situation (as-is)

- [trend-chart-panel.component.ts:43-60](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) — a single `chartOption` computed builds one echarts option with two bar series sharing one `xAxis` and declaring two `yAxis` entries (`Cash flow`, `Net worth`, lines 51-54); only the first (`Cash flow`) is ever referenced by a series — the second `yAxis` entry is dead configuration, no series sets `yAxisIndex: 1`.
- Same file, line 57 — `Expense` series data is `buckets.map((bucket) => -bucket.expense)`, negating expense so it renders as downward bars sharing the `Income` series' zero line, rather than each series having its own upward-only axis.
- [trend-chart-panel.component.html:1-14](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.html) — one card, one `h2` title ("Trend"), one shared `mm-granularity-picker`, one `<div echarts>` bound to the single `chartOption()`.
- `computeTrendBuckets()` ([trend-buckets.ts](../../../src/app/core/stats/trend-buckets.ts)) already returns `{ bucketKey, income, expense, net }` per bucket — no aggregate change is needed, this is purely a component/template restructuring, matching how TICKET-STAT-13 split `category-breakdown-panel` without touching `computeCategoryBreakdown()`.
- Side-by-side-columns-in-one-card precedent: [category-breakdown-panel.component.ts:161-179](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) (`buildColumn`) builds one self-contained `chartOption` per column from the same source data — reuse that shape (a `buildChartOption(values)` helper called twice) rather than inventing a new split pattern.

## Desired result (to-be)

- `trend-chart-panel` renders one card (unchanged title row: "Trend" + the existing shared `mm-granularity-picker` — one control still drives both charts, since they share the same `trendBuckets` source) containing a `grid grid-cols-1 lg:grid-cols-2` row with two independent chart columns: Income, Expense.
- Each column gets its own `EChartsCoreOption` built by a shared `buildChartOption(label, values)` helper: one bar series, one `yAxis` starting at 0, values **not** negated (`bucket.expense` as-is, not `-bucket.expense`) since each chart now has its own baseline.
- The dead second `yAxis` (`Net worth`) is removed — it was never wired to a series.
- Chart-click drilldown behaviour is unchanged per column: clicking a bucket in either chart navigates to `/transactions` filtered to that bucket's date range (existing `onChartClick`/`bucketDateBoundaries` logic, now keyed by which column was clicked rather than a single chart).
- Column headers ("Income" / "Expense") are visible above each mini-chart so the split reads clearly without relying on axis colour alone.
- Responsive behaviour follows the existing breakpoint convention (`category-breakdown-panel`'s columns collapse to 1 column, stacked, below `1024px` — same rule applies here).

## Acceptance criteria

- [ ] `trend-chart-panel` shows two independent bar charts (Income, Expense) side by side on desktop (`≥1024px`), stacked on mobile/tablet, each with its own zero-based y-axis.
- [ ] Expense values render as positive bars (no negation) since each chart has its own baseline; Income is unaffected.
- [ ] The dead, unused second `yAxis` ("Net worth") is removed from the chart option.
- [ ] The existing single shared `mm-granularity-picker` still drives both charts' bucketing (no duplicate/second picker).
- [ ] Clicking a bar in either chart still navigates to `/transactions` with the correct date-range query params for that bucket (existing `onChartClick` behaviour, verified for both columns).
- [ ] No change to `computeTrendBuckets()` or any other `core/stats` aggregate — this is a component/template-only restructuring.
- [ ] Unit tests cover: `buildChartOption` (or equivalent) produces a single positive-valued series per column, the dead `yAxis` entry is gone, and `onChartClick` resolves the correct bucket/date-range for a click in each column.
- [ ] [dashboard-layout.md](../dashboard-layout.md) row 6 updated to note the trend chart is now two side-by-side mini-charts within its existing grid cell (no row/column-count change at the dashboard-grid level — the split is internal to the panel).
- [ ] Verified live in the browser (both charts render, drilldown works, responsive collapse works) — ask the user before doing this verification per this repo's `CLAUDE.md` browser-check rule.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Deliberately keeps one shared granularity control rather than giving each column its own — the two charts share one `trendBuckets` computation, so a second picker would either be redundant or require re-fetching the same data twice for no benefit.
- Net cash flow (`bucket.net`) is not displayed by either new chart — it wasn't rendered by the old combined chart either (only `income`/`expense` were ever plotted despite `net` being computed). Out of scope here; if a future ticket wants a net-flow view, it's a separate addition, not a gap this ticket introduces.
- Independent of [TICKET-STAT-18](./TICKET-STAT-18-category-composition-trend.md) (new category-composition panel) — no shared files beyond both living in `feature-dashboard/components/`, can ship in either order.
