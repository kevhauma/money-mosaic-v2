# Money Mosaic — v1.6.2 UI polish (Overview)

Nineteen tickets: fourteen from one pass over the shipped app with real data, plus five more from a
second pass over the seven header tickets once they shipped. Nothing here is a new capability — every
item is something the app already does, done in a way that gets in the user's way. They fall into five
groups:

**Charts get their own space and remember what you told them.** Three charts draw their legend inside
the plot rectangle, so the series names sit on top of the data and on top of the only control that hides
a series. Separately, every chart-local choice — which series are hidden, which bucket size, where the
zoom sits — is either echarts-internal or component-local, and `NgxEchartsDirective` replaces the option
object wholesale (`setOption(option, true)`) on every rebuild, so changing the bucket or the date range
silently restores every series you just hid.

**Pages get one header.** Today a page's title, its subtitle, its controls and the app-wide date range
are spread across the shell topbar, the header, and the page body, differently per page. `mm-page-header`
gains a contract — title plus that page's own controls, no subtitles anywhere — and the date range moves
out of the topbar into the pages that actually use one, **per page**, so narrowing the Dashboard stops
re-scoping the Accounts chart.

**Then the header earns its keep.** The first seven tickets gave every page one header; using them
showed the rest. The one action slot splits in two, so a control that changes *what you're looking at*
(date range, view switch, back-to-parent) sits by the title and one that *acts on it* stays right. The
bar sticks to the top, so a long page's controls stay reachable. `/changelog` and the two leaf help
pages join the contract. And net worth moves out of the Dashboard's header into the stat row it
belongs with — reversing a call TICKET-STAT-25 made deliberately, which is why that ticket's note
points here.

**Accounts stops offering bucket sizes a balance can't have.** A balance is a level, not a period sum, so
week/month/quarter/year buckets on the two balance charts do nothing but throw away days. Fixed to daily,
which then makes a genuinely useful hover possible: what actually moved that day, per account. The card
list below the chart becomes a single column in the chart's own stack order, so a band and its account
line up.

**Two long-standing annoyances.** The transaction filter's amount-direction toggle has no "off" position
and — the actual bug — doesn't filter anything unless you also type an amount. And the Income page's
one two-column section silently collapses to a single column at exactly the widths people use, which is
most of why it scrolls forever.

Each ticketed line links to a `tickets/TICKET-*.md` file carrying its own user story, description,
as-is/to-be and acceptance criteria — this file is only the index + build order.

## Build order

Ordered by dependency, not by area. The five per-page header tickets all wait on the header contract and
are independent of each other after it; the rest are independent unless noted.

- [x] [TICKET-UI-22](./tickets/TICKET-UI-22-page-header-contract.md) — One header per page: title plus its own controls, no subtitles (revises `ui-layout-spec.md` page header) — **first**: the contract every per-page header ticket below builds against, and it carries every page that needs only a title
- [x] [TICKET-UI-23](./tickets/TICKET-UI-23-per-page-date-range.md) — The date range moves into the page header, and stops following you between pages (revises FR-STAT-7) — needs UI-22; the Dashboard and Accounts headers below both place the control it frees up
- [x] [TICKET-STAT-25](./tickets/TICKET-STAT-25-dashboard-page-header.md) — Dashboard header: a named "Dashboard settings" button, its own date range, net worth stays (extends FR-STAT-7 / TICKET-STAT-21) — needs UI-22 + UI-23
- [x] [TICKET-ACC-08](./tickets/TICKET-ACC-08-accounts-page-header.md) — Accounts header: show archived, add account, and the page's own date range (extends FR-ACC-1) — needs UI-22 + UI-23
- [x] [TICKET-INC-21](./tickets/TICKET-INC-21-income-page-header.md) — Income header: guide, settings and salary details, without the subtitle (revises FR-INC-1 presentation / TICKET-INC-18) — needs UI-22 only; `/income` deliberately has no date range
- [x] [TICKET-CAT-09](./tickets/TICKET-CAT-09-categories-rules-page-header.md) — Categories/Rules header: the switch, the create button, and each tab's own control (extends FR-CAT-1/FR-CAT-4) — needs UI-22 only
- [x] [TICKET-ML-18](./tickets/TICKET-ML-18-learning-page-header.md) — Learning header: the model's status, in the header (revises TICKET-ML-10/ML-12 presentation) — needs UI-22 only; smallest of the five
- [x] [TICKET-UI-24](./tickets/TICKET-UI-24-header-start-and-end-action-sections.md) — The header gets a start and an end action section, and the date range and Categories/Rules switch move into the start one (extends TICKET-UI-22, revises `ui-layout-spec.md` §3) — **first of the second header pass**: the contract CHG-02 and PUB-09 below both build against
- [x] [TICKET-UI-25](./tickets/TICKET-UI-25-sticky-page-header.md) — The page header sticks to the top, so a long page's controls stay reachable (extends TICKET-UI-22) — independent of UI-24, but the same bar, so back to back avoids verifying every header twice
- [x] [TICKET-CHG-02](./tickets/TICKET-CHG-02-changelog-roadmap-switch-in-header.md) — The Changelog/Roadmap switch moves into the header, like Categories/Rules (extends TICKET-CHG-01/TICKET-PUB-05) — needs UI-24; read TICKET-CAT-09 first, the shape is the same but this switch is selection-driven, not route-driven
- [x] [TICKET-PUB-09](./tickets/TICKET-PUB-09-help-back-link-in-header.md) — A guide and the FAQ carry the way back to the how-to list in their header (extends TICKET-PUB-02/PUB-03) — needs UI-24; the last leaf pages without the back link the Income sub-pages and account detail already have
- [x] [TICKET-STAT-28](./tickets/TICKET-STAT-28-net-worth-stat-card.md) — Net worth becomes a stat card on the Dashboard instead of a figure in its header (revises TICKET-STAT-25 / FR-STAT-1) — independent of UI-24, either order; the risk is the scoping mismatch, not the markup — four range-scoped cards and one point-in-time one
- [x] [TICKET-STAT-26](./tickets/TICKET-STAT-26-chart-legends-outside-plot.md) — Chart legends get their own strip instead of floating over the plot (bug fix, extends TICKET-UI-13 — three builders pass `legend: { data }` with no placement and no matching `grid` offset) — independent, can ship any time; highest visible payoff per line changed
- [x] [TICKET-STAT-27](./tickets/TICKET-STAT-27-session-persistent-chart-options.md) — A chart's options survive the session: changing the bucket no longer clears your series filter (bug fix, extends TICKET-STAT-15 — `setOption(option, true)` discards echarts' legend-selection state on every rebuild) — independent of STAT-26, but they share every option builder, so back to back is cheaper
- [x] [TICKET-ACC-10](./tickets/TICKET-ACC-10-day-only-balance-buckets.md) — Balance history is a daily series: drop the bucket picker from Accounts and account detail (revises TICKET-STAT-15 for Accounts) — independent, but **must precede ACC-11**
- [ ] [TICKET-ACC-11](./tickets/TICKET-ACC-11-accounts-chart-day-hover-transactions.md) — Hovering a day on a balance chart shows that day's transactions — grouped by account on the Accounts overview, for the one account on account detail (extends FR-STAT-2 / TICKET-STAT-12) — **needs ACC-10**: "that day's transactions" has no referent under a month bucket
- [ ] [TICKET-ACC-09](./tickets/TICKET-ACC-09-accounts-list-matches-stack-order.md) — Account cards stack in one column, in the chart's stacking order (extends TICKET-STAT-02) — independent of the two chart tickets above; touches only what sits under the chart
- [ ] [TICKET-TXN-10](./tickets/TICKET-TXN-10-amount-type-with-min-max.md) — Amount type sits with min/max, gains an "All", and filters on its own (bug fix, revises TICKET-TXN-08 — the direction check lives inside the `amountMin`/`amountMax` branch, so a direction with no bounds filters nothing) — fully independent of everything else here
- [ ] [TICKET-INC-22](./tickets/TICKET-INC-22-income-page-shorter-scroll.md) — The Income page stops being a mile of scroll, and its events rail becomes a sticky, viewport-capped column (revises TICKET-INC-16/INC-17 layout) — **last**: INC-21 already changes the top of this page, and re-verifying the layout twice is wasted

## Considered, not ticketed

- **Persisting chart options past the session** (hidden series, bucket size surviving a browser restart) —
  TICKET-STAT-27 is explicitly session-scoped, per the report's wording. A hidden-account filter that
  survives a restart is a different product decision: a user who forgot they hid an account would read the
  chart as simply wrong. Worth its own ticket if session scope proves too short in use.
- **Persisting the date range** — same reasoning, and `RangeStore` has always been ephemeral by design.
- **Merging `/categories` and `/rules` into one route with an in-page tab** — the two views have different
  stores, tables and actions; TICKET-CAT-09 moves the switch into the header without touching the routing.
- **Retiring `mm-granularity-picker`** — TICKET-ACC-10 removes it from the two balance charts only. The
  dashboard trend chart still needs it, and bucket size is a real choice for a period sum.
- **A vertical (right-hand) chart legend** — better with many series, but costs horizontal room the Income
  page's charts-plus-rail layout and the Net vs gross grid don't have. TICKET-STAT-26 takes a top strip;
  revisit per chart if one proves cramped.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all
pass, plus the `Fallow` code-quality check, plus a live browser check for any UI-visible change — which is
every ticket in this version. **No ticket here adds or changes a Dexie schema version**: the one new piece
of state (TICKET-STAT-27's chart options) is deliberately session-only and lives in a root signal store,
not a repository, so nothing under `core/data-access/` is touched. Components and stores still never reach
`appDb` directly. Amounts and dates go through `formatCurrency()`/`localeDate` (TICKET-SET-03/04), charts
through `@/shared/echarts`'s theme helpers, and every new chart-option geometry through the shared builders
rather than a re-typed literal — that duplication is the root cause of two of the bugs in this set. The
production bundle budget in `angular.json` is never raised.
