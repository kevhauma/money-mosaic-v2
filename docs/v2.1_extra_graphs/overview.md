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

**Added 2026-08-06 — a third track.** Recurring-payment detection was originally parked in "Considered, not ticketed
yet" below ("needs *detection* before it needs a chart"); it has now been pulled into this version as its own track,
`TICKET-REC-01..04`, on the strength of [competitive-analysis.md](../v9999_ideas/competitive-analysis.md) gap #3 (the
most-praised Monarch feature that is fully achievable offline — cadence + amount + counterparty clustering over data we
already have). It adds a second new requirement family, **FR-REC**, and keeps every rule above intact: no Dexie change
(detection is stateless inference, flags are computed not stored), and its one piece of new UI state (the bill
calendar's visible month) goes into the session-scoped `ChartOptionsStore` like the rest.

**Added 2026-08-06, later the same day — category applicability.** From the rent example ("not applicable anymore
shouldn't be in the list"): `TICKET-CAT-10/11` give a category an optional applicability window and make the
category pickers/filters respect it, and `TICKET-REC-05` keeps a concluded category's series out of the recurring
list. This **qualifies the no-schema promise above**, deliberately and narrowly: `Category` gains two optional,
non-indexed fields (`activeFrom`/`activeUntil`) — new persisted data, but still **no new table and no Dexie version
bump**, because `.stores()` declares indexes, not fields (the `appSettings` precedent recorded in the data-model
skill). Stat panels and aggregates deliberately do *not* consume the window (a 2022 range showing rent is correct);
the scope decision is recorded in CAT-11's Notes.

## Dashboard track (heatmap — independent of the Explore track)

- [x] [TICKET-STAT-29](./tickets/TICKET-STAT-29-spending-heatmap-panel.md) — Spending heatmap: top categories × day of week, as a new Dashboard row (adds FR-STAT-15) — first: it introduces the cycle aggregate, the heatmap ECharts registration and the sequential colour ramp everything else in this track builds on
- [x] [TICKET-STAT-30](./tickets/TICKET-STAT-30-heatmap-cycle-switcher.md) — Switch the heatmap between day of week, day of month, month and quarter (extends FR-STAT-15) — **needs STAT-29**; widens its `cycle` parameter and adds the per-chart control
- [ ] [TICKET-STAT-31](./tickets/TICKET-STAT-31-heatmap-cycles-fit-the-range.md) — Only offer heatmap cycles the selected range can actually fill (bug fix, revises FR-STAT-15 — the picker offers all four cycles whatever the range, so a one-week range can be switched to a Month view whose columns are empty for calendar reasons) — **needs STAT-30**; from feedback on the shipped panel
- [ ] [TICKET-STAT-32](./tickets/TICKET-STAT-32-heatmap-exclude-categories.md) — Exclude categories from the spending heatmap, like the category period comparison panel already allows (extends FR-STAT-15) — **needs STAT-29**; independent of STAT-31, also from feedback on the shipped panel

## Explore track (Sankey + 3D — independent of the Dashboard track)

- [x] [TICKET-EXP-01](./tickets/TICKET-EXP-01-explore-page-scaffold.md) — Explore page: route, shell, nav item, own date range (adds FR-EXP-1) — prerequisite for every other ticket in this track; no chart of its own
- [x] [TICKET-EXP-02](./tickets/TICKET-EXP-02-money-flow-sankey.md) — Money flow Sankey: income sources → accounts → categories/savings/left-over, on a graph that provably balances (adds FR-EXP-2) — **needs EXP-01**; the headline section, and the base EXP-03/04 both extend — ⚠ **the live *visual* browser check is still outstanding** on this and the two below (the figures were verified live against real data and match the Dashboard exactly; only "does it look right" is unchecked)
- [x] [TICKET-EXP-03](./tickets/TICKET-EXP-03-sankey-category-group-level.md) — Category groups as an intermediate Sankey level, from `Category.group` (extends FR-EXP-2) — **needs EXP-02**; independent of EXP-04 — ⚠ visual browser check outstanding
- [x] [TICKET-EXP-04](./tickets/TICKET-EXP-04-sankey-tooltips-drilldown-privacy.md) — Sankey amounts, share-of-total, drill-down to transactions, and privacy mode (extends FR-EXP-2) — **needs EXP-02**; independent of EXP-03, and what turns the diagram from a poster into a query interface — ⚠ visual browser check outstanding
- [x] [TICKET-EXP-06](./tickets/TICKET-EXP-06-money-flow-account-balance-tiers.md) — Money flow reads account balances, and draws transfers between your own accounts (revises FR-EXP-2) — **from feedback on the shipped diagram**; reverses EXP-02's "route everything through `classifyForStats`" decision, drops ownership weighting, and adds a second account tier so a checking → joint transfer is visible — ⚠ visual browser check outstanding on the reporter's own dataset
- [x] ~~[TICKET-EXP-05](./tickets/TICKET-EXP-05-3d-spending-landscape.md) — 3D spending landscape, months × categories × amount via `echarts-gl` (adds FR-EXP-3)~~ — **closed 2026-08-06 as won't do**, at its own feasibility gate and before any UI work: `echarts-gl@2.1.0` imports 16 deep paths into `echarts`/`zrender` without a `.js` extension, which both packages' strict `exports` maps refuse, so `ng build` cannot resolve it — kill criterion 1 ("cannot render against ECharts 6 without … patching the dependency"). **FR-EXP-3 is not delivered.** The finding, the rejected workarounds and the named follow-up (a WebGL-free isometric SVG landscape) are recorded in the ticket's Notes
- [ ] [TICKET-EXP-07](./tickets/TICKET-EXP-07-spending-mosaic-treemap.md) — Spending mosaic: a treemap of category groups → categories, area-true with native drill-down (adds FR-EXP-4) — **needs EXP-01** only; graduated 2026-08-07 from "Considered, not ticketed yet" as EXP-05's named cheapest replacement, now that its kill criteria have fired; core ECharts, no new dependency

## Recurring track (detection + bill calendar — independent of both tracks above)

Needs only [TICKET-EXP-01](./tickets/TICKET-EXP-01-explore-page-scaffold.md)'s shipped scaffold for a place to render.

- [x] [TICKET-REC-01](./tickets/TICKET-REC-01-recurring-payment-detection.md) — Detect recurring payments: same counterparty, similar amount, regular rhythm (adds FR-REC-1) — first: the pure aggregate every other REC ticket consumes; no UI of its own
- [x] [TICKET-REC-02](./tickets/TICKET-REC-02-recurring-payments-panel.md) — Recurring payments panel on Explore: what repeats, what it costs per month (adds FR-REC-2) — **needs REC-01** — ⚠ **the live browser check is outstanding**, waived by the user when this shipped; every other criterion is covered by the panel's 8 specs
- [x] [TICKET-REC-03](./tickets/TICKET-REC-03-upcoming-bills-calendar.md) — Upcoming bills: expected payments as a calendar or a date-ordered list, with a view switcher (adds FR-REC-3) — **needs REC-01**; independent of REC-02's code, sits after it on the page — ⚠ **live browser check outstanding**, waived by the user; shipped as a shell + two view children, and introduced `RecurringSeriesStore` so detection runs once per page rather than once per section
- [x] [TICKET-REC-04](./tickets/TICKET-REC-04-recurring-change-flags.md) — Flag what changed: price increases, missed payments, stopped series (extends FR-REC-1/2) — **needs REC-01 + REC-02**; its calendar marker extends REC-03 where shipped — ⚠ **live browser check outstanding**, waived by the user; `priceChange` is detected by *merging* two amount bands back together, which also resolves the "a price change makes a series disappear" consequence recorded in REC-01's Notes
- [x] [TICKET-CAT-10](./tickets/TICKET-CAT-10-category-applicability-range.md) — Assign an applicability range to a category (adds FR-CAT-9) — independent of every REC ticket, can ship any time; two optional non-indexed `Category` fields, no version bump — ⚠ **live browser check outstanding**, waived by the user; the boundary predicate lives in `core/categorisation/category-applicability.ts` for CAT-11/REC-05 to share, and the data-model skill's no-bump rule is now general rather than an `appSettings` carve-out
- [x] [TICKET-CAT-11](./tickets/TICKET-CAT-11-pickers-respect-applicability.md) — Pickers and filters only offer categories that apply to the date at hand (extends FR-CAT-9) — **needs CAT-10**; the window predicates live beside CAT-10's in `core/categorisation/category-applicability.ts`, and the shared picker vocabulary moved to `feature-transactions/category-picker.ts`
- [x] [TICKET-REC-05](./tickets/TICKET-REC-05-recurring-honours-category-range.md) — The recurring list honours a category's applicability range (extends FR-REC-1/2/3) — **needs CAT-10 + REC-01/02**; deliberately last — its calendar-clipping and flag clauses land with REC-03/04, or fold into them if worked together; a future-closing window reaches the projection as a `projectUntil` field on the series, keeping `projectRecurringOccurrences` category-unaware
- [x] [TICKET-REC-06](./tickets/TICKET-REC-06-stopped-series-collapsed.md) — Collapse the stopped series group, closed by default (extends FR-REC-2) — **needs REC-04** (shipped); independent of every open ticket, can ship any time; from feedback on the shipped panel
- [ ] [TICKET-REC-07](./tickets/TICKET-REC-07-weekly-and-fortnightly-detection.md) — Weekly rhythms survive real data, and fortnightly becomes a cadence (bug fix, revises FR-REC-1 — `recogniseCadence` rejects a series when any single gap leaves the cadence window, which one skipped week always does at weekly scale; and the deliberate 11–23-day hole between bands means a fortnightly rhythm produces nothing at all) — **needs REC-01** (shipped); independent of every open ticket; touches the same aggregate as REC-05 without overlapping it; from feedback on the shipped panel

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
- **Recurring-payment / bill-calendar visualisations** — *graduated, 2026-08-06.* Originally parked here because it
  needs *detection* before it needs a chart; both halves are now the Recurring track above (TICKET-REC-01..04). What
  stays out of this version: user overrides on detection ("this is not recurring", merging two series, dismissing a
  flag) and a "what changed since last visit" inbox consuming REC-04's flags — each needs persistence, and this version
  ships no Dexie change.
- **A treemap ("mosaic") of category groups → categories** — *graduated, 2026-08-07, as
  [TICKET-EXP-07](./tickets/TICKET-EXP-07-spending-mosaic-treemap.md).* Originally parked as showing the same
  composition the pie and the Sankey's destination level already show; EXP-05's kill criteria then fired and the
  appetite for a showpiece remained, exactly the condition this entry named. The ticket answers the duplication
  objection (it is the only hierarchical, *area-true* composition view) — the isometric SVG fallback from EXP-05's
  Notes stays unticketed.
- **Persisting chart choices across reloads.** The heatmap's cycle and the Sankey's grouping toggle live in
  `ChartOptionsStore`, which is in-memory by the deliberate decision recorded in its own doc comment (a hidden series or
  an unexpected axis surviving a browser restart reads as the app being simply wrong). Moving either into `appSettings`
  would be a reversal of that decision and needs its own ticket, not a quiet default change here.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus the
`Fallow` code-quality check, plus a live browser check for any UI-visible change (every ticket here is UI-visible except
EXP-01, which is a route/shell scaffold and is verified by its route spec plus a navigation check, and REC-01, a pure
aggregate verified by its spec). **No Dexie schema
change in this version** — no new table, no version bump, no `appSettings` field (CAT-10 adds two optional
non-indexed fields to `Category` — new persisted data, but non-indexed fields need no version block; see its ticket); `DashboardRowId` gains one member
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
