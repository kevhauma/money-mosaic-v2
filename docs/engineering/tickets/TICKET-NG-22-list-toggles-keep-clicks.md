# TICKET-NG-22 — Settings list toggles never lose a click

- **Area:** State (core/state, feature stores) — whole-list settings writes
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-27 (list-toggle part), CR6-A2; affects the dashboard layout (TICKET-STAT-14), income category selection (FR-INC-1), comparison and heatmap exclusions (FR-STAT-8, FR-STAT-15) and forecast account scope (TICKET-FUT-08)

## User story

As a user ticking two checkboxes quickly, I want both ticks saved, so the second click doesn't undo the first.

## Description

Every list toggle reads the whole list from client state, adds or removes one id, and sends the whole list. The store only updates after the reply, so a second click within one round trip starts from the same old list and its write drops the first click.

## Current situation (as-is)

- [dashboard-layout-settings.store.ts:49-55](../../../src/app/feature-dashboard/dashboard-layout-settings.store.ts) — `toggleRowHidden`: list from `store.hiddenRowIds()`, `await setHiddenRowIds(list)`, then `patchState`.
- [income.store.ts:245-260](../../../src/app/feature-income/income.store.ts) — `toggleIncomeCategory` builds `excluded` from `appSettingsStore.excludedIncomeCategoryIds()`; the smoothing toggle below it does the same.
- [forecast-controls.component.ts:119-124](../../../src/app/feature-future/components/forecast-controls/forecast-controls.component.ts) — the forecast scope checkbox builds the next set from `forecastStore.scopeAccountIds()`.
- Exclusion lists: [category-comparison-panel.component.ts:127-128](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.ts) and [spending-heatmap-panel.component.ts:313-314](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.ts) send the list the picker computed from the store's current value.
- Failure: hide rows X then Y within one round trip. Both writes start from `[]`; the server ends with `[Y]` and the store with `[Y]`.

## Desired result (to-be)

- A toggle applies to the latest list, including toggles still in flight: the store patches optimistically before the write (rolling back on failure), or the store serialises its writes so each starts from the previous one's result. One mechanism, shared by every list toggle above — not one per store.
- A failed write leaves the store matching the server and the failure visible (see TICKET-NG-13).

## Acceptance criteria

- [ ] Hiding rows X then Y with the first write still pending ends with `[X, Y]` on the server and in the store.
- [ ] Same for two income-category toggles, two forecast scope checkboxes, and two exclusion-picker changes.
- [ ] A rejected write rolls the store back to the last server-confirmed list.
- [ ] Specs for each listed store cover the two-clicks-one-round-trip case with deferred repository promises.
- [ ] Persistence stays in stores/repositories; no component calls the API.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: throttle to "Slow 3G", tick two dashboard rows hidden in quick succession, reload, both stay hidden.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- CR6-A2 also suggests toggling on the server (send "add X"/"remove X" instead of the list). That needs new endpoints and is the bigger change; pick it only if the client fix can't be made reliable.
- Writes from unloaded defaults are a separate failure, fixed by gating: [TICKET-NG-11](./TICKET-NG-11-dashboard-waits-for-settings.md), LOAN-19, FUT-12.
