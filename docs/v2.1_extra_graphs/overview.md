# Money Mosaic — v2.1 Extra graphs (Overview)

Split out of the "Extra graphs" section of [v9999_ideas/requirements.md](../v9999_ideas/requirements.md) — three rough
lines (a heatmap of day-of-week/month/quarter buckets against the top categories, a Sankey running outside → accounts →
category groups → categories, and "cool fancy 3d graph?") worked into seven tickets. The through-line: every chart the
app has today plots **one measure against time or against categories** — a stacked bar, a pie, a line, two CSS bars for
weekday-vs-weekend. None of them shows a *cycle* (all my Mondays folded together) and none shows a *flow* (this money
came from there and went to here). This version adds both, plus one deliberately-for-delight 3D view, without adding a
backend, a schema table, or a byte to the production `initial` bundle. Each ticketed line links to a `tickets/TICKET-*.md`
file carrying its own user story, description, as-is/to-be, and acceptance criteria — this file is only the index +
build order.

**Two homes, on purpose.** The heatmap is panel-sized and answers a Dashboard question ("when do I spend, on what"), so
it becomes a Dashboard row like every other panel — reorderable and hideable via [TICKET-STAT-14](../v1.3_dashboard_insights/tickets/TICKET-STAT-14-customizable-dashboard-layout.md)'s
customize mode, no new route. The Sankey and the 3D landscape need full width, their own controls and their own camera,
and they answer "where does my money actually go" rather than "how am I doing this period" — so they get a new routed
feature area, `/explore` → `feature-explore/`, with its own date range. That split is why the version has two independent
tracks below.

**One new requirement family, FR-EXP**, for the Explore page's charts; the heatmap extends the existing FR-STAT family
since it lives on the Dashboard. **No Dexie schema change anywhere in this version** — every ticket derives from existing
`Transaction`/`Category`/`Account` data, and the two pieces of new UI state (the heatmap's cycle, the Sankey's grouping
toggle) go into the in-memory, session-scoped `ChartOptionsStore` established by [TICKET-STAT-27](../v1.6.2_interface_polish/tickets/TICKET-STAT-27-session-persistent-chart-options.md),
not into `appSettings`.

## Dashboard track (heatmap — independent of the Explore track)

- [x] [TICKET-STAT-29](./tickets/TICKET-STAT-29-spending-heatmap-panel.md) — Spending heatmap: top categories × day of week, as a new Dashboard row (adds FR-STAT-15) — first: it introduces the cycle aggregate, the heatmap ECharts registration and the sequential colour ramp everything else in this track builds on
- [x] [TICKET-STAT-30](./tickets/TICKET-STAT-30-heatmap-cycle-switcher.md) — Switch the heatmap between day of week, day of month, month and quarter (extends FR-STAT-15) — **needs STAT-29**; widens its `cycle` parameter and adds the per-chart control

## Explore track (Sankey + 3D — independent of the Dashboard track)

- [ ] [TICKET-EXP-01](./tickets/TICKET-EXP-01-explore-page-scaffold.md) — Explore page: route, shell, nav item, own date range (adds FR-EXP-1) — prerequisite for every other ticket in this track; no chart of its own
- [ ] [TICKET-EXP-02](./tickets/TICKET-EXP-02-money-flow-sankey.md) — Money flow Sankey: income sources → accounts → categories/savings/left-over, on a graph that provably balances (adds FR-EXP-2) — **needs EXP-01**; the headline section, and the base EXP-03/04 both extend
- [ ] [TICKET-EXP-03](./tickets/TICKET-EXP-03-sankey-category-group-level.md) — Category groups as an intermediate Sankey level, from `Category.group` (extends FR-EXP-2) — **needs EXP-02**; independent of EXP-04
- [ ] [TICKET-EXP-04](./tickets/TICKET-EXP-04-sankey-tooltips-drilldown-privacy.md) — Sankey amounts, share-of-total, drill-down to transactions, and privacy mode (extends FR-EXP-2) — **needs EXP-02**; independent of EXP-03, and what turns the diagram from a poster into a query interface
- [ ] [TICKET-EXP-05](./tickets/TICKET-EXP-05-3d-spending-landscape.md) — 3D spending landscape, months × categories × amount via `echarts-gl` (adds FR-EXP-3) — **needs EXP-01** only; deliberately **last**: it is the riskiest and least load-bearing ticket here, and it carries explicit kill criteria

## Considered, not ticketed yet

- **A "day of week" filter on the Transactions page.** The heatmap's drill-down can pass a range and a category but not
  a weekday — `buildTransactionDrilldownParams` ([search-params.ts](../../src/app/shared/utils/search-params.ts)) has no
  such param and the Transactions filters have no such control. Adding one is a Transactions-feature ticket, not
  something to smuggle into a chart ticket; until it exists, a cell click drills down to range + category and drops the
  day dimension (recorded in STAT-29's Notes).
- **Per-occurrence averages in the heatmap.** Cells are totals, so a range containing nine Mondays and eight Tuesdays
  tilts slightly toward Monday for free, and `day-of-month` columns 29–31 are structurally dimmer. A totals/average
  toggle would fix both; it is a small follow-up once the panel has been read against real data, and is called out in
  both STAT-29's and STAT-30's Notes rather than pre-emptively built.
- **A freeform report builder** (any measure × any dimension × any period), the direction
  [competitive-analysis.md](../v9999_ideas/competitive-analysis.md) §13 points at and the "Chart builder" line already on
  the in-app Roadmap. This version deliberately ships three *specific, opinionated* charts instead: each encodes a
  question worth asking, where a builder hands the user a blank canvas and the burden of knowing what to ask. If all
  three prove useful, a builder is the natural next step; if they don't, a builder wouldn't have saved them.
- **Recurring-payment / bill-calendar visualisations** — the other chart-shaped gap in the competitive analysis (§3).
  Out of scope here because it needs *detection* (cadence + counterparty clustering) before it needs a chart; that is a
  feature milestone of its own, not a graph ticket.
- **A treemap ("mosaic") of category groups → categories.** Considered as a bundle-free alternative to the 3D view,
  since it ships inside core ECharts and matches the app's name. Not ticketed: it would show the same composition the
  category breakdown pie and the Sankey's destination level already show, in a third form. If EXP-05's kill criteria
  fire and the appetite for a showpiece remains, this is the cheapest replacement — as is the isometric SVG fallback
  named in EXP-05 itself.
- **Persisting chart choices across reloads.** The heatmap's cycle and the Sankey's grouping toggle live in
  `ChartOptionsStore`, which is in-memory by the deliberate decision recorded in its own doc comment (a hidden series or
  an unexpected axis surviving a browser restart reads as the app being simply wrong). Moving either into `appSettings`
  would be a reversal of that decision and needs its own ticket, not a quiet default change here.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus the
`Fallow` code-quality check, plus a live browser check for any UI-visible change (every ticket here is UI-visible except
EXP-01, which is a route/shell scaffold and is verified by its route spec plus a navigation check). **No Dexie schema
change in this version** — no new table, no version bump, no `appSettings` field; `DashboardRowId` gains one member
(`'spending-heatmap'`), which is a *type* change resolved for existing users by `resolveDashboardRowOrder`'s
append-unknown-ids behaviour, not a migration. Components and stores never touch `appDb` directly — the new charts read
`TransactionsStore`/`CategoriesStore`/`AccountsStore`/`RangeStore` from `@/core/state`. Every new aggregate is a pure
function in `core/stats/` and routes every per-transaction decision through `classifyForStats()`, so a heatmap cell, a
Sankey ribbon and a Dashboard stat card can never disagree about what counts as income, expense, savings or a transfer.
User-facing amounts and dates go through `formatCurrency()`/`localeDate`, charts through `@/shared/echarts`'s theme
helpers, and every chart ships the visually-hidden figure table [TICKET-STAT-20](../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md)
established plus privacy-mode compliance per [TICKET-PRIV-01](../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).
**The production bundle budget in `angular.json` is never raised** — ECharts stays out of the main bundle via
route-level `provideEchartsCore`, the new Heatmap/VisualMap/Sankey modules are registered once in the shared setup, and
`echarts-gl` (EXP-05) is dynamically imported inside `feature-explore` alone, under explicit kill criteria if it can't
be made to pay for itself.
