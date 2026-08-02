# TICKET-STAT-27 — A chart's options survive the session: changing the bucket no longer clears your series filter

- **Area:** Charts (shared)
- **Type:** Bug fix
- **Traceability:** extends TICKET-STAT-15 (per-chart granularity) / FR-STAT-7 — `NgxEchartsDirective` calls `setOption(options, true)` (notMerge) on every `[options]` change, so echarts' internal legend-selection state is discarded whenever the option object is rebuilt

## User story

As a user, I want the choices I make on a chart — which series are showing, which bucket size, how far
I've zoomed — to stay put while I'm using the app, so switching from monthly to weekly doesn't quietly
put back the three accounts I just hid.

## Description

Chart-local UI choices are currently lost the moment anything upstream changes. Hiding an account on the
Accounts balance chart is echarts-internal state; the next bucket change or range change rebuilds the
option object, ngx-echarts replaces it wholesale, and every series comes back. This ticket makes those
choices explicit, owned by the app rather than by the chart widget, and kept for the session.

## Current situation (as-is)

- **The series filter is invisible to the app.** Legend clicks are handled entirely inside echarts.
  Nothing in [account-balance-history-chart.component.ts](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.ts),
  [trend-chart-panel.component.ts](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts)
  or [income-overview.component.ts](../../../src/app/feature-income/components/income-overview/income-overview.component.ts)
  listens for `legendselectchanged`, and no builder ever emits `legend.selected`.
- **Root cause of the reset:** `NgxEchartsDirective` (ngx-echarts 21) reacts to an `options` input change
  with `this.setOption(this.options(), true)` — the second argument is `notMerge`. A `notMerge` call
  discards echarts' internal component state, legend selection included, and the freshly-built option
  says nothing about `selected`, so every series returns to visible.
- **Every upstream change rebuilds the option object**, because each `chartOption` is a `computed()` over
  the granularity signal, the store data and the range:
  - the granularity picker (`granularity.set($event)` in
    [account-balance-history-chart.component.html](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.html)
    and the dashboard trend's own control),
  - the date range (`zoomWindow` in [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts)
    recomputes from `RangeStore.from()/to()`),
  - any transaction/account edit.
- **Granularity itself is also per-mount, not per-session.** Each chart seeds it once from
  `pickGranularityForSpan(rangeStore.from(), rangeStore.to())` in a plain `signal()` on the component, so
  navigating away from `/accounts` and back re-seeds it from the range and throws away the user's pick.
- The manual `dataZoom` position has the same lifetime: the option carries a computed `zoomWindow`, and a
  drag of the slider is echarts-internal and dropped on the next rebuild.

## Desired result (to-be)

- **A session-scoped chart-options store** holding, per chart id, the choices that are currently either
  echarts-internal or component-local:
  - `granularity` (the bucket size),
  - `hiddenSeries` (the series the user has toggled off, keyed by series **name**),
  - the manual `dataZoom` window, if one has been dragged.
  It is a root-provided signal store in `core/state/`, per the placement rule — several features read it.
  **In-memory only, not Dexie-backed**: "per session" is the requirement, and it resets on reload like
  `RangeStore` does.
- **Charts write their choices into it and read them back.** Each chart takes a stable id (e.g.
  `'accounts-balance-history'`, `'dashboard-trend-income'`), so remounting the page restores what the
  user had.
- **Legend state becomes explicit.** Every multi-series chart binds `(chartLegendSelectChanged)` and
  records the toggled series, and its option builder emits `legend.selected` from `hiddenSeries`. Because
  the rebuilt option now *states* the selection, the `notMerge` replacement restores it instead of
  clearing it — no ngx-echarts workaround, no `merge` input needed.
- **A series that no longer exists is dropped from the filter**, not remembered forever: if an account is
  deleted or renamed, or a category leaves the top-5 composition, its entry is pruned when the chart next
  reads the store — a hidden name that isn't in the current series list must not silently suppress a
  future series with the same name.
- **Granularity survives navigation** for the session; `pickGranularityForSpan` becomes the *initial*
  value only, used when the store has nothing for that chart id.
- **The date range does not reset any of this** — the whole point of the report: changing the range or the
  bucket re-scopes the data and leaves the user's series filter and zoom alone.
- **Scope: the multi-series charts** — accounts balance history, dashboard trend (both columns, each with
  its own id), income by month. Single-series charts have no legend and need only the granularity half.

## Acceptance criteria

- [ ] A session chart-options store exists in `core/state/` with per-chart-id `granularity`,
      `hiddenSeries` and optional zoom window; unit tests for read/write per id and for isolation between
      two ids.
- [ ] The store is **not** persisted — no repository, no `appDb` table, no Dexie version bump; it resets
      on reload. `git diff` touches no file under `core/data-access/`.
- [ ] Hiding a series then changing the bucket size leaves it hidden; component spec on the accounts
      balance-history chart: toggle a legend entry, change granularity, assert `legend.selected` in the
      rebuilt option still marks it off.
- [ ] Hiding a series then changing the date range leaves it hidden; same spec shape, driving the range
      instead.
- [ ] Navigating away from `/accounts` and back restores both the chosen bucket and the hidden series;
      component spec asserting a remounted chart reads the store rather than re-seeding from the range.
- [ ] A hidden series name that is no longer in the chart's series list is pruned; unit test asserting a
      later series with that name renders visible.
- [ ] With nothing stored for a chart id, granularity still seeds from `pickGranularityForSpan`; existing
      TICKET-STAT-15 specs pass unchanged.
- [ ] Every multi-series chart listed under "Scope" binds the legend-change event and emits
      `legend.selected`; unit test per builder.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: on `/accounts`, hide two accounts, switch Day→Month, change the date
      range, navigate to Dashboard and back — the same two accounts are still hidden and the bucket is
      still the one you picked.

## Notes

- **Not persisted to Dexie, deliberately.** The user asked for "per session". A hidden-series filter that
  survives a browser restart is a different (and riskier) product decision — a user who forgot they hid an
  account would read the chart as wrong. Worth its own ticket if session-scope proves too short.
- **Series keyed by name, not index.** Indices shift when an account is archived or the top-5 category
  composition changes, which would silently hide the wrong band.
- Shares every option builder with [TICKET-STAT-26](./TICKET-STAT-26-chart-legends-outside-plot.md) —
  cheaper back to back, but independent: this ticket is about state, that one about geometry.
- Ties into [TICKET-UI-23](./TICKET-UI-23-per-page-date-range.md) only by symptom. That ticket stops the
  range leaking *between pages*; this one stops a range change wiping the chart's own settings. Both
  reports came from the same interaction, and both need fixing.
