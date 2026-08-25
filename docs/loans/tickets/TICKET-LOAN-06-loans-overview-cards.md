# TICKET-LOAN-06 — Loans overview cards

- **Area:** Loans
- **Released in:** [v1.7 Loan tracker](../../releases/v1.7_loan_tracker/overview.md)
- **Type:** Feature
- **Traceability:** adds FR-LOAN-6 (new)

## User story

As a user, I want to see all my loans at a glance — clearly labelled by type — with a payoff progress bar,
so I immediately know how far along each one is without opening a detail page, and can tell my mortgage
apart from my car loan at a glance.

## Description

Fill in `LoansOverviewComponent`'s placeholder (LOAN-02) with a card per active loan: type badge, name,
progress bar (`percentPaidOff`), remaining balance, and projected payoff date, each linking to its detail
page (LOAN-07 onward).

## Current situation (as-is)

- [accounts-overview.component.ts](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.ts)
  is the closest precedent: a card-per-entity list reading a `withArchivable` store's `activeAccounts`,
  each card linking to `/accounts/:id`.
- `shared/ui/badge/badge.component.ts` is the existing badge primitive — reuse it for the `loanType` label
  rather than inventing a new chip component.
- `LoansOverviewComponent` (LOAN-02) currently renders placeholder content only.
- `computeLoanProgress` (LOAN-05) and `computeAmortizationSchedule` (LOAN-04) exist but nothing calls them
  from a component yet.

## Desired result (to-be)

- `LoansOverviewComponent` lists `LoansStore.activeLoans()` as cards (reusing `mm-stat-card` / daisyUI
  `card` patterns already used in `feature-accounts`), each showing:
  - A `BadgeComponent` labelling the loan's `loanType` (Mortgage/Auto/Personal/Student/Other) — every type
    rendered with the same visual treatment, no type given special prominence.
  - Loan name.
  - A progress bar (daisyUI `progress`) at `percentPaidOff * 100`.
  - Remaining balance (`SignedAmountPipe` or plain currency formatting, matching existing conventions).
  - Projected payoff date — LOAN-04's scheduled final date for now; LOAN-10 later adds the ahead/behind
    delta on top.
  - Click-through to `/loans/:id` (route added in this ticket, detail component is LOAN-07's placeholder
    until LOAN-07/08/09/10 fill it in).
- Each loan's progress is computed via a store-level computed, `progressById: computed(() =>
  Map<loanId, LoanProgress>)`, added to `LoansStore` (LOAN-02), which filters
  `TransactionsStore.transactions()` by each loan's `categoryId` and calls `computeLoanProgress`.
- Optionally groupable/filterable by `loanType` if the list grows long — a simple filter row above the
  cards, not a requirement for the initial pass but a natural place for it given `loanType` already exists.
- `EmptyStateComponent` shown when there are no loans yet, with the "Add loan" CTA from LOAN-03.

## Acceptance criteria

- [x] Overview lists every active loan as a card with a type badge, progress bar, remaining balance, and projected payoff date. (`loans-overview.component.html`'s `loanCards()` grid of `<app-loan-card>`; `loan-card.component.html`; confirmed live below.)
- [x] `LoansStore.progressById` is a computed (no manual subscription/effect wiring) that recomputes when transactions or loans change. (`loans.store.ts` — a `withComputed` block, plain `computed()` over `store.loans()` + `TransactionsStore.transactions()`; `loans.store.spec.ts`'s "recomputes when a new loan is added, with no manual subscription wiring" test.)
- [x] Archived loans are excluded from the overview (consistent with `activeAccounts`/`activeCategories`). (`loans-overview.component.ts`'s `loanCards` reads `activeLoans()`, not `loans()`; `loans-overview.component.spec.ts`'s "renders one card per active loan, excluding archived ones".)
- [x] A mortgage-type and a non-mortgage-type loan render with identical layout/styling apart from the badge text. (`loan-card.component.spec.ts`'s "renders identical layout for a mortgage and a non-mortgage loanType" — innerHTML diffed with type/name words stripped.)
- [x] Empty state shown with zero loans. (`loans-overview.component.html` — `@if (loanCards().length === 0)`; unchanged from LOAN-02/03's placeholder branch, still covered by `loans-overview.component.spec.ts`.)
- [x] Clicking a card navigates to `/loans/:id`. (`loan-card.component.html` — `[routerLink]="['/loans', vm().loan.id]"`; `loan-card.component.spec.ts`'s href check; confirmed live below via a real DOM click.)
- [x] Unit tests cover: `progressById` computed with 0/1/2 loans (mixed types) and transactions spanning multiple categories. (`loans.store.spec.ts`'s "LoansStore: progressById" block — empty map, single loan, two loans with mixed `loanType`s matched to their own `categoryId` plus an unrelated-category transaction, and the recompute-on-add case.)
- [x] Verified via the fallow skill and coding-conventions skill. (`ng lint`/`ng test`/`ng build --configuration development` all pass; `npx fallow health --complexity ...` exits clean; `npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` exits 0 — `amortization.ts`/`loan-progress.ts`/`LoansRepository` now have real consumers, so no baseline update was even needed this time. No coding-conventions violations found.)
- [x] Verified live in the browser: create a mortgage-type and an auto-type loan linked to different categories, add categorized transactions to one, confirm its progress bar and balance update while the other stays at 0%, and both badges render correctly. (`preview_start` on `dev`; the "Home mortgage"/"Car loan" test loans from LOAN-03 already had real dev-seed transactions in their linked categories and showed 2%/1% paid off with real balances; added a third "Student loan" on the untouched Health category, which rendered at exactly 0% paid off / €10,000.00 remaining while the other two kept their real progress — all three badges (Mortgage/Auto/Student) rendered correctly; clicking "Home mortgage" navigated to `/loans/1`, which resolved the LOAN-07 placeholder shell showing "Home mortgage" in its header, no console errors.)

## Notes

- `/loans/:id` routing is introduced here since it's the natural place a card needs to link to; LOAN-07 is
  the first ticket to render real content on that detail route (initially a placeholder shell, same
  pattern as `AccountsDetailComponent` before its chart/panels existed).
