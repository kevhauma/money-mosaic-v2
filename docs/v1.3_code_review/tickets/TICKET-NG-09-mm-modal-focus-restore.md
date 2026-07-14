# TICKET-NG-09 — `mm-modal` restores focus to its trigger on close

- **Area:** Angular patterns / a11y (shared/ui)
- **Type:** Bug fix
- **Traceability:** CR-8's modal item (carried over from the first review; the `aria-labelledby` half shipped with the mm-modal extraction, the focus-restore half did not)

## User story

As a keyboard user closing a dialog, I want focus returned to the control that opened it, so I resume where I was instead of being dropped at the document root.

## Description

The native `<dialog>` + `showModal()` gives focus trapping and Escape handling for free, and `mm-modal` already wires `aria-labelledby`. What's missing is restoring focus on close: the browser's default only restores it for some close paths, and programmatic `close()` (signal-driven, as `mm-modal` does it) commonly strands focus on `<body>`.

## Current situation (as-is)

- [mm-modal.component.html:5](../../../src/app/shared/ui/modal/mm-modal.component.html) — `aria-labelledby` is wired (done).
- [mm-modal.component.ts:25-37](../../../src/app/shared/ui/modal/mm-modal.component.ts) — the open/close effect calls `showModal()`/`close()`; nothing records `document.activeElement` at open or restores it at close.

## Desired result (to-be)

- On open, `mm-modal` records the previously focused element; on close (any path — confirm, cancel, Escape, backdrop if supported), it restores focus to that element if it's still in the document, else falls back gracefully (no throw, focus stays where the browser put it).
- Every modal/confirm consumer inherits the behaviour with no call-site changes (and TICKET-NG-06's confirm-dialog rebuild inherits it automatically).

## Acceptance criteria

- [ ] Spec: open modal from a focused button → close programmatically → `document.activeElement` is that button again; opener removed from DOM before close → no error, focus falls back.
- [ ] Escape-close path restores focus too (native `cancel`/`close` event handled, not just the signal path — the `open` model must also sync to `false` on Escape so state and DOM agree; add a spec if that sync is currently missing).
- [ ] Live browser check with keyboard only: edit-transaction modal and a delete-confirm flow both return focus to their trigger.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Keep it inside `mm-modal` — no directive on triggers, no consumer API. `HTMLDialogElement`'s `close` event is the reliable single hook for all close paths.
