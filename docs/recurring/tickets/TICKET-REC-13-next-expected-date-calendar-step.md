# TICKET-REC-13 — Next expected date steps by calendar month

- **Area:** Recurring
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-17, CR6-A1 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-REC-1 (detection's next expected date), FR-REC-3 (the bills calendar projects from it)

## User story

As someone checking when my rent is due next, I want the expected date to land on the same day of the month as I usually pay, so the panel and the calendar don't drift by days.

## Description

For monthly, quarterly and yearly series, the next expected date is the last payment plus the median gap **in days**. The projection then steps by calendar month from that wrong date, so every projected date inherits the error. The calendar cadences should step by the calendar from the last payment, using the shared month-step rule from TICKET-SOLID-10.

## Current situation (as-is)

- [`recurring-payments.ts`](../../../src/app/core/stats/recurring-payments.ts):
  - line 597 (detection) sets `nextExpectedDate: formatIsoDate(parseIsoDate(lastDate) + rhythm.medianGapDays * MS_PER_DAY)`;
  - line 678 (`mergeRecurringSeries`) does the same with `intervalDays`.
- [`stepBy`](../../../src/app/core/stats/recurring-projection.ts) (lines 58–72) already steps monthly, quarterly and yearly by the calendar, clamping to month-end. But it anchors on `nextExpectedDate`, so it keeps whatever day the day-count produced.
- Examples:
  - Last paid 2026-02-25 with a 31-day median gives an expected 2026-03-28, and every later projection falls on the 28th.
  - Last paid 2026-01-31 with a 30-day median gives an expected 2026-03-02, skipping February.

## Desired result (to-be)

- For `monthly`, `quarterly` and `yearly`, `nextExpectedDate` is `lastDate` stepped by one cadence period (1, 3 or 12 months) by the calendar, clamped to the target month's last day. This uses the month-step helper from [TICKET-SOLID-10](../../engineering/tickets/TICKET-SOLID-10-one-month-step-rule.md), the same rule `stepBy` uses.
- `weekly` and `fortnightly` keep stepping by days (TICKET-REC-07).
- Detection and `mergeRecurringSeries` share one helper for this, so the two can't disagree.
- `intervalDays` (the median gap) stays as it is for confidence and timing flags; only the date changes.

## Acceptance criteria

- [ ] Monthly series last paid 2026-02-25 (median 31 days): next expected 2026-03-25.
- [ ] Monthly series last paid 2026-01-31 (median 30 days): next expected 2026-02-28.
- [ ] Quarterly series last paid 2026-11-30: next expected 2027-02-28. Yearly series last paid 2024-02-29: next expected 2025-02-28.
- [ ] Weekly and fortnightly series are unchanged (last paid 2026-03-03, fortnightly: 2026-03-17).
- [ ] A merged series gets its next expected date by the same rule (`mergeRecurringSeries` spec).
- [ ] The bills calendar for March 2026 shows the 2026-02-25 series on 2026-03-25.
- [ ] No private month-step copy is added: the date comes from the TICKET-SOLID-10 helper.
- [ ] Unit tests in `recurring-payments.spec.ts` cover the cases above.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: on `/recurring`, a monthly payment's "Next" date and its calendar dot fall on its usual day of the month.

## Notes

- **Needs TICKET-SOLID-10** (one month-step rule that clamps to month-end).
- Anchoring later projections on a clamped date still loses the original day: a payment on the 31st projected via 2026-02-28 lands on 2026-03-28 when `stepBy` walks on from `nextExpectedDate`. Anchoring the projection on `lastDate` (step ≥ 1) avoids that. Decide that while implementing; the acceptance cases above only pin the next date.
- The overdue flag (`OVERDUE_GRACE_DAYS` after `nextExpectedDate`) moves with the corrected date, which is the point.
