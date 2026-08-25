# TICKET-LOAN-04 — Scheduled amortization calculation

- **Area:** Loans
- **Released in:** [v1.7 Loan tracker](../../releases/v1.7_loan_tracker/overview.md)
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

- [x] `computeAmortizationSchedule` returns exactly `termMonths` entries, the last of which has `remainingBalance === 0`. (`amortization.ts` — the loop runs `month` 1..`termMonths` and clamps the final month's balance to `0`; asserted in `amortization.spec.ts`'s mortgage/auto/0%/1-month cases.)
- [x] Handles a 0% interest rate (pure linear amortization) without dividing by zero. (`amortization.ts` — `monthlyRate > 0` branch falls back to `principal / termMonths`; `amortization.spec.ts`'s "0% interest rate" test asserts `interestPortion === 0` every month and the final balance is `0`.)
- [x] Function signature takes no `loanType`/mortgage-specific parameter of any kind. (`amortization.ts` — exactly `(principal, annualInterestRatePercent, termMonths, startDate)`, no `loanType`; asserted via `computeAmortizationSchedule.length === 4` in `amortization.spec.ts`.)
- [x] Unit tests cover: a known textbook mortgage example and a known textbook auto-loan example (different principal/rate/term, same function — proving type-agnosticism), a 0% rate loan, a 1-month term, and that `sum(principalPortion) === principal` (within floating-point tolerance). (`amortization.spec.ts` — $200k/6%/360mo mortgage ≈ $1199.10/mo, $20k/5%/60mo auto ≈ $377.42/mo, 0% case, 1-month case, and a principal-sum check within `toBeCloseTo` tolerance.)
- [x] No TestBed — pure function, co-located `amortization.spec.ts`. (`amortization.spec.ts` imports only `computeAmortizationSchedule`, no `@angular/core/testing`.)
- [x] Verified via the fallow skill. (`ng lint`/`ng test`/`ng build --configuration development` all pass; `npx fallow health --complexity ...` exits clean. `computeAmortizationSchedule`/`core/loans/index.ts` have no consumer yet — expected per this ticket's own Notes, since LOAN-05/07/08 are what consume it — so `.fallow-baseline.json` was regenerated via `npx fallow dead-code --save-baseline` to record the two unused files as known; `npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` now exits 0.)

## Notes

- This ticket has no UI and no transaction dependency — safe to build in parallel with LOAN-02/LOAN-03
  once LOAN-01's `Loan` type exists.
- Deliberately fixed-rate, monthly-only — see "Considered, not ticketed yet" in the version overview for
  variable-rate and non-monthly frequency, both explicitly deferred, for every loan type equally.
