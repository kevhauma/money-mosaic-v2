# TICKET-INC-01 — Dedicated Income page

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-1 (new)

## User story

As a user, I want a dedicated Income page (its own nav item, its own store), so tracking how my income moves over time isn't squeezed into the general dashboard alongside expenses.

## Description

Scaffold a new top-level routed feature, `/income`, so income tracking gets its own page and nav entry instead of living on the dashboard. Every other FR-INC ticket builds a panel onto this page.

## Current situation (as-is)

- No `feature-income/` folder exists; income data currently only surfaces via the dashboard's lumped income stat card ([period-stats.ts](../../../src/app/core/stats/period-stats.ts)) and category breakdown ([category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)).
- [app.routes.ts](../../../src/app/app.routes.ts) lazy-loads five features (`dashboard`, `accounts`, `transactions`, `import`, `categories`); no sixth entry exists.
- The sidebar nav ([app.html](../../../src/app/app.html)) lists five `<li>` items with `routerLink` + `ng-icon`; no Income item.

## Desired result (to-be)

- New `feature-income/` module mirroring `feature-accounts/`'s shape: `income.routes.ts`, `income.store.ts` (`@ngrx/signals`, `providedIn: 'root'`), `index.ts` barrel, `components/income-overview/income-overview.component.{ts,html}` as the page container (placeholder content for this ticket — later FR-INC tickets fill it in).
- `app.routes.ts` gets a sixth lazy entry: `path: 'income'` → `import('@/feature-income').then((m) => m.INCOME_ROUTES)`.
- `app.html` sidebar gets a new `<li>` (`routerLink="/income"`, a suitable `ng-icon`, label "Income"), placed after Dashboard and before Accounts — income-in is a top-level view, same tier as net worth.
- `IncomeStore` injects `TransactionsStore`/`CategoriesStore` and exposes `incomeCategories = computed(() => categoriesStore.activeCategories().filter(c => c.kind === 'income'))` — the shared read every later FR-INC ticket builds on.

## Acceptance criteria

- [ ] `/income` route resolves and renders `IncomeOverviewComponent` via lazy `loadChildren`, consistent with the other five features.
- [ ] Sidebar shows an "Income" nav item that highlights via `routerLinkActive` when active.
- [ ] `IncomeStore` is `providedIn: 'root'`, follows the store-injects-repository/other-stores pattern (no direct `appDb` access), and exposes `incomeCategories`.
- [ ] Cross-feature imports of `IncomeStore`/components go through `@/feature-income`'s barrel only.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: clicking "Income" in the sidebar navigates to `/income` and the page renders without console errors.

## Notes

- Intentionally page-shell-only — FR-INC-02 through FR-INC-11 each assume this route/store exist and add their own panel onto `IncomeOverviewComponent`. Build first.
- Pick an icon already registered in the app (e.g. reuse a Tabler icon already imported elsewhere) rather than introducing a new icon dependency just for this nav item.
