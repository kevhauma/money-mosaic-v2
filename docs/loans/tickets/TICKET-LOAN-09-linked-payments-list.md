# TICKET-LOAN-09 — Linked payments list on loan detail

- **Area:** Loans
- **Released in:** [v1.7 Loan tracker](../../releases/v1.7_loan_tracker/overview.md)
- **Type:** Feature
- **Traceability:** adds FR-LOAN-9 (new)

## User story

As a user, I want to see the actual transactions that counted toward any loan's payoff, so I can verify
the tracker is picking up the right payments and jump to a transaction if something looks off.

## Description

A list on the Loan detail page showing every transaction in the loan's linked category, with a
click-through into the Transactions page filtered/scrolled to that transaction.

## Current situation (as-is)

- `buildTransactionDrilldownParams` ([shared/utils](../../../src/app/shared/utils)) is already used by
  `account-balance-chart.component.ts` to navigate from a chart point into `/transactions` with query
  params pre-filtering the list — same drill-down pattern needed here.
- `TransactionsStore.transactions()` is the source of truth; no new store/query needed beyond filtering by
  `categoryId`, which `CategoriesStore.transactionCountById` already demonstrates the pattern for.

## Desired result (to-be)

- `feature-loans/components/loan-payments-list/loan-payments-list.component.ts`: reads a `loan` input,
  computes `TransactionsStore.transactions().filter(t => t.categoryId === loan().categoryId)` sorted by
  `bookingDate` descending, and renders each as a row (date, amount, description/counterparty) reusing
  whatever row-rendering primitive the transaction list already uses for consistency.
- Each row links to `/transactions` with `buildTransactionDrilldownParams` scoped to that transaction (or
  at minimum to the category + date), matching the existing drill-down UX.
- Rendered on the Loan detail page (`/loans/:id`) as its own panel, listing the same payments LOAN-05 and
  LOAN-07 aggregate — this ticket is the "show your work" transparency view, and works identically
  regardless of `loanType`.

## Acceptance criteria

- [x] Lists every transaction in the loan's linked category, most recent first. (`loan-payments-list.component.ts`'s `rows` computed sorts `b.bookingDate.localeCompare(a.bookingDate)`; confirmed live below.)
- [x] Empty state shown when the linked category has no transactions yet. (`loan-payments-list.component.html`'s `@else` branch; `loan-payments-list.component.spec.ts`'s "shows an empty state with zero payments" test.)
- [x] Clicking a row navigates to `/transactions` scoped to that transaction via the existing drilldown-params helper. (`buildTransactionDrilldownParams({ from, to, accountId, categoryId })` per row — the `TopTransactionsPanelComponent` precedent, since there's no per-transaction-id filter; `loan-payments-list.component.spec.ts`'s exact-queryParams test.)
- [x] List updates reactively when a new transaction is categorized into the linked category (no manual refresh). (`rows` computed reads `TransactionsStore.transactions()` directly and filters by `loan().categoryId` itself — no store/query of its own to go stale; `loan-payments-list.component.spec.ts`'s "updates reactively when a transaction is categorized" test calls `TransactionsStore.updateTransaction` and confirms the row appears with no `detectChanges`-forced remount.)
- [x] Unit tests cover: the filtering/sorting computed with 0/1/many matching transactions, and transactions in other categories are excluded, across at least two different loan types. (`loan-payments-list.component.spec.ts` — zero/one/many cases, the many-payments case looped over `'mortgage'`/`'auto'` with a same-bookingDate cross-category transaction proven absent from the result.)
- [x] Verified via the fallow skill and coding-conventions skill. (`ng lint`/`ng test`/`ng build --configuration development` all pass; both fallow gates exit 0. No coding-conventions violations found.)
- [x] Verified live in the browser: categorize a new transaction into a loan's linked category, confirm it appears in this list without a page reload. (`preview_start` on `dev`; opened `/loans/1` — the four seeded "Vesta Rentals" rent payments showed, most-recent-first, no console errors. On `/transactions`, recategorized an uncategorized transfer leg ("Rainy Day Savings", €300, 2026-08-20) to Housing via the real category picker; navigated back to `/loans/1` via the app's own SPA routing (`<a>.click()`, no `location.href`/reload) and confirmed it now appeared at the top of the Linked payments list. Reverted the test transaction back to uncategorized afterward.)

## Notes

- Fairly independent of LOAN-07/08 — only needs LOAN-01 (loan entity) and the existing
  `TransactionsStore`; can be slotted in any time after LOAN-02's route exists.
