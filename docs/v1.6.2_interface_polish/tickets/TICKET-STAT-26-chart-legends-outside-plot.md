# TICKET-STAT-26 — Chart legends get their own strip instead of floating over the plot

- **Area:** Charts (shared)
- **Type:** Bug fix
- **Traceability:** extends TICKET-UI-13 (chart visual language) / TICKET-STAT-12 (shared tooltip formatter) — three chart builders pass `legend: { data }` with no placement and no matching `grid` offset, so echarts draws the legend centred at the top **inside** the plot rectangle

## User story

As a user, I want a chart's legend to sit in its own space rather than floating over the lines and bars,
so I can read the series names and click them without fighting the data underneath.

## Description

Three charts declare a legend without reserving room for it, so it overlays the plot. Two other charts on
the Income page already do it correctly — legend outside the plot, `grid` padded to match. This ticket
lifts that pattern into a shared `shared/echarts` helper and applies it to the three broken charts, so the
geometry lives in one place instead of being re-typed (and re-broken) per chart.

## Current situation (as-is)

Broken — legend declared, no placement, no reserved grid space:

- **Dashboard trend (both columns)** —
  [trend-chart-panel.component.ts](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts)'s
  `buildColumnChartOption`: `legend: { data: series.map(e => e.name) }` with `grid: { top: 32 }`. Up to
  five stacked categories per column wrap the legend to a second line, and the stacked bars run under it.
- **Accounts overview balance history** —
  [account-balance-history-chart.component.ts](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.ts)'s
  `buildAccountBalanceHistoryChartOption`: `legend: { data: accounts.map(a => a.name) }`, then spreads
  [bucketedZoomAxisOption](../../../src/app/shared/echarts/bucketed-axis-option.ts), which hard-codes
  `grid: { top: 48 }`. Worst case of the three: the series are a **stacked area**, so the top band climbs
  to the top of the plot at every peak and always meets the legend — and legend clicks are how you filter
  an account out of this chart, so the overlap lands squarely on the control the user needs.
- **Income by month** —
  [income-overview.component.ts:64](../../../src/app/feature-income/components/income-overview/income-overview.component.ts) —
  same `legend: { data }` literal, same `bucketedZoomAxisOption` grid.

Already correct, and the precedent to follow:

- **Net vs gross** — [gross-net-chart-options.ts:75](../../../src/app/feature-income/gross-net-chart-options.ts)
  and [:167](../../../src/app/feature-income/gross-net-chart-options.ts) both pair `legend: { bottom: 0 }`
  with `grid: { …, bottom: 48 }` — legend below the plot, grid padded to clear it. Nothing overlaps.

There is **no shared legend helper**. `shared/echarts` owns the palette
([chart-theme.ts](../../../src/app/shared/echarts/chart-theme.ts)), the tooltip formatter
([tooltip-formatter.ts](../../../src/app/shared/echarts/tooltip-formatter.ts)) and the zoom/grid shell
([bucketed-axis-option.ts](../../../src/app/shared/echarts/bucketed-axis-option.ts)) — but each chart
re-types its own `legend` literal, which is exactly why three of five are wrong in the same way.

## Desired result (to-be)

- **A new shared builder in `shared/echarts`** — e.g. `legendOption(names, placement)` — returning the
  legend config **and** the grid offset it requires, as one object, so a caller cannot take the legend
  without the space for it. It becomes the only place legend geometry is written, alongside the existing
  three helpers.
- **Legends are `type: 'scroll'`**, so a long series list (ten accounts, five categories) pages instead of
  wrapping into a block that eats the chart.
- **Placement per chart, but never overlapping:**
  - The two `bucketedZoomAxisOption` charts (accounts balance history, income by month) put the legend in
    a **top strip** with `grid.top` grown to clear it — their bottom edge is already taken by the
    `dataZoom` slider (`bottom: 8`, `height: 20`, `grid.bottom: 64`).
  - The dashboard trend columns take the same top strip, for consistency across the two side-by-side
    charts.
  - The Net vs gross builders keep their existing bottom placement, but route it through the helper so
    the reserved-space rule has a single owner.
- **`bucketedZoomAxisOption` takes its `grid.top` from the caller** (defaulting to today's `48`) rather
  than hard-coding it, so the two zoom-slider charts stay geometrically identical to each other.
- **Legend entries stay clickable and keep toggling their series** — native echarts behaviour that the
  accounts chart depends on; this fix must not make the legend decorative.
- **Chart container heights are unchanged** (`h-80`, `h-72`, `h-64`): the plot gets shorter by the
  legend's height rather than the container getting taller, so no page's scroll length moves.
- **Single-series charts gain nothing** — [account-balance-chart.component.ts](../../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts)
  (one account) and the yearly bar chart render no legend today and should not start.

## Acceptance criteria

- [ ] `shared/echarts` exports one legend helper returning both the legend config and its required grid
      offset; unit-tested for `type: 'scroll'`, the placement it was asked for, and an offset large enough
      to clear the legend.
- [ ] `bucketedZoomAxisOption` takes `grid.top` from its caller with today's `48` as the default; its
      existing spec passes unchanged, plus a new case for a passed offset.
- [ ] `buildColumnChartOption`, `buildAccountBalanceHistoryChartOption` and the income by-month builder
      route their legend through the helper; unit test on each asserting the legend is scroll-typed and
      that `grid.top` exceeds the legend strip rather than the old literal.
- [ ] `buildTakeHomeChartOption` and `buildGrossNetGrowthChartOption` route their existing bottom legend
      through the helper with **no change to rendered geometry**; their existing specs pass unchanged.
- [ ] No chart builder in `src/app` contains a bare `legend: {` literal any more; `grep` is clean.
- [ ] Legend clicks still toggle a series on the accounts balance-history chart; component spec asserts
      the entries render and `selectedMode` was not disabled.
- [ ] With ten active accounts the legend pages rather than growing; unit test over ten names asserting
      `type: 'scroll'` and an unchanged reserved offset.
- [ ] Chart container heights (`h-80`/`h-72`/`h-64`) are unchanged; `git diff` touches no height class.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised, and no new echarts module registered — confirm
      `echarts-setup.ts` already includes the legend component before assuming so.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser, on all three broken surfaces: with a full stack the top band no longer
      runs under the legend, and every legend entry is clickable where it is drawn.

## Notes

- **A strip, not a right-hand column.** A vertical legend beside the plot reads better with many series
  but costs horizontal room the income page's charts-plus-rail layout (TICKET-INC-17) and the 2×2 grid
  do not have. Revisit per chart if one proves cramped; don't fork the helper for it here.
- Interacts with [TICKET-STAT-27](./TICKET-STAT-27-session-persistent-chart-options.md), which makes the
  legend's *toggle state* survive an option rebuild. Same option builders, so back-to-back is cheaper —
  but neither depends on the other.
- The Net vs gross builders are included only to give the rule one owner; if routing them through the
  helper changes a single pixel, the helper is wrong, not those charts.
