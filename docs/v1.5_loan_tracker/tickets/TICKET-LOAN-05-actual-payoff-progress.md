# TICKET-LOAN-05 — Actual payoff progress from linked transactions

- **Area:** Loans
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

- [ ] With payments exactly matching LOAN-04's scheduled amounts and dates, `computeLoanProgress`'s `actualBalance` matches the schedule's `remainingBalance` at that point (within floating-point tolerance) — verified for at least a mortgage-type and an auto-type loan.
- [ ] An overpayment (a payment larger than the scheduled amount) reduces `actualBalance` below the schedule's value at the same date, regardless of `loanType`.
- [ ] No payments yet → `actualBalance === loan.principal`, `percentPaidOff === 0`.
- [ ] Payments summing to more than the principal don't drive `actualBalance` negative.
- [ ] Unit tests cover: on-schedule payments, an overpayment, a missed/skipped period (gap longer than a month), and zero payments.
- [ ] No TestBed — pure function, co-located `loan-progress.spec.ts`.
- [ ] Verified via the fallow skill.

## Notes

- Callers (LOAN-06/07/09/10) are responsible for filtering `TransactionsStore.transactions()` down to a
  given loan's `categoryId` before calling this — the function itself takes a pre-filtered list to stay
  pure and easy to test, matching the `core/stats/` convention of accepting already-scoped data.
- Deliberately does not exclude linked transfers — a loan-payment category is not expected to overlap with
  transfer-linked transactions, unlike income/expense stats which do exclude them.
