# TICKET-LOAN-17 — What-if lump sums land exactly once near month-end

- **Area:** Loans
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-9 ([code review 5](../../releases/v3_code_review/code-review.md)), CR6-A1 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-LOAN-14 (lump-sum what-if), FR-LOAN-12 (projection engine), FR-LOAN-4/8 (schedule)

## User story

As someone planning a lump-sum payment, I want the what-if to apply it exactly once, in the month I picked, whatever day the projection starts, so the payoff date and the fee aren't wrong at the end of a month.

## Description

The loan maths steps months with a helper that lets a day past a short month's end roll into the next month. The what-if then matches lump sums to months by `yyyy-mm`. Starting from a 29th–31st, one month appears twice and another is skipped: a lump sum is applied twice, with its fee charged twice, or never. The fix uses the shared month-step rule from TICKET-SOLID-10, which clamps to the month's last day.

## Current situation (as-is)

- [`addMonths`](../../../src/app/core/loans/amortization.ts) (lines 31–36) builds `Date.UTC(year, month + n, day)`, so the native day overflow is kept. Its doc comment (lines 23–30) describes that as intended.
- [`runProjection`](../../../src/app/core/loans/what-if.ts) (lines 129–157) dates month _n_ as `addMonths(fromDate, n)` and applies every lump sum whose `monthKeyOf(entry.date)` equals that month's key (lines 137–144).
- Examples:
  - From 2026-10-31: month 1 is 2026-12-01 (31 November overflows) and month 2 is 2026-12-31. A lump sum dated 2026-12 is applied twice, so `appliedLumpSums` has it twice and the fee and `interestSaved` are overstated. One dated 2026-11 is never applied.
  - The same helper dates the amortization schedule (`amortization.ts` line 86): a loan starting 2027-01-31 gets rows on 2027-03-03 and 2027-03-31, and none in February.
- No spec uses a start date on the 29th–31st.

## Desired result (to-be)

- `core/loans` steps months with the clamping helper from [TICKET-SOLID-10](../../engineering/tickets/TICKET-SOLID-10-one-month-step-rule.md): month _n_ is always `fromDate` plus _n_ calendar months, its day clamped to the last day of that month.
- The private `addMonths` and its overflow doc go, and its other callers (`computeAmortizationSchedule`, `loan-progress.ts` line 188) use the shared helper too.
- Every projected month has a distinct `yyyy-mm`, so a lump sum lands in exactly one month.

## Acceptance criteria

- [ ] From 2026-10-31, the projected months are 2026-11-30, 2026-12-31, 2027-01-31, 2027-02-28, 2027-03-31.
- [ ] From 2026-10-31, a €5,000 lump sum dated 2026-12-15 appears once in `appliedLumpSums`, and its fee is charged once.
- [ ] From 2026-10-31, a lump sum dated 2026-11-20 is applied in month 1.
- [ ] A loan starting 2027-01-31 has schedule rows on 2027-02-28 and 2027-03-31: one per month, none skipped.
- [ ] Start dates on the 1st–28th give the same dates as today (existing `what-if.spec.ts` and `amortization.spec.ts` cases pass).
- [ ] `core/loans` keeps no private month-step helper.
- [ ] Unit tests cover start dates on the 29th, 30th and 31st, including the lump-sum and fee cases above.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: on a loan's What-if tab, with a start date on the 31st, add a lump sum in a 30-day month and in February. Each shows one saving and one fee.

## Notes

- **Needs TICKET-SOLID-10** (one month-step rule that clamps to month-end).
- Clamping from the anchor each time, rather than chaining step by step, keeps a 31st loan on the 31st in long months. Chaining 31 Jan → 28 Feb → 28 Mar would drift.
