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

- [x] A session chart-options store exists in `core/state/` with per-chart-id `granularity`,
      `hiddenSeries` and optional zoom window; unit tests for read/write per id and for isolation between
      two ids. (`core/state/chart-options.store.ts`; `chart-options.store.spec.ts` — "reads back the
      granularity, hidden series and zoom it was written", "keeps two chart ids isolated", "patches one
      field without clearing the others")
- [x] The store is **not** persisted — no repository, no `appDb` table, no Dexie version bump; it resets
      on reload. `git diff` touches no file under `core/data-access/`. (`git diff --stat` lists no
      `core/data-access/` path; `chart-options.store.spec.ts` — "is session state only — a fresh injector
      starts blank"; browser: reloading `/accounts` brought both hidden accounts back and reset the bucket
      to Day)
- [x] Hiding a series then changing the bucket size leaves it hidden; component spec on the accounts
      balance-history chart: toggle a legend entry, change granularity, assert `legend.selected` in the
      rebuilt option still marks it off. (Shipped and verified on the accounts chart —
      `account-balance-history-chart.component.spec.ts` "keeps an account hidden across a bucket-size
      change". **Superseded the same day by [TICKET-ACC-10](./TICKET-ACC-10-day-only-balance-buckets.md)**,
      which fixed both balance charts to daily and removed their picker, so that chart has no bucket size
      left to change. The criterion's *behaviour* is unchanged and still covered: the bucket-change half
      moved to the chart that still has a picker —
      `trend-chart-panel.component.spec.ts` "states each column's legend selection, and the two columns'
      filters stay apart", which hides Groceries and then switches the trend bucket to Day — while the
      accounts chart keeps the range-change and remount cases below.)
- [x] Hiding a series then changing the date range leaves it hidden; same spec shape, driving the range
      instead. (same file — "keeps an account hidden across a date-range change (TICKET-STAT-27)")
- [x] Navigating away from `/accounts` and back restores both the chosen bucket and the hidden series;
      component spec asserting a remounted chart reads the store rather than re-seeding from the range.
      (same file — "restores the hidden accounts on a remount": the remounted fixture reports
      `legend.selected.Checking === false`. Same TICKET-ACC-10 supersession as above for the *bucket* half
      — `/accounts` has no bucket any more; the remount-keeps-the-bucket case is covered on the chart that
      does, by `chart-options-control.spec.ts` "adopts the session's value instead of re-seeding, so a
      remount keeps the user's bucket".)
- [x] A hidden series name that is no longer in the chart's series list is pruned; unit test asserting a
      later series with that name renders visible. (`ChartOptionsStore.pruneHiddenSeries`, driven by
      `chartSeriesFilter`'s effect; `chart-options-control.spec.ts` — "prunes a hidden name once it leaves
      the series list, so its return renders visible", plus `chart-options.store.spec.ts`'s empty-list
      guard so a pre-hydration frame can't wipe the filter, and the `untracked` write so the effect
      depends only on its own chart's series list)
- [x] With nothing stored for a chart id, granularity still seeds from `pickGranularityForSpan`; existing
      TICKET-STAT-15 specs pass unchanged. (`chart-options-control.spec.ts` — "seeds from the caller when
      the session holds nothing for that chart" and "never records the seed as a choice, so a later mount
      still re-derives it from the range". The three TICKET-STAT-15 specs — accounts history, account
      detail and trend panel — assert the same seeding with their original assertions and still pass.
      **Divergence, recorded here rather than left implicit:** their *call sites* changed, because
      `granularity` is no longer a `WritableSignal` on the component. The store is the single source of
      truth (the `pageRangeControl` shape), so the picker binds `(valueChange)="setGranularity($event)"`
      and the specs call `['setGranularity'](…)` instead of `['granularity'].set(…)`; every `granularity()`
      read is untouched. A local writable mirrored into the store by an `effect` — the first shape built
      here — would have written the *seed* on mount, and `pickGranularityForSpan` would then never run
      again for the session. `balance-trend-signals.spec.ts` additionally passes a chart id.)
- [x] Every multi-series chart listed under "Scope" binds the legend-change event and emits
      `legend.selected`; unit test per builder. (`(chartLegendSelectChanged)` bound in
      `account-balance-history-chart`, both `trend-chart-panel` columns and `income-overview`;
      `legend-option.spec.ts` covers the shared emitter, plus one per builder —
      account-balance-history-chart.component.spec.ts "marks a hidden account off in legend.selected",
      trend-chart-panel.component.spec.ts "states each column's legend selection", and
      income-overview.component.spec.ts "states which categories are toggled off")
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched; dev build initial total 2.15 MB,
      unchanged from before this ticket)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD`:
      verdict **pass**, `complexity_introduced: 0` after splitting `zoomBounds` out of `zoomFromEvent`;
      `ng lint` clean, 2232/2232 specs green, dev build compiles. The `conventions-reviewer` subagent's
      six findings were all applied: the store-backed granularity control above, `untracked` around the
      prune write so one chart's options don't re-run every other chart's effect, no zoom control on the
      account-detail chart — one key serves every account there, and a shared *dragged window* would open
      account A's zoom on account B — one `ChartZoomByIndex`/`ChartZoomByPercent`/`ChartZoomBounds` set in
      `shared/echarts` instead of a third restatement, the jsdom echarts stubs extracted to
      `shared/echarts/echarts-jsdom.testing.ts`, and the `project-map` + `coding-conventions` skills and
      `RangeStore`'s now-stale granularity note updated.)
- [x] Verified live in the browser: on `/accounts`, hide two accounts, switch Day→Month, change the date
      range, navigate to Dashboard and back — the same two accounts are still hidden and the bucket is
      still the one you picked. (Done twice on the dev server at :4210. Visually before the review fixes —
      hid Rainy Day Savings, switched Day→Month, stepped the range back to July 2026, hid Everyday
      Checking, went to Dashboard and back: both legend entries still greyed, bucket still Month; a reload
      brought both back and reset the bucket to Day. Also checked the Dashboard trend — hiding Housing on
      the Expense column survived a Day→Month switch and left the Income column untouched — and the Income
      legend. Re-run after the review fixes by reading the live echarts instances through Angular's
      dev-mode `ng.getDirectives`, since the browser pane had been closed and no longer composites: same
      `/accounts` sequence returned `legend.selected` `{Everyday Checking: false, Rainy Day Savings:
      false}` with the bucket still Month after the round trip, and `{…: true, …: true}` with Day after a
      reload; `/income` kept Salary hidden across a navigate-away-and-back. No console errors on either
      pass. The Dashboard trend's second pass was spec-only — its panels sit behind `@defer (on viewport)`,
      which needs a compositing pane to trigger.)

## Notes

- **Not persisted to Dexie, deliberately.** The user asked for "per session". A hidden-series filter that
  survives a browser restart is a different (and riskier) product decision — a user who forgot they hid an
  account would read the chart as wrong. Worth its own ticket if session-scope proves too short.
- **Series keyed by name, not index.** Indices shift when an account is archived or the top-5 category
  composition changes, which would silently hide the wrong band.
- **`account-detail-balance` is one key for every account's detail chart**, and holds only that chart's
  bucket size — which is the "granularity half" this ticket's Scope line already assigns to a
  single-series chart. It deliberately takes no `chartZoomControl`: a per-account key would need the
  route's id before the component's `account` input exists, and a shared *dragged window* is the one
  piece of this state that reads as wrong when shared, since account A's zoom would open on account B.
- Shares every option builder with [TICKET-STAT-26](./TICKET-STAT-26-chart-legends-outside-plot.md) —
  cheaper back to back, but independent: this ticket is about state, that one about geometry.
- Ties into [TICKET-UI-23](./TICKET-UI-23-per-page-date-range.md) only by symptom. That ticket stops the
  range leaking *between pages*; this one stops a range change wiping the chart's own settings. Both
  reports came from the same interaction, and both need fixing.
