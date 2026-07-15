# TICKET-LOAN-07 — Balance-over-time chart, scheduled vs. actual

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-7 (new)

## User story

As a user, I want to see a chart of any loan's balance dropping over time — the textbook schedule next to
what actually happened — so I can visually see whether I'm ahead or behind, whatever the loan type.

## Description

Build the Loan detail page's first real panel: an ECharts line chart with two series (scheduled balance
from LOAN-04, actual balance reconstructed month-by-month from LOAN-05's logic) against a shared timeline.

## Current situation (as-is)

- [account-balance-chart.component.ts](../../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts)
  is the direct precedent: a pure `buildXChartOption` function kept separate from the component (testable
  without TestBed), rendered via `NgxEchartsDirective`, registered through
  [echarts-setup.ts](../../../src/app/shared/echarts/echarts-setup.ts).
- LOAN-04's `computeAmortizationSchedule` produces a full scheduled series already broken out by month.
- LOAN-05's `computeLoanProgress` only returns the *current* snapshot, not a series — this ticket needs a
  running series, not just the latest point.

## Desired result (to-be)

- `core/loans/loan-progress.ts` gains a second pure export, `computeActualBalanceSeries(loan: Loan,
  payments: Transaction[]): { date: string; balance: number }[]`, reusing the same accrual loop as
  `computeLoanProgress` but emitting a point per payment instead of only the final balance
  (`computeLoanProgress` can be reimplemented in terms of this series' last point, to avoid duplicating the
  accrual logic).
- `feature-loans/components/loan-balance-chart/loan-balance-chart.component.ts`: an
  `NgxEchartsDirective`-based line chart with two series — "Scheduled" (from `computeAmortizationSchedule`,
  monthly) and "Actual" (from `computeActualBalanceSeries`, one point per real payment) — sharing a
  category x-axis of dates, styled consistently with `account-balance-chart`'s option shape (tooltip,
  grid, legend distinguishing the two series). Chart title/labels say "loan balance," not "mortgage
  balance."
- Rendered on the Loan detail page (`/loans/:id`), below the header summary.

## Acceptance criteria

- [ ] `computeActualBalanceSeries` returns one point per payment, chronologically ordered, ending at the loan's current actual balance.
- [ ] `computeLoanProgress` (LOAN-05) and `computeActualBalanceSeries` share the accrual logic (no duplicated interest-accrual math between them).
- [ ] Chart renders both series with a legend distinguishing scheduled vs. actual, for any `loanType`.
- [ ] Chart handles a loan with zero payments (actual series is a single point at the start balance, no crash).
- [ ] Unit tests cover: the pure `buildLoanBalanceChartOption`-style option builder, and `computeActualBalanceSeries` against known payment sequences.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: a loan with several categorized payments shows both lines diverging when a payment doesn't match the scheduled amount.

## Notes

- Can be built in parallel with LOAN-08 (schedule table) — both only need LOAN-04 + LOAN-05's series
  export, not each other.
