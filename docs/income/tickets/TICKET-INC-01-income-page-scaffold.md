# TICKET-INC-01 — Dedicated Income page

- **Area:** Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
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
- `IncomeStore` injects ~~`TransactionsStore`/~~`CategoriesStore` from `@/core/state` and exposes `incomeCategories = computed(() => categoriesStore.activeCategories().filter(c => c.kind === 'income'))` — the shared read every later FR-INC ticket builds on.

> **Implementation note, 2026-07-30 (TICKET-INC-01).** `TransactionsStore` was **not** injected. Nothing in this ticket's scope reads a transaction — `incomeCategories` derives from `CategoriesStore` alone — so injecting it would have been an unused dependency, which is exactly what `fallow` flags. TICKET-INC-02 is the first ticket with a real per-transaction series to compute, and injects it then.
>
> Relatedly, `IncomeOverviewComponent` does **not** inject `IncomeStore` yet, for the same reason: the placeholder empty state reads nothing. The store is proven by `income.store.spec.ts` rather than by page wiring. `IncomeStore`'s export therefore carries a `// fallow-ignore-next-line unused-export` with a comment pointing at INC-02 — that suppression goes stale (and fallow reports it) the moment the first panel imports the store, which is the signal to delete it.

## Acceptance criteria

- [x] `/income` route resolves and renders `IncomeOverviewComponent` via lazy `loadChildren` as a child of the `AppShellComponent` layout route, consistent with the other in-app features. (`app.routes.ts` — `path: 'income'` → `import('@/feature-income').then(m => m.INCOME_ROUTES)`, added as the second child of the shell layout route; `income.routes.ts` lazy-`loadComponent`s `IncomeOverviewComponent`. Live: clicking the nav item put `location.pathname` at `/income` and rendered the page inside the shell, sidebar and topbar intact — see screenshot evidence on the last criterion.)
- [x] Sidebar shows an "Income" nav item that highlights via `routerLinkActive="menu-active"` when active, reusing the shared `navItemClass` (`NAV_ITEM_CLASS`) rather than re-authoring its utility string. (`app-shell.component.html` — new `<li>` after Dashboard, before Accounts, binding `[class]="navItemClass"`; icon `tablerTrendingUp` added to the existing `provideIcons({...})` map in `app-shell.component.ts`. Live on `/income`, the anchor's resolved `className` was `"[&.menu-active]:bg-primary/15 [&.menu-active]:font-semibold [&.menu-active]:text-primary mm-nav-item rounded-field text-base-content/70 transition-colors menu-active"` — i.e. `menu-active` applied *and* the `mm-nav-item` theme hook present, both inherited from `NAV_ITEM_CLASS`.)
- [x] `IncomeStore` is `providedIn: 'root'`, follows the store-injects-repository/other-stores pattern (no direct `appDb` access), imports its collaborator stores from `@/core/state`, and exposes `incomeCategories`. (`income.store.ts` — `signalStore({ providedIn: 'root' })` + `withComputed` injecting `CategoriesStore` from `@/core/state`; no repository/`appDb` import at all, since every figure it exposes is derived. `income.store.spec.ts` covers `incomeCategories`: keeps only `kind: 'income'`, excludes archived income categories, empty when there are none — 3 tests, all passing.)
- [x] Cross-feature imports of `IncomeStore`/components go through `@/feature-income`'s barrel only. (`index.ts` re-exports `income.routes` / `income.store` / `components`; the single cross-feature consumer is `app.routes.ts`, which imports `@/feature-income`. `ng lint` clean and `fallow audit` reports 0 boundary violations.)
- [x] `angular.json` bundle budgets are not raised. (`angular.json` untouched — not in `git status`. `ng build --configuration development` emitted no budget warnings, and the feature landed in a lazy chunk rather than the initial bundle.)
- [x] Verified live in the browser: clicking "Income" in the sidebar navigates to `/income` and the page renders without console errors. (Dev server on port 4210. Clicked the sidebar "Income" item from `/dashboard`; URL became `/income`, page rendered the "Income" header + "Nothing to show here yet" empty state, and `read_console_messages(onlyErrors: true)` returned no logs. Screenshot captured.)

## Notes

- Intentionally page-shell-only — FR-INC-02 through FR-INC-11 each assume this route/store exist and add their own panel onto `IncomeOverviewComponent`. Build first.
- Use a `@ng-icons/tabler-icons` icon (the pack already in use) added to `app-shell.component.ts`'s existing `provideIcons({...})` map — no new icon dependency for this nav item.
- The shell's sidebar is styled by the v1.9 Deformable UI design language (`mm-nav-item` hook class on every nav `<a>`, per [docs/releases/v1.9_deformable_ui_redesign/design-language.md](../../releases/v1.9_deformable_ui_redesign/design-language.md) §7); binding `[class]="navItemClass"` is what keeps the new item themed identically across all theme styles.
