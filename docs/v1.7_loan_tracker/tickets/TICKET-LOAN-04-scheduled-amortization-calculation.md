# TICKET-LOAN-04 — Scheduled amortization calculation

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-4 (new)

## User story

As a user, I want the app to compute the theoretical monthly payment schedule for any loan's stated terms,
so I have a baseline to compare my actual payments against — the same math whether it's a mortgage or a
car loan.

## Description

A pure function that turns `{ principal, interestRate, termMonths, startDate }` into a month-by-month
amortization schedule (payment, interest portion, principal portion, remaining balance) using the standard
fixed-rate loan formula. No transaction data involved, and no `loanType` parameter at all — this is the
textbook schedule only, identical for every loan type.

## Current situation (as-is)

- `core/stats/` ([period-stats.ts](../../../src/app/core/stats/period-stats.ts),
  [net-worth-trend.ts](../../../src/app/core/stats/net-worth-trend.ts)) is the existing precedent for
  TestBed-free pure aggregation functions with a co-located `*.spec.ts`.
- No `core/loans/` folder exists yet.

## Desired result (to-be)

- New `core/loans/amortization.ts`:
  ```ts
  export type AmortizationEntry = {
    month: number; // 1-indexed
    date: string; // ISO yyyy-mm-dd, startDate + month
    payment: number;
    principalPortion: number;
    interestPortion: number;
    remainingBalance: number;
  };

  // Deliberately takes only principal/rate/term/startDate — no `loanType` parameter, since the
  // amortization math is identical for every loan type.
  export function computeAmortizationSchedule(
    principal: number,
    annualInterestRatePercent: number,
    termMonths: number,
    startDate: string,
  ): AmortizationEntry[];
  ```
- Standard formula: `monthlyRate = annualInterestRatePercent / 100 / 12`; fixed monthly payment =
  `principal * monthlyRate / (1 - (1 + monthlyRate) ** -termMonths)` when `monthlyRate > 0`, else
  `principal / termMonths` for a 0% loan. Each entry's `interestPortion = remainingBalance * monthlyRate`,
  `principalPortion = payment - interestPortion`, next `remainingBalance = remainingBalance -
  principalPortion` (clamped to 0 on the final month to absorb rounding drift).
- Exported through a new `core/loans/index.ts` barrel.

## Acceptance criteria

- [ ] `computeAmortizationSchedule` returns exactly `termMonths` entries, the last of which has `remainingBalance === 0`.
- [ ] Handles a 0% interest rate (pure linear amortization) without dividing by zero.
- [ ] Function signature takes no `loanType`/mortgage-specific parameter of any kind.
- [ ] Unit tests cover: a known textbook mortgage example and a known textbook auto-loan example (different principal/rate/term, same function — proving type-agnosticism), a 0% rate loan, a 1-month term, and that `sum(principalPortion) === principal` (within floating-point tolerance).
- [ ] No TestBed — pure function, co-located `amortization.spec.ts`.
- [ ] Verified via the fallow skill.

## Notes

- This ticket has no UI and no transaction dependency — safe to build in parallel with LOAN-02/LOAN-03
  once LOAN-01's `Loan` type exists.
- Deliberately fixed-rate, monthly-only — see "Considered, not ticketed yet" in the version overview for
  variable-rate and non-monthly frequency, both explicitly deferred, for every loan type equally.
