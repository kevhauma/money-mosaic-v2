# TICKET-STAT-08 — Biggest individual transactions

- **Area:** Statistics & Dashboard
- **Type:** Feature (suggestion, added during v1.3 scoping)
- **Traceability:** adds FR-STAT-12 (new)

## User story

As a user, I want to see my largest individual transactions for the selected range, so a one-off big expense doesn't hide inside a category total.

## Description

A category total can hide a single large outlier (e.g. one €800 appliance purchase inside an otherwise-modest "Home" category). Surface the top N (e.g. 5) largest individual expense transactions in the selected range as their own list, independent of category.

## Current situation (as-is)

- All existing dashboard aggregates (`computePeriodStats`, `computeCategoryBreakdown`) only ever *sum* transactions — no existing helper surfaces individual outliers.

## Desired result (to-be)

- A new pure helper `computeTopTransactions(transactions, from, to, ownSavingsIbans, limit = 5)` in `core/stats/top-transactions.ts`: filters to in-range, non-transfer, non-savings-movement, negative-amount (expense) transactions, sorts by `Math.abs(amount)` descending, returns the top `limit` with their category (for the badge/colour) already resolved.
- Dashboard shows this as a compact list (date, counterparty/description, category badge, amount), each row linking straight to that single transaction (reusing the existing transaction-drilldown query params, scoped tightly enough — e.g. via a transaction id filter if the transactions list supports one, otherwise the row links to `/transactions` filtered to that category + a `[from,to]` narrowed to the transaction's own date — whichever the existing transactions-list filter UI already supports; no new filter capability should be built just for this).
- Placed on the dashboard grid near `category-breakdown-panel`/`category-comparison-panel` ([TICKET-STAT-04](./TICKET-STAT-04-category-period-comparison.md)).

## Acceptance criteria

- [ ] `computeTopTransactions()` excludes transfers and savings movements using the same predicates as `computePeriodStats`/`computeCategoryBreakdown` — no re-implementation.
- [ ] Sorted strictly by absolute amount descending; ties broken by date (documented, tested).
- [ ] `limit` is a named constant/parameter, not a hard-coded `5` scattered across the component.
- [ ] Each row links to the underlying transaction using only existing transactions-list filter/query-param capability (confirm what the transactions list already supports before adding new filter params — check [feature-transactions](../../../src/app/feature-transactions) rather than assuming).
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: the top-5 list matches manual inspection of the largest expense transactions in the selected range, and each row navigates correctly.

## Notes

- Deliberately expense-only for v1.3 (matches the product ask); a symmetric "biggest income transactions" view is easy to add later with the same helper if requested, but isn't part of this ticket's acceptance criteria.
