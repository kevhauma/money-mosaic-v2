# TICKET-NG-11 — The dashboard waits for its settings stores, so no write starts from unloaded defaults

- **Area:** Dashboard (feature-dashboard) — hydration gating
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-14 (dashboard part), CR6-A2; extends TICKET-SRV-06's hydration boundary; protects the dashboard layout (TICKET-STAT-14), comparison exclusions (FR-STAT-8) and heatmap exclusions (FR-STAT-15)

## User story

As a user whose dashboard settings failed to load, I want the dashboard to show the load error instead of the defaults, so hiding one row doesn't overwrite my saved layout with "only this row hidden".

## Description

The dashboard's hydration boundary waits only for transactions and accounts. Its layout, category-comparison and app settings stores start on defaults and keep them if their load fails. The next toggle builds a whole new list from those defaults and sends it, replacing what the server had.

## Current situation (as-is)

- [dashboard-overview.component.ts:100](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts) — `hydration = hydrationOf(this.transactionsStore, this.accountsStore)`.
- [dashboard-layout-settings.store.ts:49-55](../../../src/app/feature-dashboard/dashboard-layout-settings.store.ts) — `toggleRowHidden` builds `hiddenRowIds` from `store.hiddenRowIds()` and sends the full list via `setHiddenRowIds`. With a failed load, hidden rows `[A, B]` on the server become `[X]` after hiding X.
- Same whole-list writes: `CategoryComparisonSettingsStore.setExcludedCategoryIds` ([category-comparison-settings.store.ts:35-38](../../../src/app/feature-dashboard/category-comparison-settings.store.ts)) and `AppSettingsStore.setHeatmapExcludedCategoryIds` ([app-settings.store.ts:84-90](../../../src/app/core/state/app-settings.store.ts)), each fed from the panel's current (default) list.
- The customize panel is outside the boundary ([dashboard-overview.component.html:227-229](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)) and its toggle shows once transactions are loaded, whatever the layout store's state.
- [stats.store.ts:275-282](../../../src/app/feature-dashboard/stats.store.ts) — `statsInputsHydration()` already joins `CategoryComparisonSettingsStore` with the entity stores; the dashboard doesn't use it.

## Desired result (to-be)

- The dashboard's boundary joins `statsInputsHydration()` with `DashboardLayoutSettingsStore` and `AppSettingsStore`. A failed load of any of them shows the boundary's error and Retry, never default-driven content.
- The "Dashboard settings" toggle and the customize panel appear only once `DashboardLayoutSettingsStore` has hydrated.

## Acceptance criteria

- [ ] `DashboardLayoutSettingsStore` load rejects: the dashboard shows the boundary error with Retry, no rows, and no "Dashboard settings" button; no `PATCH` to the layout settings is sent.
- [ ] Same for a rejected `CategoryComparisonSettingsStore` or `AppSettingsStore` load.
- [ ] Retry after the load succeeds renders the saved layout (e.g. rows `[A, B]` hidden stay hidden).
- [ ] While those stores are loading, the boundary shows its skeleton.
- [ ] Persistence stays in the stores/repositories; no component calls the API.
- [ ] Component spec covers the failed-load and retry cases.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: block `/api/settings/dashboardLayoutSettings` in devtools, load `/`, see the error; unblock, Retry, see the saved layout.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Loans and future pages get the same gate in [TICKET-LOAN-19](../../loans/tickets/TICKET-LOAN-19-loan-pages-wait-for-data.md) and [TICKET-FUT-12](../../future/tickets/TICKET-FUT-12-future-page-waits-for-data.md) (forecast account scope is there).
- Lost clicks from two toggles within one round trip are [TICKET-NG-22](./TICKET-NG-22-list-toggles-keep-clicks.md); this ticket only stops writes from unloaded defaults.
