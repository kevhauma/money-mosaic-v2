# TICKET-LOAN-12 — Forward-looking what-if projection engine

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-12 (new)

## User story

As a user, I want the app to be able to answer "what happens to this loan if I change how I pay it from
here on," so that a hypothetical extra payment or a lump sum has a real, computed answer instead of a
guess — for any loan type.

## Description

The pure math behind the what-if simulator: given a loan's **current actual position** (not its
origination), project the remaining payoff under a hypothetical scenario — a recurring extra monthly
amount, one-off lump sums, or both — and return the payoff date, months saved, and interest saved against
a do-nothing baseline. No UI in this ticket; LOAN-13 and LOAN-14 render it.

## Current situation (as-is)

- [amortization.ts](../../../src/app/core/loans/amortization.ts)'s `computeAmortizationSchedule` projects
  forward, but only from origination under the *original* terms — it takes `principal`, not "what I owe
  today," and has no notion of an extra payment. Its fixed-payment formula is inlined in the function body,
  not exported.
- [loan-progress.ts](../../../src/app/core/loans/loan-progress.ts) looks strictly **backwards**:
  `computeLoanProgress` reconciles real payments into an `actualBalance`, and `computeScheduleComparison`
  extrapolates a `projectedPayoffDate` by shifting the original schedule's end date by whole months. That
  shift assumes the user simply keeps doing whatever they have already been doing — it cannot answer "what
  if I paid €200 more per month starting next month."
- `computeScheduleComparison`'s `interestSavedEstimate` is a retroactive figure ("saved so far"), explicitly
  documented in [TICKET-LOAN-10](./TICKET-LOAN-10-ahead-behind-schedule-indicator.md)'s Notes as *not* a
  refinance/what-if calculation.
- The two existing accrual models differ deliberately: LOAN-04's schedule is flat-monthly, LOAN-05's actual
  reconciliation is day-based. A forward projection has no real payment dates to accrue between, so it
  belongs on the flat-monthly side.

## Desired result (to-be)

- `amortization.ts` exports the payment formula it already computes internally, as
  `scheduledMonthlyPayment(principal: number, annualInterestRatePercent: number, termMonths: number):
  number`, and `computeAmortizationSchedule` is reimplemented in terms of it — one formula, two callers,
  no drift (same pattern as `monthlyRateOf`).
- New pure module `core/loans/what-if.ts`, exported from [index.ts](../../../src/app/core/loans/index.ts):

  ```ts
  export type WhatIfLumpSum = { /** ISO `yyyy-mm-dd`; applied in the projected month containing it. */ date: string; amount: number };

  export type WhatIfScenario = {
    /** Extra principal per month on top of the scheduled payment, from the first projected month. `0` = none. */
    extraMonthlyPayment: number;
    /** One-off payments (LOAN-14). Empty by default. */
    lumpSums: WhatIfLumpSum[];
  };

  export type WhatIfOutcome = {
    payoffDate: string;
    monthsRemaining: number;
    totalInterest: number;
    balanceSeries: { date: string; balance: number }[];
  };

  export type WhatIfProjection = {
    /** Keep paying exactly the scheduled amount from today — the do-nothing comparison. */
    baseline: WhatIfOutcome;
    scenario: WhatIfOutcome;
    monthsSaved: number;
    interestSaved: number;
  };

  export function projectLoanWhatIf(loan: Loan, progress: LoanProgress, scenario: WhatIfScenario, fromDate: string): WhatIfProjection;
  ```

- The projection starts from `progress.actualBalance` at `fromDate` (the caller passes "today" — the
  function stays pure and never reads the clock), amortizes forward at `monthlyRateOf(loan.interestRate)`
  with the loan's `scheduledMonthlyPayment`, and runs until the balance reaches `0`.
- A month's payment is `scheduledMonthlyPayment + extraMonthlyPayment + (any lump sum dated in that month)`,
  always clamped so the final month pays exactly what is left — the balance can never go negative, and
  `totalInterest` never accrues past payoff.
- `monthsSaved` / `interestSaved` are `baseline − scenario`; both are `0` for an empty scenario, by
  construction rather than by special-casing.
- `loan.loanType` is not a parameter and never branches this math, consistent with every other `core/loans`
  function.

## Acceptance criteria

- [ ] `scheduledMonthlyPayment` is exported from `amortization.ts` and `computeAmortizationSchedule` uses it — the fixed-payment formula appears exactly once in the codebase.
- [ ] An empty scenario (`extraMonthlyPayment: 0`, no lump sums) yields `monthsSaved === 0` and `interestSaved === 0`, and its `scenario` outcome equals its `baseline` outcome.
- [ ] A recurring extra payment shortens `monthsRemaining` and lowers `totalInterest`, with `monthsSaved > 0` and `interestSaved > 0`.
- [ ] A single lump sum dated in a future month is applied in that month only, shortens the payoff, and never drives the balance below `0`.
- [ ] A lump sum dated *after* the projected payoff (or before `fromDate`) is ignored — no crash, no negative balance, no phantom saving.
- [ ] An extra payment larger than the remaining balance pays the loan off in that month, with the final payment clamped to exactly the remaining balance plus that month's interest.
- [ ] A `0%` loan projects linearly and terminates (no divide-by-zero, no infinite loop) — mirroring `computeAmortizationSchedule`'s own zero-rate branch.
- [ ] An already-paid-off loan (`progress.actualBalance <= 0`) returns `monthsRemaining: 0`, `payoffDate === fromDate`, and zero saving for any scenario.
- [ ] Identical figures for two different `loanType` values with the same underlying numbers, proving no type-specific branch exists.
- [ ] `balanceSeries` starts at `fromDate`/`progress.actualBalance` and ends at the payoff month with balance `0` — directly renderable by LOAN-13's chart without further massaging.
- [ ] Unit tests cover: empty scenario, recurring extra, single lump sum, lump sum past payoff, overpayment clamp, 0% rate, already-paid-off loan, and the two-`loanType` parity check.
- [ ] No TestBed — pure functions with a co-located `what-if.spec.ts`, same as `amortization.spec.ts`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **No schema change and no store writes.** The scenario is a hypothetical the user types in; it is not
  persisted anywhere (see LOAN-13's Notes for why ephemeral is the right call).
- Deliberately flat-monthly, not day-based: there are no real payment dates in the future to accrue
  between, so borrowing LOAN-05's day-based accrual would invent precision that does not exist. This means
  the projection's first month can differ by a few euro from a bank's own quote — the UI labels every
  figure as an estimate (LOAN-13/LOAN-14).
- The early-repayment fee is deliberately **not** modelled here — it is a cost applied *on top of* a lump
  sum, not part of the amortization walk. LOAN-14 adds it as a separate pure function so this engine stays
  a pure "where does the balance go" calculation.
- Prerequisite for LOAN-13 and LOAN-14; needs nothing beyond LOAN-04's and LOAN-05's shipped exports.
