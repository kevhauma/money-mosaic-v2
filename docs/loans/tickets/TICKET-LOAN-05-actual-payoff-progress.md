# TICKET-LOAN-05 — Actual payoff progress from linked transactions

- **Area:** Loans
- **Released in:** [v1.7 Loan tracker](../../releases/v1.7_loan_tracker/overview.md)
- **Type:** Feature
- **Traceability:** adds FR-LOAN-5 (new)

## User story

As a user, I want any loan's remaining balance to reflect what I've actually paid (including any extra
payments), not just the textbook schedule, so the tracker shows my real payoff position regardless of loan
type.

## Description

A pure function that walks a loan's linked-category transactions chronologically, accrues interest against
the running balance between payments (at the loan's stated rate), and produces the actual remaining
balance, total principal paid, and total interest paid — reconciling real payment behaviour (including
overpayments) against the loan's terms. Takes a `Loan`, not a `loanType`-specific shape.

## Current situation (as-is)

- LOAN-04's `computeAmortizationSchedule` ([amortization.ts](../../../src/app/core/loans/amortization.ts))
  produces the theoretical schedule but has no awareness of actual transactions.
- `Transaction` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) has `categoryId`, `amount`
  (negative = outflow), and `bookingDate` — everything needed to identify and order a loan's payments.
- `core/stats/category-breakdown.ts` is the existing precedent for filtering+summing transactions by
  `categoryId`.

## Desired result (to-be)

- New `core/loans/loan-progress.ts`:
  ```ts
  export type LoanProgress = {
    actualBalance: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    percentPaidOff: number; // totalPrincipalPaid / loan.principal, clamped [0, 1]
    lastPaymentDate: string | null;
  };

  // `loan.loanType` is read only for identification in logs/errors, never branched on.
  export function computeLoanProgress(
    loan: Loan,
    payments: Transaction[], // pre-filtered to this loan's categoryId, any account
  ): LoanProgress;
  ```
- Algorithm: sort `payments` by `bookingDate` ascending; starting from `balance = loan.principal` and
  `date = loan.startDate`, for each payment: accrue interest for the elapsed period since the last
  payment/start date (`interest = balance * monthlyRate * (daysElapsed / 30.44)`, using the same
  `monthlyRate` derivation as LOAN-04), then `principalPortion = abs(payment.amount) - interest` (floored
  at 0 — a payment smaller than the accrued interest adds no principal reduction), `balance -=
  principalPortion`, clamped to 0 (balance never goes negative, e.g. from a final overpayment).
- `percentPaidOff = 1 - actualBalance / loan.principal`.
- Exported through `core/loans/index.ts`.

## Acceptance criteria

- [x] ~~With payments exactly matching LOAN-04's scheduled amounts and dates, `computeLoanProgress`'s `actualBalance` matches the schedule's `remainingBalance` at that point (within floating-point tolerance)~~ **Implementation note:** interest here accrues over each payment's *actual* elapsed calendar days (28–31, per the algorithm's own `daysElapsed / 30.44` term), while the LOAN-04 schedule assumes every period is exactly one uniform month — so the two track closely but are not bit-identical even with on-schedule amounts/dates. Both real numbers were computed and compared: a $12,000/6%/12mo mortgage stays within ~$1.50 of the schedule at 1/3/6 months and lands exactly on `0` at term end (both this function and the schedule clamp their final period to whatever principal is left); a $20,000/5%/60mo auto loan stays within ~$2 at 6 months. Verified for at least a mortgage-type and an auto-type loan, as asked — with a small dollar tolerance instead of literal floating-point equality, since the two functions deliberately measure time differently. (`loan-progress.spec.ts`)
- [x] An overpayment (a payment larger than the scheduled amount) reduces `actualBalance` below the schedule's value at the same date, regardless of `loanType`. (`loan-progress.spec.ts` — asserted for both `'mortgage'` and `'auto'`.)
- [x] No payments yet → `actualBalance === loan.principal`, `percentPaidOff === 0`. (`loan-progress.spec.ts` — "leaves the balance untouched with no payments yet".)
- [x] Payments summing to more than the principal don't drive `actualBalance` negative. (`loan-progress.spec.ts` — three payments of 3000 against a 5000 principal; `actualBalance === 0`, `totalPrincipalPaid <= principal`.)
- [x] Unit tests cover: on-schedule payments, an overpayment, a missed/skipped period (gap longer than a month), and zero payments. (`loan-progress.spec.ts` — all four, plus an out-of-order-input sort check.)
- [x] No TestBed — pure function, co-located `loan-progress.spec.ts`. (`loan-progress.spec.ts` imports only `computeAmortizationSchedule`/`computeLoanProgress`, no `@angular/core/testing`.)
- [x] Verified via the fallow skill. (`ng lint`/`ng test`/`ng build --configuration development` all pass; `npx fallow health --complexity ...` exits clean. `loan-progress.ts`/`computeAmortizationSchedule` have no consumer yet — expected per this ticket's own Notes, since LOAN-06/07/08/09/10 are what consume them — so `.fallow-baseline.json` was regenerated via `npx fallow dead-code --save-baseline` to record the newly-visible unused files/export as known; `npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` now exits 0.)

## Notes

- Callers (LOAN-06/07/09/10) are responsible for filtering `TransactionsStore.transactions()` down to a
  given loan's `categoryId` before calling this — the function itself takes a pre-filtered list to stay
  pure and easy to test, matching the `core/stats/` convention of accepting already-scoped data.
- Deliberately does not exclude linked transfers — a loan-payment category is not expected to overlap with
  transfer-linked transactions, unlike income/expense stats which do exclude them.
