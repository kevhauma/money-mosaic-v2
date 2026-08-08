# TICKET-FUT-03 — Future page: route, shell, nav item, no date range

- **Area:** Forecast
- **Type:** Feature
- **Traceability:** adds **FR-FUT-3**. Mirrors the scaffold
  [TICKET-EXP-01](../../v2.1_extra_graphs/tickets/TICKET-EXP-01-explore-page-scaffold.md)
  established for `/explore`. Prerequisite for FUT-04/05/06/07.

## User story

As someone planning a purchase, I want a page of its own for the forward-looking view, so
"what have I done" and "what happens next" don't fight for the same screen.

## Description

A lazy `/future` route with an overview shell, a sidebar nav entry, and its own ECharts provider
scope — the empty stage every other ticket in this version renders a section into. No goals, no
forecast, no chart of its own.

## Current situation (as-is)

- [`app.routes.ts`](../../../src/app/app.routes.ts) lazy-loads each feature under the app-shell
  layout route; `/explore` is the most recent addition and the closest template.
- [`explore.routes.ts`](../../../src/app/feature-explore/explore.routes.ts) is the shape to copy: a
  component-less grouping route carrying `provideEchartsCore({ echarts })` at route level so
  ECharts stays in the feature's lazy chunk (TICKET-PERF-01), with the overview as its `''` child.
- [`app-shell.component.html`](../../../src/app/core/layout/app-shell/app-shell.component.html)
  holds the nav `<ul>`; each item is a `routerLink` + `ng-icon` + `mm-text`, and the icons are
  registered in [`app-shell.component.ts`](../../../src/app/core/layout/app-shell/app-shell.component.ts)
  via `provideIcons`.
- Every existing page-level range is driven by `RangeStore`/`page-range-control`
  ([core/state](../../../src/app/core/state)) — but the bill calendar already established that a
  forward-looking section deliberately does **not** follow it (recorded in
  [TICKET-REC-03](../../v2.1_extra_graphs/tickets/TICKET-REC-03-upcoming-bills-calendar.md)).

## Desired result (to-be)

- New `feature-future/` with `future.routes.ts` (`FUTURE_ROUTES`), an `index.ts` barrel exporting
  the routes, and a `components/future-overview/` `OnPush` shell component.
- `app.routes.ts` gains a `future` entry loading `@/feature-future`, placed after `explore`.
- The grouping route carries `provideEchartsCore({ echarts })` at route level, ready for
  [TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md), so the chart ticket adds no
  provider wiring of its own.
- Sidebar nav item "Future" between "Explore" and "Accounts", with a tabler icon registered in
  `app-shell.component.ts` next to the others (e.g. `tablerTargetArrow`).
- The overview is a titled page with a short standfirst explaining what it does ("Plan a purchase
  against how much you've actually been saving") and an empty-state body until FUT-04 lands.
- **The page takes no date range**, structurally: it injects no `RangeStore` and renders no range
  picker. A caption states that everything on the page looks forward from today, and that the
  history window driving it is set per-section — the same "say so plainly" rule REC-02 applied when
  a section didn't follow its page's range.

## Acceptance criteria

- [ ] `/future` resolves to the overview shell; the route is lazy and does not pull ECharts or the
      feature into the initial bundle (checked against the build's chunk output).
- [ ] The route is registered in `app.routes.ts` under the app-shell layout route via the
      `@/feature-future` barrel, not a deep path.
- [ ] The grouping route provides `provideEchartsCore({ echarts })` and the overview renders as its
      `''` child, matching `EXPLORE_ROUTES`' shape.
- [ ] The sidebar shows a "Future" item linking to `/future`, marked active on that route, with its
      icon registered alongside the existing ones.
- [ ] The page injects no `RangeStore` and shows no range picker, and the caption saying the page
      looks forward from today is present.
- [ ] Component is standalone + `OnPush`, exported through the feature's components barrel like its
      Explore siblings.
- [ ] Unit tests cover: the route resolving to the component; the nav item's `routerLink` and
      active state; the absence of any `RangeStore` injection; the standfirst/caption rendering.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched — the new route is lazy and adds nothing to `initial`.
- [ ] Verified live in the browser: the nav item appears, `/future` loads, and no console error is
      logged. *(Ask the user first; if declined, note it here rather than ticking.)*
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why a new page and not an Explore section.** Explore answers "where did my money go" over a
  chosen historical range and every section there is bound to that mental model; this page answers
  "what happens next" and has no range at all. Bolting it on would force the range picker to mean
  two different things on one page.
- The `/dashboard` stat row keeps net worth as a point-in-time figure — this page never replaces it,
  and FUT-07's projection deliberately starts from exactly that number so the two can't disagree on
  day zero.
- Nothing here is user-visible beyond an empty page, which is why the browser check is a navigation
  check rather than a visual one; EXP-01 was accepted on the same basis.
