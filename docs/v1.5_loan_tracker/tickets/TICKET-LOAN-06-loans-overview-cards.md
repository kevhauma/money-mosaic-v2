# TICKET-LOAN-06 — Loans overview cards

- **Area:** Loans
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

- [ ] Overview lists every active loan as a card with a type badge, progress bar, remaining balance, and projected payoff date.
- [ ] `LoansStore.progressById` is a computed (no manual subscription/effect wiring) that recomputes when transactions or loans change.
- [ ] Archived loans are excluded from the overview (consistent with `activeAccounts`/`activeCategories`).
- [ ] A mortgage-type and a non-mortgage-type loan render with identical layout/styling apart from the badge text.
- [ ] Empty state shown with zero loans.
- [ ] Clicking a card navigates to `/loans/:id`.
- [ ] Unit tests cover: `progressById` computed with 0/1/2 loans (mixed types) and transactions spanning multiple categories.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: create a mortgage-type and an auto-type loan linked to different categories, add categorized transactions to one, confirm its progress bar and balance update while the other stays at 0%, and both badges render correctly.

## Notes

- `/loans/:id` routing is introduced here since it's the natural place a card needs to link to; LOAN-07 is
  the first ticket to render real content on that detail route (initially a placeholder shell, same
  pattern as `AccountsDetailComponent` before its chart/panels existed).
