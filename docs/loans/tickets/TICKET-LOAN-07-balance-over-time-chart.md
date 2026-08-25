# TICKET-LOAN-07 — Balance-over-time chart, scheduled vs. actual

- **Area:** Loans
- **Released in:** [v1.7 Loan tracker](../../releases/v1.7_loan_tracker/overview.md)
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

- [x] `computeActualBalanceSeries` returns one point per payment, chronologically ordered, ending at the loan's current actual balance. (`loan-progress.ts` — maps `accrueLoanPayments`'s steps 1:1; `loan-progress.spec.ts`'s "returns one point per payment, chronologically ordered, ending at the current actual balance" test.)
- [x] `computeLoanProgress` (LOAN-05) and `computeActualBalanceSeries` share the accrual logic (no duplicated interest-accrual math between them). (`loan-progress.ts` — both are implemented in terms of the private `accrueLoanPayments` helper; `loan-progress.spec.ts`'s "shares its accrual with computeLoanProgress" test asserts the two agree exactly.)
- [x] Chart renders both series with a legend distinguishing scheduled vs. actual, for any `loanType`. (`loan-balance-chart.component.ts`'s `buildLoanBalanceChartOption` uses `legendOption(['Scheduled', 'Actual'], 'top')`; `loan-balance-chart.component.spec.ts`'s "draws both a Scheduled and an Actual series" test loops both `'mortgage'` and `'auto'` and also asserts the chart's own JSON never mentions the loan type.)
- [x] Chart handles a loan with zero payments (actual series is a single point at the start balance, no crash). (`computeActualBalanceSeries` returns `[{date: loan.startDate, balance: loan.principal}]` for an empty payments list; `loan-progress.spec.ts`'s zero-payments test; `loan-balance-chart.component.spec.ts`'s "anchors both series at the loan principal" test calls the builder with `[]`.)
- [x] Unit tests cover: the pure `buildLoanBalanceChartOption`-style option builder, and `computeActualBalanceSeries` against known payment sequences. (`loan-balance-chart.component.spec.ts`'s `describe('buildLoanBalanceChartOption', ...)` block; `loan-progress.spec.ts`'s `describe('computeActualBalanceSeries', ...)` block.)
- [x] Verified via the fallow skill and coding-conventions skill. (`ng lint`/`ng test`/`ng build --configuration development` all pass; both fallow gates exit 0. No coding-conventions violations found. Note: mounting the real `NgxEchartsDirective` chart inside `loan-detail.component.spec.ts` and then triggering a post-mount option update via an archive/unarchive click hit a genuine jsdom-canvas-context crash in zrender's animation ticker — unrelated to correctness, a test-environment limitation — so that spec now stubs `LoanBalanceChartComponent` via `TestBed.overrideComponent`, since none of its own tests are about the chart.)
- [x] Verified live in the browser: a loan with several categorized payments shows both lines diverging when a payment doesn't match the scheduled amount. (`preview_start` on `dev`; opened `/loans/1` (Home mortgage) — chart rendered with a real canvas, no console errors. Read the mounted component's actual `chartOption()` via `ng.getComponent`: both series correctly anchor at the loan's principal on its start date. Added a real €3,000 payment (vs. the ~€1,199 scheduled amount) dated 2026-09-21 directly to IndexedDB, reloaded, and confirmed the two series diverge at that exact date — Scheduled €249,279.27 vs. Actual €243,888.96 — then removed the test transaction.)

## Notes

- Can be built in parallel with LOAN-08 (schedule table) — both only need LOAN-04 + LOAN-05's series
  export, not each other.
