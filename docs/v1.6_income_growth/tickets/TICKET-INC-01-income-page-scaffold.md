# TICKET-INC-01 — Dedicated Income page

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-1 (new)

## User story

As a user, I want a dedicated Income page (its own nav item, its own store), so tracking how my income moves over time isn't squeezed into the general dashboard alongside expenses.

## Description

Scaffold a new top-level routed feature, `/income`, so income tracking gets its own page and nav entry instead of living on the dashboard. Every other FR-INC ticket builds a panel onto this page.

## Current situation (as-is)

- No `feature-income/` folder exists; income data currently only surfaces via the dashboard's lumped income stat card ([period-stats.ts](../../../src/app/core/stats/period-stats.ts)), the category breakdown ([category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)), and the trend chart's top-5 income series ([category-composition-trend.ts](../../../src/app/core/stats/category-composition-trend.ts)).
- [app.routes.ts](../../../src/app/app.routes.ts) no longer holds a flat feature list: the landing page (`@/feature-home`) is a sibling route, and every in-app feature is a lazy child of the `AppShellComponent` layout route — currently ten (`dashboard`, `accounts`, `transactions`, `import`, `categories`, `learning`, `help`, `changelog`, `settings`). No Income entry exists.
- The sidebar nav has moved out of [app.html](../../../src/app/app.html) (now just `<router-outlet />`) into [app-shell.component.html](../../../src/app/core/layout/app-shell/app-shell.component.html) — `<a routerLink=… routerLinkActive="menu-active" [class]="navItemClass">` items with an `<ng-icon>`, icons registered via `provideIcons({ tabler… })` in [app-shell.component.ts](../../../src/app/core/layout/app-shell/app-shell.component.ts). No Income item.
- Entity stores live in `@/core/state` (`AccountsStore`, `TransactionsStore`, `CategoriesStore`, `RangeStore`, `AppSettingsStore`) since TICKET-SOLID-05 — not in feature barrels.

## Desired result (to-be)

- New `feature-income/` module mirroring `feature-accounts/`'s shape: `income.routes.ts`, `income.store.ts` (`@ngrx/signals`, `providedIn: 'root'`), `index.ts` barrel, `components/income-overview/income-overview.component.{ts,html}` as the page container (placeholder content for this ticket — later FR-INC tickets fill it in).
- `app.routes.ts` gets an eleventh lazy child under the app-shell layout route: `path: 'income'` → `import('@/feature-income').then((m) => m.INCOME_ROUTES)`.
- `app-shell.component.html`'s sidebar gets a new `<li>` (`routerLink="/income"`, `routerLinkActive="menu-active"`, `[class]="navItemClass"`, an `<ng-icon>` whose Tabler icon is added to the existing `provideIcons({...})` map, label "Income"), placed after Dashboard and before Accounts — income-in is a top-level view, same tier as net worth.
- `IncomeStore` injects `TransactionsStore`/`CategoriesStore` from `@/core/state` and exposes `incomeCategories = computed(() => categoriesStore.activeCategories().filter(c => c.kind === 'income'))` — the shared read every later FR-INC ticket builds on.

## Acceptance criteria

- [ ] `/income` route resolves and renders `IncomeOverviewComponent` via lazy `loadChildren` as a child of the `AppShellComponent` layout route, consistent with the other in-app features.
- [ ] Sidebar shows an "Income" nav item that highlights via `routerLinkActive="menu-active"` when active, reusing the shared `navItemClass` (`NAV_ITEM_CLASS`) rather than re-authoring its utility string.
- [ ] `IncomeStore` is `providedIn: 'root'`, follows the store-injects-repository/other-stores pattern (no direct `appDb` access), imports its collaborator stores from `@/core/state`, and exposes `incomeCategories`.
- [ ] Cross-feature imports of `IncomeStore`/components go through `@/feature-income`'s barrel only.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: clicking "Income" in the sidebar navigates to `/income` and the page renders without console errors.

## Notes

- Intentionally page-shell-only — FR-INC-02 through FR-INC-11 each assume this route/store exist and add their own panel onto `IncomeOverviewComponent`. Build first.
- Use a `@ng-icons/tabler-icons` icon (the pack already in use) added to `app-shell.component.ts`'s existing `provideIcons({...})` map — no new icon dependency for this nav item.
- The shell's sidebar is styled by the v1.9 Deformable UI design language (`mm-nav-item` hook class on every nav `<a>`, per [docs/v1.9_deformable_ui_redesign/design-language.md](../../v1.9_deformable_ui_redesign/design-language.md) §7); binding `[class]="navItemClass"` is what keeps the new item themed identically across all theme styles.
