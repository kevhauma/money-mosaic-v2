# TICKET-STAT-02 — Per-account net-worth-over-time chart

- **Area:** Statistics & Dashboard
- **Traceability:** extends FR-STAT-4
- **Source story:** user-stories.md §6 — *"As a saver, I want a per-account net-worth-over-time chart alongside the combined one, so I can see how each account individually trends, not just my total."*

## Description

Show how each account's net worth trends over time, not just the combined total — either as multiple lines on the trend chart or a per-account breakdown the user can toggle.

## Current situation (as-is)

- [TrendChartPanelComponent](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) plots a **single combined** net-worth line: `series` builds one "Net worth" line from `statsStore.netWorthTrend()` (plus Income/Expense bars).
- There is no per-account net-worth series; the account dimension is aggregated away before charting.

## Desired result (to-be)

- The trend view can show each account's net-worth-over-time as its own line (using the account's colour), alongside — or toggled against — the combined total.
- Bucketing respects the selected grouping granularity (day/week/month/quarter), same as the combined line (FR-STAT-4).

## Acceptance criteria

- [ ] The stats layer exposes a per-account net-worth-over-time series bucketed by the active granularity, reusing the existing bucketing (`date-buckets` / `netWorthTrend`) rather than a parallel implementation.
- [ ] Each account renders as its own line, coloured by the account's configured colour, with the account name in the legend.
- [ ] The combined net-worth line remains available (kept alongside, or via a combined/per-account toggle — pick one and make it clear in the UI).
- [ ] Per-account lines respect the selected date range and grouping granularity and update reactively on range/grouping change and on any transaction edit (FR-STAT-5).
- [ ] Archived accounts are handled sensibly (e.g. excluded or shown per existing dashboard convention) — decision recorded.
- [ ] Clicking/drilling from a point still navigates to the underlying transactions (FR-STAT-6); per-account drill-down carries the account filter in the query params.
- [ ] Legibility holds with many accounts (e.g. line selection via legend); the chart stays readable and performant.
- [ ] The `angular.json` bundle budget is not raised (Hard rules); echarts is already a dependency so no new heavy import is expected.
- [ ] Unit tests cover: per-account series bucketing for ≥2 accounts, colour/legend mapping, granularity/range reactivity, and combined line still present.

## Notes

- Net worth per account over time = opening balance + cumulative signed transactions up to each bucket boundary (transfers **included**, consistent with net-worth semantics).
- Watch chart clutter with many accounts; a toggle or legend-driven selection keeps it usable.
