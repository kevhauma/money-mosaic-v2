# TICKET-LOAN-16 — Only real repayments count toward loan progress

- **Area:** Loans
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-3 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-LOAN-5 (actual payoff progress), FR-LOAN-6 (overview cards), FR-LOAN-7 (balance chart), FR-LOAN-9 (linked payments list), FR-LOAN-10 (ahead/behind)

## User story

As someone tracking a loan, I want only my actual repayments to count toward its progress, so a payout, a reversal or an old payment can't make it look paid off.

## Description

A loan's payments are every transaction in its category: incoming money, nullified rows and rows from before the loan started all count, and each one counts by its absolute amount. One payout tagged with the loan category shows the loan 100% repaid. The fix filters once, in the store, to outgoing, non-nullified rows on or after the start date, and every loan view reads that one list.

## Current situation (as-is)

- The same filter, `transaction.categoryId === loan.categoryId` and nothing else, is written three times:
  - [`LoansStore.progressById`](../../../src/app/feature-loans/loans.store.ts) (lines 57–68), which feeds the cards and the ahead/behind badge;
  - [`LoanDetailComponent.payments`](../../../src/app/feature-loans/components/loan-detail/loan-detail.component.ts) (lines 81–87), which feeds the balance chart and the what-if tab;
  - [`LoanPaymentsListComponent.rows`](../../../src/app/feature-loans/components/loan-payments-list/loan-payments-list.component.ts) (lines 46–52).
- [`accrueLoanPayments`](../../../src/app/core/loans/loan-progress.ts) (lines 46–78) takes `Math.abs(payment.amount)` (line 61) and accrues interest from `loan.startDate`. A row dated before the start gives negative elapsed days (lines 55–58), so negative interest and a principal portion larger than the payment.
- Examples:
  - A +€15,000 loan payout tagged with the loan category counts as a €15,000 repayment: 100% paid.
  - A bounced −€1,200 debit plus its +€1,200 reversal count as €2,400 paid.
- The loan form's duplicate-category check only looks at **active** loans ([`loan-form.component.ts`](../../../src/app/feature-loans/components/loan-form/loan-form.component.ts) lines 67–79, fed `activeLoans()`). A new loan in an archived loan's category inherits all the old loan's payments, and the start-date filter is what keeps those out.

## Desired result (to-be)

- `LoansStore` exposes one per-loan payments list (for example `paymentsById`), filtered to `categoryId === loan.categoryId`, `amount < 0`, `!nullified` and `bookingDate >= loan.startDate`.
- `progressById`, the detail page's chart and what-if, and the payments list all read that list. No component filters transactions itself.
- `computeLoanProgress` stays pure over the list it's given.

## Acceptance criteria

- [ ] A €20,000 loan starting 2026-01-01 with a +€15,000 row in its category shows 0% paid, and the row isn't in the payments list.
- [ ] A nullified −€1,200 row in the loan category doesn't count and isn't listed.
- [ ] A −€500 row dated 2025-12-15, before the 2026-01-01 start, doesn't count. No negative interest appears anywhere.
- [ ] Monthly −€450 repayments from 2026-02-01 count exactly as today (existing `loan-progress.spec.ts` and `loans.store` specs pass).
- [ ] A new loan created in an archived loan's category, starting 2026-06-01, shows none of the archived loan's earlier payments.
- [ ] The card, the detail page's balance chart and what-if, and the payments list all use the store's list (one filter, asserted by a store spec).
- [ ] Unit tests cover: a positive row, a nullified row, a pre-start row, a normal repayment, and the reused-category case.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: tag a positive transaction with a loan's category. The loan card's percentage and the payments list don't change.

## Notes

- A bounced debit and its reversal: the reversal (positive) is dropped, but the bounced debit still counts. The user nullifies the pair (TICKET-TXN-04) to remove both. Netting reversals against debits automatically can't tell a reversal from a payout, so it's out of scope.
- The review also cited `loan-progress.ts:152-158`. Those lines are `computeScheduleComparison`'s no-payment branch, which isn't involved. The bug lives in lines 46–78.
