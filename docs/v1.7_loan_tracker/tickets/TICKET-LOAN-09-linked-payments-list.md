# TICKET-LOAN-09 — Linked payments list on loan detail

- **Area:** Loans
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

- [ ] Lists every transaction in the loan's linked category, most recent first.
- [ ] Empty state shown when the linked category has no transactions yet.
- [ ] Clicking a row navigates to `/transactions` scoped to that transaction via the existing drilldown-params helper.
- [ ] List updates reactively when a new transaction is categorized into the linked category (no manual refresh).
- [ ] Unit tests cover: the filtering/sorting computed with 0/1/many matching transactions, and transactions in other categories are excluded, across at least two different loan types.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: categorize a new transaction into a loan's linked category, confirm it appears in this list without a page reload.

## Notes

- Fairly independent of LOAN-07/08 — only needs LOAN-01 (loan entity) and the existing
  `TransactionsStore`; can be slotted in any time after LOAN-02's route exists.
