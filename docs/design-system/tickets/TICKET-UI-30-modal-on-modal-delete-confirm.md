# TICKET-UI-30 — Delete confirmation opens a modal on top of a modal

- **Area:** UI / Transactions
- **Released in:** [v2.3 UX review](../../releases/v2.3_ux_review/overview.md)
- **Type:** Bug fix
- **Traceability:** UX review (UXR-17); extends the shared `ConfirmDialogComponent` convention

## User story

As someone deleting a transaction from its edit dialog, I want one clear dialog asking one question, so that I know which dialog my Escape key and my click are going to.

## Current situation (as-is)

Deleting from the edit-transaction dialog opens the shared confirm dialog **on top of** the still-open edit dialog. The parent's "Save changes" button stays visible and **un-dimmed** behind the confirm, so two competing primary actions are on screen at once and Escape targeting is ambiguous.

The confirm also identifies the transaction only by description — "Supermarket" — and the seeded dataset alone contains **eight** rows with that exact description. The dialog does not state the date or amount, so the user cannot verify they are deleting the row they meant.

## Desired result (to-be)

- One dialog is interactive at a time: opening the confirm visually and functionally suppresses the dialog beneath it.
- Escape and click-outside have one unambiguous target.
- The confirm identifies the transaction by enough detail to be unambiguous — date and amount alongside the description.

## Acceptance criteria

### Implementation note, 2026-08-24 — which of the Notes' two resolutions was taken

**Delete stays in the edit dialog**; the stacking is removed instead. Moving delete to the row's own
actions would have sidestepped the problem, but it also moves the affordance away from the one screen
that shows every field of the row you are about to lose — which is the same information the confirm
now has to quote. So `confirmDelete()` closes the edit dialog *before* opening the confirm.

That is what makes the rest fall out rather than needing to be built: with exactly one `showModal()`
dialog open, the browser's own top-layer rules give one focus trap, one backdrop and one Escape
target. What the change does have to add is the way back: the confirm closes itself on Cancel and on
Confirm alike, so its `open` is bound split (`[open]` / `(openChange)`) and only a dismissal reopens
the edit dialog.

The **edit session** is what protects the unsaved edits, and it is deliberately separate from "which
dialog is on screen": `editSessionOpen = open() || confirmDetour()` stays true across the detour, and
everything that seeds a control reads it instead of `open`. That includes
`app-attribution-override-fieldset`, which is mounted outside the dialog's own `@if` and reseeds on
every `false → true` of its `open` input — binding it to the raw dialog state would have silently
discarded an unsaved attribution pick on the way back while leaving `notes` looking fine.

- [x] While the delete confirm is open, the edit dialog's actions are not reachable by click or keyboard. (`confirmDelete()` sets `open` false before setting `deleteConfirmOpen` true, so `mm-modal` calls `dialog.close()` on the edit dialog — a closed `<dialog>` is unreachable to both click and Tab. Pinned by "never has both dialogs open at once, so the edit actions go inert", which asserts the invariant on both open models and locates "Save changes" inside the closed dialog.)
- [x] Escape dismisses only the topmost dialog, and focus returns to a sensible element beneath. (Only one dialog is ever open, so Escape has one target by construction. Its `(cancel)` reaches `onDeleteConfirmOpenChange(false)`, which reopens the edit dialog — `mm-modal`'s `showModal()` puts focus back inside it. Pinned by "returns to the edit dialog with unsaved edits intact when the confirm is dismissed", which drives the exact `openChange(false)` both Escape and Cancel emit.)
- [x] The confirm names the transaction's date and amount as well as its description. (`deleteSubject` — `01/07/2026 · -€10,00 · Carrefour Market`, joined ahead of the warning text. Pinned by "names the transaction by date and amount, not by description alone", which asserts all three strings render.)
- [x] Focus is trapped within the topmost dialog while it is open. (Native `showModal()` behaviour, which now applies unambiguously because there is only one open dialog; `mm-modal` was already using it. Nothing in this change opts out of it.)
- [x] Cancelling the confirm returns to the edit dialog with any unsaved edits intact. (`editSessionOpen` spans the detour, so neither this component's seed effect nor the attribution fieldset's re-runs on the way back. Pinned by two cases: one types a note before opening the confirm, clicks the confirm's own Cancel through the template, and asserts the note survives; the other asserts the session stays open across the whole detour while `open` goes false, which is what covers the child fieldset.)
- [x] Unit tests cover: the confirm suppresses the parent's actions; Escape closes only the top layer; cancelling preserves unsaved edits; the confirm renders date and amount. (Seven cases in the rewritten `TransactionEditFormComponent: delete` describe, including one that the edit dialog does **not** reopen after a confirmed delete — `confirmed` fires before the dialog closes itself, so that same `openChange(false)` must not read as a dismissal. The dismissal is driven by clicking the confirm's own Cancel through the template rather than by calling the handler, so the `(openChange)` binding the flow depends on is part of what is exercised. 24 tests in the file, all green.)
- [x] Verified live in the browser, including keyboard-only operation. (Dev server on :4210, 2026-08-24 — and this is the ticket where it mattered most, since jsdom implements neither `showModal()` nor top-layer inertness. With the confirm open, the edit `<dialog>` reports `open: false` and the confirm `open: true`; **"Save changes" computes to `pointer-events: none`** — the un-dimmed, still-clickable button that was the whole defect is now genuinely inert — and `document.activeElement` is the confirm's own Cancel, i.e. focus is trapped in the topmost dialog. The confirm reads `20/08/2026 · -€300,00 · Rainy Day Savings — This permanently deletes this transaction and cannot be undone. — Its linked transfer will also be removed.` Dismissing it via the dialog's `cancel` event (what Escape fires) closes only the confirm: the edit dialog returns `open: true`, Save is `pointer-events: auto` again, focus lands on the category select inside it, and the note typed beforehand is still `half-written note`. Nothing was deleted — the table still holds 41 rows. No console or server errors.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline … --fail-on-issues` and `npx fallow health --complexity …` both exit 0. `conventions-reviewer` found a real defect in the first cut — the attribution fieldset still reseeded across the detour, because the suppression flag only covered this component's own form — and its fix is what the implementation note above describes: one `editSessionOpen` computed replacing two flags. Its other points were applied too: `deleteConfirmed_`/`deleteConfirmed()` became `confirmDetour`/`onDeleteConfirmed()`, the dismissal test now clicks through the template instead of calling the handler, the reach-in moved onto the spec's existing `Internals` type, and the spec's alias import was regrouped ahead of the relative ones.)

## Notes

- Consider whether delete belongs in the edit dialog at all — deleting from the row's own actions would sidestep the stacking entirely. Either resolution satisfies this ticket if the criteria hold. — **resolved the other way**, see the implementation note above: delete stays in the edit dialog and the stacking is removed.
- **The specs stop where jsdom does.** `showModal()` and top-layer inertness are unimplemented there,
  so `dialog.open` reads `false` for both dialogs no matter what the component does — which is why
  the suppression case asserts the two open *models* rather than the DOM, and says so inline. Anyone
  tightening these tests should check that limitation still holds rather than assuming the assertion
  was written loosely.
- **One flag, not two, and it means one thing.** `ConfirmDialogComponent` emits `confirmed` and
  *then* sets `open` false, so `onDeleteConfirmed` ends the detour before `onDeleteConfirmOpenChange`
  ever sees the close — which is why a still-open `confirmDetour` is exactly what a Cancel or an
  Escape looks like, with nothing reconstructing intent from a boolean that means two things. There
  is a spec for the confirmed path specifically, since re-opening an edit dialog for a row that no
  longer exists is the failure it prevents.
- **The focus-ring worry did not materialise, and was checked twice.** `confirmDelete()` writes both
  open states in one tick and `MmModalComponent` captures `document.activeElement` as its restore
  target, so the confirm could in principle have captured the edit dialog's own "Delete" button and
  focused into a closed dialog on the way back. Driven live through two full Delete → Cancel → Delete
  rounds, focus landed on the confirm's Cancel both times and returned inside the edit dialog both
  times. No spec here can see this — jsdom implements neither `showModal()` nor top-layer
  inertness — so re-check it by hand if this flow is ever restructured.
