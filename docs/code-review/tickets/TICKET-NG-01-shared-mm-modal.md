# TICKET-NG-01 — Extract a shared `mm-modal` component (dialog open/close sync)

- **Area:** Angular patterns (shared UI)
- **Type:** Refactor
- **Traceability:** CR-7.1 (also unblocks CR-8 dialog a11y)
- **Source story:** code-review/user-stories.md §7 — *"As a developer, I want the repeated `<dialog>` open/close effect extracted into a shared `mm-modal` component (or a `syncDialogWithSignal` utility), so `account-form`, `category-form`, `rule-form`, and `transaction-edit-form` stop duplicating it and a11y (focus trap, `aria-modal`) lives in one place."*

## Description

Four form components each own an identical `effect()` that mirrors an `open` signal onto a native `<dialog>` via `showModal()`/`close()`. Extract that logic (and the dialog markup) into one shared component so the sync — and the accessibility wiring that belongs with it — lives in a single place.

## Current situation (as-is)

- The same constructor `effect()` is duplicated across:
  - [account-form.component.ts:46](../../../src/app/feature-accounts/components/account-form/account-form.component.ts)
  - [category-form.component.ts:44](../../../src/app/feature-categories/components/category-form/category-form.component.ts)
  - [rule-form.component.ts:87](../../../src/app/feature-categories/components/rule-form/rule-form.component.ts)
  - [transaction-edit-form.component.ts:46](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts)
- Each reads a `model(false)`/`input` `open`, grabs a `viewChild.required` `<dialog>` ref, and calls `dialogElement.showModal?.()` / `dialogElement.close?.()`. Fallow flags the duplication (`dup:871c39b0` / `dup:5bb3d5e1`).
- None of them wire `aria-modal`, `aria-labelledby`, or focus restoration — so fixing a11y today means editing four files.

## Desired result (to-be)

- A shared `mm-modal` component in `shared/ui/` (barrel-exported via `@/shared/ui`) that owns the `<dialog>` element and the open/close sync, exposing a two-way `open` model and projecting content (title + body/actions) via `ng-content`.
- The four form components drop their local `<dialog>`, `viewChild`, and sync `effect()`, and wrap their form body in `<mm-modal [(open)]="open">` instead.
- The single sync effect keeps the existing `showModal?.()` / `close?.()` guards so it stays test-safe under jsdom.

## Acceptance criteria

- [ ] A `MmModalComponent` (`app-mm-modal` / `mm-modal`) exists under `src/app/shared/ui/`, is `OnPush`, exposes a two-way `open = model(false)`, and syncs it to a native `<dialog>` in one place.
- [ ] `account-form`, `category-form`, `rule-form`, and `transaction-edit-form` all consume `mm-modal` and no longer declare their own dialog `viewChild` or open/close `effect()`.
- [ ] Native dialog dismissal (Esc / backdrop `cancel`/`close`) flows back into the `open` model so the parent signal and the dialog can't desync.
- [ ] Existing behaviour is preserved for each form: form reset on open, submit/cancel closing the dialog, and validation gating on submit.
- [ ] Accessibility hooks are present on the shared component (`aria-modal="true"`, an `aria-labelledby` slot for the title) so CR-8's focus-restore work can build on it — full focus-trap/restore may land in the CR-8 ticket, but the seam exists here.
- [ ] Unit tests cover: `open` true → `showModal` called, `open` false → `close` called, and native `cancel`/`close` resets the `open` model. Existing form specs still pass.
- [ ] Verified live in the browser: opening/closing each of the four dialogs still works (open, submit, cancel, Esc), no console errors.
- [ ] The `angular.json` bundle budget is **not** raised.

## Notes

- Prefer a component over a bare `syncDialogWithSignal` utility so the a11y attributes and dialog markup are shared too — the story lists both but the component centralises more.
- This ticket is a prerequisite for the CR-8 dialog-a11y story (`aria-labelledby` + focus restore) in code-review/user-stories.md §8.
