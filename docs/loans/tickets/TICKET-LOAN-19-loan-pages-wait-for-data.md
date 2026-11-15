# TICKET-LOAN-19 — The loans pages wait for their data

- **Area:** Loans
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-14, part ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-LOAN-2 (loans page), FR-LOAN-6 (cards), FR-LOAN-5/10 (progress and schedule badge); TICKET-SRV-06 (hydration states)

## User story

As someone opening my loans, I want the page to show it's loading, or that loading failed, instead of "no loans", "Loan not found" or "0% paid", so I never read a wrong figure as fact.

## Description

`/loans` and `/loans/:id` render straight from the stores' starting values. Before the data arrives, and for good if a load fails, they show an empty or wrong state that looks real. Other pages solved this with `hydrationOf` and `mm-hydration-boundary`; the loans pages don't use them.

## Current situation (as-is)

- [`loans-overview.component.html`](../../../src/app/feature-loans/components/loans-overview/loans-overview.component.html) line 8 branches on `loanCards().length === 0` only. While `LoansStore` loads, or after its load fails, the page shows the "no loans" empty state, with no retry and no error.
- [`loan-detail.component.html`](../../../src/app/feature-loans/components/loan-detail/loan-detail.component.html) lines 67–71 show "Loan not found" whenever `loan()` is undefined ([`loan-detail.component.ts`](../../../src/app/feature-loans/components/loan-detail/loan-detail.component.ts) line 76 looks the id up in `loansStore.loans()`). Reloading `/loans/5` flashes it. A failed load keeps it.
- Cards and the detail figures come from [`LoansStore.progressById`](../../../src/app/feature-loans/loans.store.ts) over `TransactionsStore.transactions()`, with no wait for transactions. Before they arrive, each card reads "0% paid off" and "On schedule". If the transactions load fails, that stays.
- Pages that already gate: income ([`income-overview.component.ts`](../../../src/app/feature-income/components/income-overview/income-overview.component.ts) line 166, `hydrationOf(...)`), and the dashboard, accounts and transactions pages via `mm-hydration-boundary`.

## Desired result (to-be)

- `/loans` wraps its cards and empty state in `mm-hydration-boundary`, fed by `hydrationOf(loansStore, transactionsStore)`. The page shows a skeleton while either loads, an error with Retry if either fails, and the empty state only once both have loaded and there really are no loans.
- `/loans/:id` does the same. "Loan not found" only shows after a successful load that has no such loan.
- The header's "Add loan" button stays usable, as the empty state's does on other pages.

## Acceptance criteria

- [ ] While `LoansStore` is loading, `/loans` shows a skeleton, not the empty state.
- [ ] If `LoansStore` or `TransactionsStore` fails to load, `/loans` shows the error and a Retry button. Retry re-reads only the store that failed (`hydrationOf` behaviour).
- [ ] While transactions are loading, no card shows "0% paid off" or a schedule badge.
- [ ] Reloading `/loans/5` for an existing loan never shows "Loan not found". With a failed load it shows the error and Retry, not "Loan not found".
- [ ] `/loans/999` (no such loan, both stores loaded) still shows "Loan not found".
- [ ] Component specs cover loading, error and loaded states for both pages.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: reloading `/loans` and `/loans/:id` shows a skeleton, then the real figures, and never the empty or "not found" state first. With the API stopped, both pages show the error with Retry.

## Notes

- The review describes the cards as flashing "0% paid, behind schedule". In the code, a loan with no payments yet reads "On schedule": `computeScheduleComparison` returns 0 months ahead when `lastPaymentDate` is null. The wrong state is "0% paid off · On schedule", which is still wrong.
- The dashboard's half of CR6-14 is TICKET-NG-11, and the future page's half is TICKET-FUT-12.
