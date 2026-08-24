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

### Implementation note, 2026-08-24 — CR-2.2's gate had to go, and that is a re-decision

`ambiguousCandidates` short-circuited to `[]` while the panel was collapsed, so the expensive match
scan never ran unless the user opened it (CR-2.2). But a *collapsed* trigger is exactly where the
count has to be true — a review step that can only tell you its state once you have opened it is the
step this ticket exists to make visible. So the gate is gone, and the reasoning is written where the
gate used to be rather than left for the next reader to rediscover.

The cost is bounded and stated in the comment: it is a `computed`, so it runs once per change to the
underlying data rather than per change-detection pass; it only ever considers *unlinked* transactions;
and the panel exists on `/transactions` alone. If it does become a problem, the fix is a worker, not
the gate — the gate is what hid the step.

- [x] The "Review possible transfers" trigger shows the count of pairs awaiting confirmation, and reads as resolved (not merely empty) when there are none. (`pendingCount` on a `badge-warning` inside the button, plus a `reviewStatus` caption with three deliberately-distinct states — "N pairs need review", "N pairs linked, none to review", "No transfers found yet". The third exists because an app with no linked pairs *and* no candidates has not finished reviewing; saying "none to review" there would claim a step ran that never did. The status is **empty until the stores hydrate**, and the caption is not rendered while it is: an un-hydrated store looks exactly like "no transfers exist", which is the same class of claim the three states exist to avoid. Pinned by four cases in `transfer-review.component.spec.ts`, one of them the un-hydrated case.)
- [x] A linked transaction's Category cell communicates that it is a transfer and names its counterpart account, instead of showing "Uncategorised". (`transferLabelFor` in `feature-transactions/transfer-label.ts` resolves the counterpart leg through the new `TransactionsStore.transactionsById` and renders `Transfer · Savings` as an `mm-badge`; the picker is not rendered at all for a linked row, since there is no category to set. Pinned by "replaces the category picker with the transfer and its counterpart account", which asserts "Uncategorised" is gone.)
- [x] The linked state has an accessible text label distinct from the "Unlink transfer" action label. (The badge is real text in the row, so it is read as content; the chain button keeps its own `ariaLabel="Unlink transfer"`. Pinned by "states the linked status in text, separately from the unlink action label", which asserts the unlink control does not carry the state string.)
- [x] Linking still clears the category per TICKET-TRF-01 — this ticket changes presentation, not the data rule. (Nothing in the diff touches `TransfersStore.link` or the matcher; `transfer-label.ts` is a pure read-side formatter and the row's `transferLabel` is a display field on the view-model. `git diff` covers no file under `core/transfers/` or `core/state/transfers.store.ts`.)
- [x] `categoryManual` is never set or cleared by this change. (`git diff -U0 | grep categoryManual` over the changed lines returns nothing — the two write paths that set it, `TransactionsStore.setCategory` and `transactions-overview`'s `onCategoryChange`, are both untouched, and a linked row no longer renders the control that reaches the second.)
- [x] Unit tests cover: a linked row renders the transfer presentation and not "Uncategorised"; an unlinked uncategorised row is unaffected; the trigger's count reflects pending pairs; the zero-pending case renders the resolved state. (Eight cases in the new `transfer-label.spec.ts` — including both legs of a pair, an unlinked row, and the two half-deleted-pair fallbacks — three in `transaction-row.component.spec.ts`, and four in `transfer-review.component.spec.ts`, one of which asserts the count is non-zero *while `reviewExpanded()` is still false* — the assertion the old gate would fail — and one that the status stays empty before hydration. 3417 tests green.)
- [ ] Verified live in the browser with at least one linked pair and one pending candidate. — **deferred, not skipped**: the user chose a single browser pass over the whole v2.3 batch rather than one per ticket; tick this when that pass runs. Note the Notes below: the dev seed creates linked pairs but no *pending* candidates, so the pending half needs a hand-made fixture.
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline … --fail-on-issues` and `npx fallow health --complexity …` both exit 0. `conventions-reviewer` found four items, all applied in a follow-up: the count badge was a raw `badge badge-warning badge-sm` span rather than `mm-badge`; `reviewStatus` claimed "No transfers found yet" during hydration, when an un-hydrated store looks identical to an empty one — now gated on `AccountsStore.dataReady()`, with its own test; the template comment claimed the status reached the button's accessible name when only the bare number did, so an `sr-only` sentence carries it and the badge is `aria-hidden`; and the expanded-and-empty branch repeated `reviewStatus()` verbatim two lines below its own caption, with the trailing period assembled in the binding — the punctuation moved into the computed and the panel body now says something panel-specific.)

## Notes

- The seeded dev data contains linked pairs but no *pending* candidates, so the review-queue state needs a hand-made fixture to verify.
- A UX review reported the Sankey double-counting these transfers; that was checked and rejected — [money-flow-graph.ts:253](../../../src/app/core/stats/money-flow-graph.ts) already draws one leg per pair.
- Out of scope: moving transfer review to its own route. Whether the inline panel is the right home is a separate question from whether it communicates its state.
- **The how-to guide and the FAQ were updated with this ticket** (TICKET-PUB-02's rule): both
  described the review panel without a count, and neither said what a linked row's Category column
  reads — which is now the answer to "why does this row have no category", the question the FAQ entry
  is for.
- **`TransactionsStore.transactionsById` is new and memoized on the store deliberately.** Building
  that map inside `transactions-overview`'s `rows` computed would rebuild it every time the *page* or
  the *selection* changed, not just when the data did — `rows` depends on both.
- **A half-deleted pair degrades to a bare "Transfer"** rather than naming an account that is not
  there, and is covered by two of the pure tests. It must not fall back to "Uncategorised": the row
  still believes it is linked, and presenting it as uncategorised is the whole defect.
- **The status line says nothing rather than something wrong while the stores load.** Worth keeping
  in mind for anything else that reports a count of "things needing attention": zero-because-empty
  and zero-because-not-loaded-yet are different answers, and `AccountsStore.dataReady()` is the gate
  the app already uses to tell them apart.
