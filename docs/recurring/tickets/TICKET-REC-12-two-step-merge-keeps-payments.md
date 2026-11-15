# TICKET-REC-12 — Merging recurring series in two steps keeps every payment

- **Area:** Recurring
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-12 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-REC-2 (the panel's merge correction, [TICKET-REC-11](./TICKET-REC-11-recurring-needs-correction-affordances.md))

## User story

As someone tidying up my recurring payments, I want merging three detections into one, two at a time, to keep all their payments, so the merged row and the monthly total are complete.

## Description

When overrides are re-applied, a merge folds the duplicate's **raw** detection into the primary, not the duplicate as it looks after earlier merges. A second merge on top of a first one drops the payments the first merge brought in.

## Current situation (as-is)

- [`applyRecurringOverrides`](../../../src/app/feature-recurring/recurring-overrides.ts) keeps the folded series in `byKey`, but line 97 calls `mergeRecurringSeries(byKey.get(primary.key) ?? primary, duplicate)`. Here `duplicate` is the raw series `seriesFor(surviving, …)` found (line 92), not `byKey.get(duplicate.key)`.
- Example: detections A (first paid in January), C (February) and B (March), same payment.
  1. Merge B into C. The store records `{anchor: B, mergedInto: C}`, and the row shows C+B.
  2. Merge that row into A. The store records `{anchor: anchorOf(C+B) = C, mergedInto: A}`.
  3. On re-apply, the first override sets `byKey[C] = C+B` and marks B absorbed. The second sets `byKey[A] = A + raw C` and marks C absorbed.
  4. B's payments are in neither visible row. They're missing from the list and from the monthly total.

## Desired result (to-be)

- Line 97 merges the duplicate's folded form: `mergeRecurringSeries(byKey.get(primary.key) ?? primary, byKey.get(duplicate.key) ?? duplicate)`.
- In the example, A shows every occurrence of A, B and C, and the monthly total counts them once each.
- "Undo merge" on A removes only the second override, leaving A and C+B as two rows.

## Acceptance criteria

- [ ] The A/C/B example above yields one row holding all occurrences of A, B and C, and neither B nor C appears on its own.
- [ ] The headline monthly total equals that merged row's monthly figure (no payment lost or counted twice).
- [ ] Removing the second override yields rows A and C+B. Removing the first override as well yields A, B and C.
- [ ] A single merge behaves exactly as before (existing `recurring-overrides.spec.ts` merge cases pass).
- [ ] Overrides are still recorded and removed through `RecurringSeriesStore` → `RecurringOverridesRepository`.
- [ ] Unit tests in `recurring-overrides.spec.ts` cover the two-step chain, and undoing each step.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: on `/recurring`, merge two duplicate rows, then merge the result into a third. All payments show in the expanded row and the total doesn't drop.

## Notes

- The loop still depends on override order. If the second override came first, line 95 would skip the first one, because C is already absorbed, and B would stay a row of its own. Overrides load in id (creation) order, so the user's own sequence always replays correctly. Making the fold order-independent is out of scope unless it falls out of the fix.
