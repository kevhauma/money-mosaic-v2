# TICKET-REC-15 — Double-clicking Dismiss or Merge records one override

- **Area:** Recurring
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-23 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-REC-2 (the panel's dismiss/merge corrections, [TICKET-REC-11](./TICKET-REC-11-recurring-needs-correction-affordances.md))

## User story

As someone correcting my recurring payments, I want a double-click on Dismiss or Merge to count once, so Restore and Undo merge work the first time.

## Description

Dismiss and Merge save an override with no guard against a second click while the first save is still running. Two identical overrides get stored. Restore or Undo then removes one of them, the other re-applies, and the button looks broken.

## Current situation (as-is)

- [`recurring-payments-panel.component.ts`](../../../src/app/feature-recurring/components/recurring-payments-panel/recurring-payments-panel.component.ts):
  - `dismiss` (lines 298–301) calls `void this.recurringSeriesStore.dismissSeries(series)`;
  - `merge` (lines 303–307) calls `void …mergeSeries(primary, duplicate)`;
  - neither has an in-flight check, and the buttons stay enabled.
- [`RecurringSeriesStore.record`](../../../src/app/feature-recurring/recurring-series.store.ts) awaits `repository.add` and only then appends the override. Until the first request answers, nothing in the store shows a dismissal is pending, so a second click records a second one.
- `restoreOverride` removes one override by id. The duplicate keeps the series dismissed (or merged).

## Desired result (to-be)

- The store refuses to record an override that matches one already stored or still being saved: same `kind`, same `anchorTransactionId` and, for merges, same `mergedIntoTransactionId`. The second call resolves without a request.
- The guard lives in the store, so it covers every caller, not just these buttons.
- A failed save clears the in-flight mark, so the user can try again.

## Acceptance criteria

- [ ] Calling `dismissSeries(series)` twice without awaiting sends one `repository.add` and leaves one override.
- [ ] Calling `mergeSeries(primary, duplicate)` twice the same way sends one `repository.add`.
- [ ] After a double-clicked dismissal, one Restore brings the series back.
- [ ] Dismissing a series that is already dismissed (override stored) sends no request.
- [ ] If the first `add` rejects, a later `dismissSeries` for the same series sends a request.
- [ ] Persistence stays in `RecurringSeriesStore` → `RecurringOverridesRepository`. The component makes no API call.
- [ ] Unit tests in `recurring-series.store.spec.ts` cover the cases above.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: double-click Dismiss on a row, then click Restore once. The row comes back. The same goes for Merge and Undo merge.

## Notes

- A double-clicked Restore or Undo merge sends a second `DELETE` for an id that is already gone, and the component's `void` drops the rejection. That's harmless to the data and out of scope here. Failed saves in general are TICKET-NG-13.
- Databases that already hold duplicate overrides from earlier double-clicks aren't cleaned up. Restoring twice removes both.
