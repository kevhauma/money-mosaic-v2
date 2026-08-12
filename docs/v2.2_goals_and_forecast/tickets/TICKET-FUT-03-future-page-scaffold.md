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

- [x] `/future` resolves to the overview shell; the route is lazy and does not pull ECharts or the
      feature into the initial bundle (checked against the build's chunk output).
      (`future.routes.spec.ts` → "resolves /future to the overview component" walks the router
      snapshot to the leaf and asserts its `loadComponent` resolves to `FutureOverviewComponent`.
      `ng build --configuration development --verbose` lists
      `chunk-5PNPQMZJ.js | future-overview-component | 296 bytes` under **Lazy chunk files**, and
      `Initial total` stayed 2.16 MB.)
- [x] The route is registered in `app.routes.ts` under the app-shell layout route via the
      `@/feature-future` barrel, not a deep path. (`import('@/feature-future').then((m) =>
      m.FUTURE_ROUTES)`, placed between `explore` and `accounts`.)
- [x] The grouping route provides `provideEchartsCore({ echarts })` and the overview renders as its
      `''` child, matching `EXPLORE_ROUTES`' shape. (`future.routes.ts`; spec "mirrors
      EXPLORE_ROUTES: one component-less grouping route with the overview as its '' child" and
      "provides the ECharts core at route level".)
- [x] The sidebar shows a "Future" item linking to `/future`, marked active on that route, with its
      icon registered alongside the existing ones. (`app-shell.component.html` + `tablerTargetArrow`
      in `provideIcons`; `app-shell.component.spec.ts` asserts the Insights group is exactly
      `['/dashboard','/income','/recurring','/explore','/future']` and that the item is labelled
      "Future" with an icon. Active state observed live — see below.)
- [x] The page injects no `RangeStore` and shows no range picker, and the caption saying the page
      looks forward from today is present. (Spec "never touches RangeStore" spies on
      `RangeStore.from`/`.to` and asserts neither is called while the component renders; "shows no
      range picker at all" asserts no `mm-range-grouping-switcher`/`mm-date-range-input`; the
      caption text is asserted verbatim.)
- [x] Component is standalone + `OnPush`, exported through the feature's components barrel like its
      Explore siblings. (`future-overview.component.ts`; `components/index.ts` → `index.ts`.)
- [x] Unit tests cover: the route resolving to the component; the nav item's `routerLink` and
      active state; the absence of any `RangeStore` injection; the standfirst/caption rendering.
      (9 cases across `future.routes.spec.ts` and `future-overview.component.spec.ts`, plus the two
      updated `app-shell.component.spec.ts` cases.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched — the new route is lazy and adds nothing to `initial`. (Lint clean;
      2786 tests / 255 files green; dev build completed. `angular.json` is not in the diff.)
- [x] Verified live in the browser: the nav item appears, `/future` loads, and no console error is
      logged. (Dev server on 4210, navigated to `/future`: the page renders its header, standfirst,
      caption and empty state; the sidebar shows **Future** last in *Insights* — between Explore
      and the Data group's Accounts — highlighted as the active item; `read_console_messages`
      returned no errors.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, zero findings of any kind, introduced or inherited. Per the conventions
      skill's Insights-group rule the page also carries `mm-privacy-toggle` in its header's end
      slot from the start, though it has no figures to blur until FUT-05.)

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
