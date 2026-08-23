# TICKET-TRF-06 — Transfer review is invisible, and linked pairs still read "Uncategorised"

- **Area:** Transfers
- **Type:** Bug fix
- **Traceability:** UX review (UXR-13); FR-TRF-4 (manual override path) — step 3 of the core loop has no visible presence in the UI

## User story

As someone reconciling a month's imports, I want to see at a glance whether any transfers need my attention and which rows are already linked, so that the review step stops being something I have to remember to go looking for.

## Current situation (as-is)

The app's core loop is **import → categorise → review transfers → read stats**. The third step has almost no presence in the interface:

- "Review possible transfers" is a collapsed inline panel on `/transactions` whose trigger carries **no count**. Nothing anywhere says "4 pairs auto-linked, 0 need review", so a user cannot tell whether the step is done, pending, or empty. Its empty content is a single sentence ("No possible transfers awaiting confirmation").
- Rows that *are* linked still display **"Uncategorised"** in their Category cell. The only signal that they are a transfer is an unlabelled 24px chain icon whose `aria-label` is "Unlink transfer" — an action label doing duty as a state label.

The behaviour itself is right and is documented in [faq.ts:32](../../../src/app/feature-help/data/faq.ts) and [guides.ts:95](../../../src/app/feature-help/data/guides.ts); linking deliberately clears the category (TICKET-TRF-01). The defect is that a correctly-linked transfer is presented as an *uncategorised* transaction, which is exactly what the user is trained to go and fix.

## Desired result (to-be)

- The review trigger states its status: how many pairs are linked and how many await confirmation.
- A linked row reads as linked — its Category cell says what it is and which account it pairs with, rather than "Uncategorised".
- The linked state is conveyed in text, not only by an icon whose label describes an action.

## Acceptance criteria

- [ ] The "Review possible transfers" trigger shows the count of pairs awaiting confirmation, and reads as resolved (not merely empty) when there are none.
- [ ] A linked transaction's Category cell communicates that it is a transfer and names its counterpart account, instead of showing "Uncategorised".
- [ ] The linked state has an accessible text label distinct from the "Unlink transfer" action label.
- [ ] Linking still clears the category per TICKET-TRF-01 — this ticket changes presentation, not the data rule.
- [ ] `categoryManual` is never set or cleared by this change.
- [ ] Unit tests cover: a linked row renders the transfer presentation and not "Uncategorised"; an unlinked uncategorised row is unaffected; the trigger's count reflects pending pairs; the zero-pending case renders the resolved state.
- [ ] Verified live in the browser with at least one linked pair and one pending candidate.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The seeded dev data contains linked pairs but no *pending* candidates, so the review-queue state needs a hand-made fixture to verify.
- A UX review reported the Sankey double-counting these transfers; that was checked and rejected — [money-flow-graph.ts:253](../../../src/app/core/stats/money-flow-graph.ts) already draws one leg per pair.
- Out of scope: moving transfer review to its own route. Whether the inline panel is the right home is a separate question from whether it communicates its state.
