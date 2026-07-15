# TICKET-NG-06 — Rebuild `ConfirmDialogComponent` on top of `mm-modal`

- **Area:** Angular patterns (shared/ui)
- **Type:** Refactor
- **Traceability:** CR3-2.4; completes TICKET-NG-01's extraction
- **Fallow evidence (2026-07-14):** `dup:42bf7346` — confirm-dialog vs. mm-modal, the open/close effect TICKET-NG-01 was created to de-duplicate

## User story

As a developer, I want the confirm dialog composed from the shared `mm-modal`, so the native-`<dialog>` open/close wiring exists exactly once in the codebase.

## Description

TICKET-NG-01 extracted `MmModalComponent` for the repeated `showModal()`/`close()` effect, but `ConfirmDialogComponent` predates it and still hand-rolls the same effect. Rebuilding its template on `<mm-modal [(open)]>` deletes the last copy.

## Current situation (as-is)

- [confirm-dialog.component.ts:30-39](../../../src/app/shared/ui/confirm-dialog/confirm-dialog.component.ts) — its own `viewChild` + `effect` calling `showModal?.()`/`close?.()`.
- [mm-modal.component.ts:25-37](../../../src/app/shared/ui/modal/mm-modal.component.ts) — the canonical implementation of the same effect.

## Desired result (to-be)

- `ConfirmDialogComponent` keeps its public API (`title`, `message`, `confirmLabel`, `cancelLabel`, `danger`, `open` model, `confirmed` output) but renders `<mm-modal>` internally; its own `viewChild`/`effect`/dialog element handling is deleted.
- Escape/backdrop-close behaviour matches whatever `mm-modal` already does, so all confirm dialogs and modals behave consistently.

## Acceptance criteria

- [x] All existing confirm flows work unchanged (account delete/clear, category delete, rule delete, transaction delete, import undo) — verified live in the browser, including the `danger` styling variant.
- [x] `dup:42bf7346` no longer appears in `fallow dupes`; `grep -n "showModal" src/app/shared/ui` hits only `mm-modal.component.ts`.
- [x] Existing `confirm-dialog.component.spec.ts` passes (updated only if the internal DOM structure changed selectors); a case asserts `confirmed` emits once and the modal closes on confirm.
- [x] No public-API change for consumers — no call-site edits outside `shared/ui/confirm-dialog`.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- If `mm-modal` lacks a hook the confirm dialog needs (e.g. a footer slot), extend `mm-modal` rather than keeping any dialog-element handling in the confirm component.
