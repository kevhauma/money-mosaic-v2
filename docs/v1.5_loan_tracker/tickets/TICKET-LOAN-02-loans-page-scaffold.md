# TICKET-LOAN-02 — Dedicated Loans page

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-2 (new)

## User story

As a user, I want a dedicated Loans page (its own nav item, its own store), so tracking payoff progress
for any loan — mortgage, auto, personal, or otherwise — isn't squeezed into Accounts or Transactions.

## Description

Scaffold a new top-level routed feature, `/loans`, mirroring how `feature-income` was scaffolded in v1.4
(TICKET-INC-01) — page shell only. Every later FR-LOAN ticket builds a panel onto this page.

## Current situation (as-is)

- [app.routes.ts](../../../src/app/app.routes.ts) lazy-loads five features (`dashboard`, `accounts`,
  `transactions`, `import`, `categories`); no loans entry exists.
- The sidebar nav ([app.html](../../../src/app/app.html)) lists `<li>` items with `routerLink` + `ng-icon`
  under `#dashboard`, `#accounts`, `#transactions`, `#categories`, `#import`; no Loans item.
- No `feature-loans/` folder exists. `feature-accounts/` ([accounts.store.ts](../../../src/app/feature-accounts/accounts.store.ts)) is the closest shape to mirror: `signalStore({ providedIn: 'root' })`, `withEntities`, `withArchivable`, `withComputed`, `withMethods`.

## Desired result (to-be)

- New `feature-loans/` module: `loans.routes.ts`, `loans.store.ts` (`@ngrx/signals`, `providedIn: 'root'`,
  `withEntities` + `withArchivable<Loan>()` for `loans`/`activeLoans`/`archivedLoans`, injecting
  `LoansRepository` for `hydrate`/`addLoan`/`updateLoan`/`removeLoan`, plus `archiveLoan`/`unarchiveLoan`),
  `index.ts` barrel, `components/loans-overview/loans-overview.component.{ts,html}` as the page container
  (placeholder content for this ticket — LOAN-06 fills it in).
- `app.routes.ts` gets a new lazy entry: `path: 'loans'` →
  `import('@/feature-loans').then((m) => m.LOANS_ROUTES)`.
- `app.html` sidebar gets a new `<li>` (`routerLink="/loans"`, an unused Tabler icon already available via
  `@ng-icons/tabler-icons` and generic enough to cover any loan type — e.g. `tablerReceipt2` rather than a
  house-specific icon — label "Loans"), placed after Accounts.
- `app.config.ts`'s `provideAppInitializer` hydrates `LoansStore` alongside the other stores.

## Acceptance criteria

- [ ] `/loans` route resolves and renders `LoansOverviewComponent` via lazy `loadChildren`.
- [ ] Sidebar shows a "Loans" nav item that highlights via `routerLinkActive` when active.
- [ ] `LoansStore` is `providedIn: 'root'`, uses `withArchivable<Loan>()`, and only reaches persistence through `LoansRepository` (no direct `appDb` access).
- [ ] `LoansStore.hydrate()` is called from `app.config.ts`'s initializer, consistent with the other stores.
- [ ] Cross-feature imports of `LoansStore`/components go through `@/feature-loans`'s barrel only.
- [ ] No file, class, selector, or route in this feature is named "mortgage" — folder, store, and route are all "loan(s)".
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: clicking "Loans" in the sidebar navigates to `/loans` and the page renders without console errors.

## Notes

- Intentionally page-shell-only — LOAN-03 through LOAN-11 each assume this route/store exist and add
  their own panel onto `LoansOverviewComponent`. Build first (after LOAN-01).
- Icon and nav label say "Loans," not "Mortgage" — the sidebar entry must not imply mortgage-only scope,
  since a user with only a car loan should still recognise it as the right place to go.
