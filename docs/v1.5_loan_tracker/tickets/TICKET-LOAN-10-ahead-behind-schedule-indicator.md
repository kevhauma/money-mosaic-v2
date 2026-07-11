# TICKET-LOAN-10 — Ahead/behind-schedule + interest-saved indicator

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-10 (new)

## User story

As a user, I want to know at a glance whether I'm ahead of or behind any loan's original schedule, and how
much interest my overpayments have saved me, so I can see the concrete payoff of paying extra — whether
that loan is a mortgage or something else.

## Description

The most-derived FR-LOAN figure: compares the actual balance/pace (LOAN-05) against the scheduled
balance/pace (LOAN-04) at the same point in time, and surfaces "N months ahead of schedule" and total
interest saved.

## Current situation (as-is)

- LOAN-04's `computeAmortizationSchedule` and LOAN-05's `computeLoanProgress` /
  `computeActualBalanceSeries` (LOAN-07) each exist independently; nothing yet compares them.
- `LoansOverviewComponent` (LOAN-06) currently shows the scheduled payoff date only, with a note that this
  ticket adds the delta on top.

## Desired result (to-be)

- `core/loans/loan-progress.ts` gains `computeScheduleComparison(loan: Loan, schedule:
  AmortizationEntry[], progress: LoanProgress): { monthsAheadOfSchedule: number; interestSavedEstimate:
  number; projectedPayoffDate: string }`:
  - `monthsAheadOfSchedule`: find the first scheduled entry whose `remainingBalance <=
    progress.actualBalance`; the difference between that entry's `month` and the number of months actually
    elapsed since `startDate` is the ahead/behind figure (negative = behind).
  - `interestSavedEstimate`: difference between the schedule's total interest over its full term and a
    rough re-amortization of the *remaining* actual balance over the *remaining* scheduled term at the same
    rate — a reasonable estimate, not a cent-exact refinance calculation.
  - `projectedPayoffDate`: scheduled final date shifted earlier by `monthsAheadOfSchedule` (or later, if
    negative).
- Surfaced on `LoansOverviewComponent`'s cards (LOAN-06) and the loan detail header: a badge like "8 months
  ahead of schedule" (or "3 months behind", styled as a warning) plus "~€1,240 interest saved so far" —
  identical presentation for every `loanType`.

## Acceptance criteria

- [ ] On-schedule payments (actual matches scheduled exactly) produce `monthsAheadOfSchedule === 0` and `interestSavedEstimate` near 0.
- [ ] Consistent overpayments produce a positive `monthsAheadOfSchedule` and positive `interestSavedEstimate`.
- [ ] Missed/underpaid periods produce a negative `monthsAheadOfSchedule`.
- [ ] `projectedPayoffDate` shifts correctly in both directions.
- [ ] Behaviour is verified for at least two different `loanType` values with the same underlying numbers, proving no type-specific branch exists.
- [ ] Unit tests cover: on-schedule, ahead, and behind scenarios with known expected deltas.
- [ ] No TestBed for the pure calculation — co-located spec; UI wiring tested at the component level.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: a loan with a couple of overpayments shows a positive "ahead of schedule" badge and a nonzero interest-saved figure.

## Notes

- `interestSavedEstimate` is explicitly labelled as an estimate (~) in the UI — the note in the version
  overview about not building a full refinance/what-if simulator applies here too; this is a simple,
  transparent approximation, not a promise of exact savings.
- Last ticket in the set since it's the most derived figure, depending on both LOAN-04 and LOAN-05.
