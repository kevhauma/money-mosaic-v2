# TICKET-UI-30 — Delete confirmation opens a modal on top of a modal

- **Area:** UI / Transactions
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

- [ ] While the delete confirm is open, the edit dialog's actions are not reachable by click or keyboard.
- [ ] Escape dismisses only the topmost dialog, and focus returns to a sensible element beneath.
- [ ] The confirm names the transaction's date and amount as well as its description.
- [ ] Focus is trapped within the topmost dialog while it is open.
- [ ] Cancelling the confirm returns to the edit dialog with any unsaved edits intact.
- [ ] Unit tests cover: the confirm suppresses the parent's actions; Escape closes only the top layer; cancelling preserves unsaved edits; the confirm renders date and amount.
- [ ] Verified live in the browser, including keyboard-only operation.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Consider whether delete belongs in the edit dialog at all — deleting from the row's own actions would sidestep the stacking entirely. Either resolution satisfies this ticket if the criteria hold.
