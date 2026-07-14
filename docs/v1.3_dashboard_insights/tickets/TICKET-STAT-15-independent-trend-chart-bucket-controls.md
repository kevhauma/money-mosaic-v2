# TICKET-STAT-15 — Independent bucket controls per trend graph

- **Area:** Statistics & Dashboard
- **Type:** Refactor
- **Traceability:** extends FR-STAT-4 / FR-STAT-7

## User story

As a user, I want to pick the bucket size (day/week/month/quarter) separately for each trend graph, so that the control I use for the Dashboard trend chart doesn't sit inside a global topbar row that visually implies it changes every panel on the page.

## Description

The day/week/month/quarter granularity buttons live in the app-wide topbar switcher next to the date-range picker, but only two charts anywhere in the app actually read that value. This ticket moves the granularity control out of the global topbar and gives each trend graph its own independent bucket picker.

## Current situation (as-is)

- The global topbar switcher ([range-grouping-switcher.component.html](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html), rendered at [app.html:13-18](../../../src/app/app.html)) shows one preset dropdown, one custom date-range input, and one `day/week/month/quarter` button group bound to a single global `RangeStore.groupBy` ([range-state.store.ts](../../../src/app/core/stats/range-state.store.ts)).
- `RangeStore.groupBy()` is consumed by exactly two chart computations: `computeTrendBuckets` (feeding `StatsStore.trendBuckets()` at [stats.store.ts:114-121](../../../src/app/feature-dashboard/stats.store.ts), rendered by [trend-chart-panel.component.ts](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) on the Dashboard) and `computeAccountBalanceTrends` (via `granularity` at [net-worth-history-chart.component.ts:84](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) on the Accounts page).
- No other Dashboard panel reads `groupBy` — `category-breakdown-panel`, `weekday-weekend-split-panel`, `top-transactions-panel`, `category-comparison-panel`, and the primary stats cards only read `rangeStore.from()`/`to()`. Because the granularity buttons sit in the same row as the date picker, changing them visually implies every panel should react, but on the Dashboard only the trend chart moves.
- `groupBy` is also mirrored to the URL as `?groupBy=` for every route ([app.ts:70-140](../../../src/app/app.ts), `STAT_QUERY_PARAMS.groupBy` in [search-params.ts](../../../src/app/shared/utils/search-params.ts)), even though only two charts on two different routes ever read it back.
- `pickGranularityForSpan(from, to)` ([granularity-for-span.ts](../../../src/app/core/stats/granularity-for-span.ts)) already exists and is used to auto-pick a sensible default granularity from a date span (e.g. on `setCustomRange`), so an auto-default per chart is not new logic to invent.

## Desired result (to-be)

- `mm-range-grouping-switcher` keeps only the preset dropdown and custom date-range input; the day/week/month/quarter button group is removed from the global topbar, and `RangeGroupingSwitcherValue`/`RangeStore` no longer expose a single global `groupBy`.
- `app-trend-chart-panel` (Dashboard) owns its own local granularity control and local signal; its chart bucket size responds only to that control.
- `app-net-worth-history-chart` (Accounts) owns its own separate local granularity control and local signal; its chart bucket size responds only to that control, independent of the trend-chart-panel's.
- Each local control defaults to `pickGranularityForSpan(from, to)` against the shared (still-global) date range, so both charts stay legible without requiring a manual pick, matching the current implicit behaviour.
- Changing one chart's local bucket control never affects the other chart or any other Dashboard/Accounts panel.
- The global `?groupBy=` query param is dropped from `STAT_QUERY_PARAMS`/`app.ts`'s mirroring effect (deep-linking a single global granularity no longer makes sense once it's per-chart, local UI state).

## Acceptance criteria

- [x] Day/week/month/quarter buttons removed from `mm-range-grouping-switcher`; only the preset dropdown and custom date-range input remain in the global topbar.
- [x] `app-trend-chart-panel` renders its own granularity control; its chart bucket size responds only to that local control.
- [x] `app-net-worth-history-chart` renders its own granularity control, independent of the trend-chart-panel's; its chart bucket size responds only to that local control.
- [x] Each local control defaults to `pickGranularityForSpan(from, to)` for the currently selected date range on first render, and updates immediately (no other panel re-renders differently) when changed.
- [x] `RangeStore`'s `groupBy` field/`setGroupBy` method removed (or narrowed) now that granularity is chart-local state, not global range state; `RangeState`/`RangeGroupingSwitcherValue` types updated accordingly.
- [x] `STAT_QUERY_PARAMS.groupBy` and its read/write in `app.ts`'s constructor and URL-mirroring effect are removed to match — no dangling references to a global `groupBy` query param.
- [x] Unit tests cover: trend-chart-panel's local control changes only its own buckets; net-worth-history-chart's local control changes only its own series; each control's default value derives from `pickGranularityForSpan`; `RangeStore`/`range-grouping-switcher` specs updated to drop `groupBy` assertions.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: changing the Dashboard trend chart's bucket size doesn't move any other Dashboard panel; changing the Accounts net-worth chart's bucket size doesn't move the Dashboard trend chart; the topbar no longer shows a granularity control.

## Notes

- Scope is limited to the two existing `groupBy` consumers (trend-chart-panel, net-worth-history-chart) — no new charts are added by this ticket.
- **Scope correction found during implementation:** a third consumer, `app-account-balance-chart` (per-account detail page at `feature-accounts/components/accounts-detail`), also read `rangeStore.groupBy()` — the as-is section above missed it. Since removing `RangeStore.groupBy` entirely would have broken this chart, it was given the same local-control treatment as the other two.
- The bucket button-group markup in `range-grouping-switcher.component.html` can be extracted into a small shared presentational component so both charts don't duplicate the `@for` loop, but that's an implementation detail, not a hard requirement.
- Dropping `?groupBy=` means a stale bookmarked/shared link containing it simply has the param ignored going forward — acceptable since it was never meaningfully shareable state to begin with (it silently applied to whichever of the two charts happened to be in view).
