# TICKET-EXP-01 — Explore page (route, shell, nav, own date range)

- **Area:** Explore
- **Type:** Feature
- **Traceability:** new capability, adds **FR-EXP-1**. Follows the routed-feature precedent set by [TICKET-INC-01](../../v1.6_income_growth/tickets/TICKET-INC-01-income-page-scaffold.md) (Income page scaffold) and the per-page range precedent of [TICKET-UI-23](../../v1.6.2_interface_polish/tickets/TICKET-UI-23-per-page-date-range.md).

## User story

As someone who wants the big picture rather than a panel-sized summary, I want an Explore page in the sidebar with its own date range, so the large diagrams that don't fit a Dashboard row have somewhere to live without shrinking the Dashboard.

## Description

Scaffolds a new routed feature area — `/explore` → `feature-explore/` — with a page header, its own date range, an empty state, and a placeholder section the Sankey ([TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md)) and the 3D landscape ([TICKET-EXP-05](./TICKET-EXP-05-3d-spending-landscape.md)) render into. No chart of its own.

## Current situation (as-is)

- Every routed feature is a lazy child of the `AppShellComponent` layout route in [app.routes.ts](../../../src/app/app.routes.ts), loaded through its own barrel (`@/feature-income` → `INCOME_ROUTES`), with `provideEchartsCore({ echarts })` declared at route level so echarts stays in that feature's chunk ([income.routes.ts](../../../src/app/feature-income/income.routes.ts) is the closest model — a component-less grouping route with shared providers and lazy child components).
- Sidebar nav items are hand-written anchors in [app-shell.component.html:48-119](../../../src/app/core/layout/app-shell/app-shell.component.html), one `routerLink` per feature, each with an `ng-icon` and `routerLinkActive`.
- Date ranges are per page: `RangePageKey` is the closed union `'dashboard' | 'accounts'` with a parallel `RANGE_PAGE_KEYS` array at [range-state.store.ts:15-17](../../../src/app/core/state/range-state.store.ts), and its own doc comment states the contract — "Adding one here is the whole cost of giving a new page its own range." `pageRangeControl` ([page-range-control.ts](../../../src/app/core/state/page-range-control.ts)) is what a page binds to `mm-range-grouping-switcher`.
- The Dashboard's no-data branch ([dashboard-overview.component.html:29-37](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)) is the established empty-state shape: `mm-empty-state` with a title, message, icon and a `/import` call-to-action, gated on `TransactionsStore.hydrated()` — shipped by [TICKET-STAT-22](../../v2/tickets/TICKET-STAT-22-empty-dashboard-state.md).
- There is no `feature-explore/`, no `/explore` route, and no nav entry for one.

## Desired result (to-be)

- New `src/app/feature-explore/` containing `explore.routes.ts` (exporting `EXPLORE_ROUTES`), `index.ts` (barrel exporting the routes and anything cross-feature), and `components/explore-overview/`.
- `EXPLORE_ROUTES` mirrors `INCOME_ROUTES`' shape: a component-less `path: ''` grouping route carrying `providers: [provideEchartsCore({ echarts })]`, with the overview as a lazily-loaded child — so echarts lands in the Explore chunk, never in the main bundle.
- `app.routes.ts` gains `{ path: 'explore', loadChildren: () => import('@/feature-explore').then((m) => m.EXPLORE_ROUTES) }` inside the shell's `children`, and `tsconfig`'s `@/feature-explore` path alias resolves (the existing `@/*` mapping already covers it — confirm, don't add a bespoke alias).
- `RangePageKey` and `RANGE_PAGE_KEYS` gain `'explore'`; the page binds `pageRangeControl('explore')` to `mm-range-grouping-switcher` in an `mm-page-header`, exactly as the Dashboard does. The Explore range is independent of the Dashboard's, which is the whole point of the keyed store.
- A sidebar nav item "Explore" between "Income" and "Accounts", matching the existing anchors' markup (`routerLink`, `routerLinkActive="menu-active"`, `[class]="navItemClass"`, an `ng-icon` from the Tabler set already in use).
- The page renders `mm-empty-state` ("Nothing to explore yet" + `/import` CTA) when `TransactionsStore.hydrated() && transactions().length === 0`, matching TICKET-STAT-22's branch rather than inventing a second empty-state idiom.
- No store. Page-level chart state belongs to `ChartOptionsStore` (per-chart, session-scoped) and `RangeStore` (per-page); an `ExploreStore` is added only if a later ticket needs state shared *between* the page's sections — recorded here so its absence is a decision, not an omission.
- `app.routes.spec.ts` gains coverage that `/explore` resolves, following the existing route specs.

## Acceptance criteria

- [ ] `/explore` resolves to a lazily-loaded `feature-explore` chunk; the feature is imported only through its `@/feature-explore` barrel (no deep imports from other features).
- [ ] `provideEchartsCore({ echarts })` is declared at the Explore route level, not in the component and not globally; `ng build --configuration development` shows no echarts in the main bundle and `angular.json`'s budgets are unchanged.
- [ ] `RangePageKey` and `RANGE_PAGE_KEYS` both gain `'explore'`, and the page's range is independent of the Dashboard's (changing one leaves the other alone).
- [ ] The page header uses `mm-page-header` + `mm-range-grouping-switcher` bound to `pageRangeControl('explore')`.
- [ ] A sidebar "Explore" nav item routes to `/explore` and marks itself active, with markup consistent with the surrounding items.
- [ ] With zero transactions the page renders `mm-empty-state` with a working `/import` CTA, and does not render the (still empty) chart sections.
- [ ] No new Dexie table, no schema version bump, no `appSettings` field.
- [ ] Unit tests cover: the route resolving; the range isolation between `'explore'` and `'dashboard'`; the empty-state branch and the normal branch.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the nav item appears and navigates, the range switcher works and stays independent of the Dashboard's, and the empty state shows on a cleared database.

## Notes

- **Why a page and not more Dashboard rows.** The Sankey needs full width and a level control; the 3D landscape needs a large canvas and a camera. Both would dominate a Dashboard row and neither answers the Dashboard's "how am I doing in this period" question — they answer "where does my money actually go". The heatmap ([TICKET-STAT-29](./TICKET-STAT-29-spending-heatmap-panel.md)) is panel-sized and stays on the Dashboard, which is why this version splits across two homes.
- **Name.** "Explore" rather than "Money flow" so the 3D landscape and any later large diagram have a home that doesn't lie about its contents. The Sankey is nevertheless the page's headline section.
- Prerequisite for TICKET-EXP-02/03/04/05. Independent of TICKET-STAT-29/30.
