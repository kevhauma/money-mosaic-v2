# TICKET-REC-14 — A category end date doesn't create a phantom payment

- **Area:** Recurring
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-30 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-REC-3 (bills calendar), FR-CAT-9 / TICKET-REC-05 (category applicability window bounds a series)

## User story

As someone who has dated the end of a subscription's category, I want the calendar to stop at the last real payment, so it doesn't show an extra payment on the end date.

## Description

When the next expected payment would fall after the category's end date, the series moves that payment **onto** the end date instead of dropping it. The calendar then shows a payment that will never happen, and the panel shows it as the next date.

## Current situation (as-is)

- [`boundedByCategoryWindow`](../../../src/app/core/stats/recurring-payments.ts) (lines 816–828) sets `nextExpectedDate: series.nextExpectedDate > activeUntil ? activeUntil : series.nextExpectedDate` (line 825) and `projectUntil: activeUntil`.
- [`projectRecurringOccurrences`](../../../src/app/core/stats/recurring-projection.ts) (lines 130–133) projects up to and including `projectUntil`, anchored on `nextExpectedDate`. So the clamped date itself is projected as a payment.
- The panel's "Next" column ([`recurring-payments-panel.component.ts`](../../../src/app/feature-recurring/components/recurring-payments-panel/recurring-payments-panel.component.ts) line 138) shows the clamped date.
- Example: a gym paid monthly on the 5th, last paid 2026-12-05, category active until 2026-12-31. Next expected 2027-01-05 is clamped to 2026-12-31. The December calendar shows a second gym payment on the 31st, and "Next" says 31 Dec.

## Desired result (to-be)

- A next expected date past `activeUntil` is no longer clamped. The series keeps its real next date and `projectUntil: activeUntil`, so the calendar shows no payment after the last real beat inside the window.
- The panel's "Next" cell shows "—" for a series whose next date falls after its `projectUntil`. The series stays listed until the window closes, as TICKET-REC-05 decided.
- A next date on or before `activeUntil` behaves exactly as today.
- The doc comment above `boundedByCategoryWindow` (lines 805–806) is updated to match.

## Acceptance criteria

- [ ] In the gym example, `projectRecurringOccurrences` for 2026-12-01..2026-12-31 returns no occurrence on 2026-12-31. For 2027-01 it returns nothing.
- [ ] In the gym example, the panel's "Next" cell reads "—".
- [ ] A series last paid 2026-11-05 with `activeUntil` 2026-12-31 still projects 2026-12-05 and shows it as "Next".
- [ ] The series isn't flagged overdue because of the change, while today is before `activeUntil`.
- [ ] The series' monthly figure and its place in the headline total are unchanged.
- [ ] Unit tests cover: next date after the window (no phantom, no next date shown); next date inside the window (unchanged); the panel row view-model's "—".
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: give a monthly subscription's category an end date a few days after its last payment. The calendar shows no payment on the end date, and "Next" reads "—".

## Notes

- `nextExpectedDate` stays a required string, and only its display changes. Making it optional would ripple through every consumer for no gain.
