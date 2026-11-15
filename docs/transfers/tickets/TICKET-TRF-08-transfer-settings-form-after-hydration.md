# TICKET-TRF-08 — The transfer settings form shows the saved settings

- **Area:** Transfers
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-10 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-TRF-4 (window and confidence configurable); TICKET-SRV-06 (store hydration), CR6-A2 (writes built from unloaded defaults)

## User story

As someone who changed the transfer match window, I want the settings form on the transactions page to show what I saved, so that toggling one checkbox and pressing Save doesn't put my match window back to the default.

## Description

The transfer review's settings form is filled once, when the component is created, from a store that may still hold the defaults while its HTTP load is in flight. Opening `/transactions` directly or right after sign-in shows the defaults, and Save writes them back over the stored values.

## Current situation (as-is)

- [`TransferReviewComponent.settingsForm`](../../../src/app/feature-transactions/components/transfer-review/transfer-review.component.ts) (lines 58-61) is a field initialiser reading `settingsStore.matchWindowDays()` and `autoLinkMediumConfidence()` once.
- [`TransferSettingsStore`](../../../src/app/core/state/transfer-settings.store.ts) starts on `DEFAULT_TRANSFER_SETTINGS` and patches the server's row when `hydrate()` resolves. Nothing re-fills the form when that happens.
- `saveSettings` sends the whole `getRawValue()` through `settingsStore.update`, so both fields are written, including the one the user didn't touch.
- **Root cause:** the form copies the store's value at construction instead of following it, and Save isn't gated on the store having loaded. On a failed load the store stays on defaults with `error` set, and Save still writes them.

## Desired result (to-be)

- When the store finishes loading, the form shows the saved values (unless the user has already edited it).
- Save is disabled while the settings are loading or failed to load, so the defaults are never written over stored settings.

## Acceptance criteria

- [ ] With a stored match window of 7 days, opening `/transactions` directly (fresh load) shows 7 once the store loads, not the default.
- [ ] Toggling "auto-link medium confidence" and saving keeps the stored match window.
- [ ] While `TransferSettingsStore.loading()` is true, or `error()` is set, Save is disabled. A failed load never leads to a write.
- [ ] A user edit made before the load lands isn't overwritten by it (the form re-fills only while pristine).
- [ ] Writes still go through `TransferSettingsStore.update` → `TransferSettingsRepository`.
- [ ] Unit tests in `transfer-review.component.spec.ts` cover: form re-fills when the store hydrates after construction; Save disabled while loading and after a failed load; a dirty form isn't overwritten by a late load.
- [ ] Live browser check: set a non-default window, reload directly on `/transactions`, and confirm the form shows it.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- An `effect` that `patchValue`s the form from the store's two signals while `settingsForm.pristine` is the smallest fix. Wrapping the panel in `mm-hydration-boundary` / `hydrationOf(settingsStore)` (the pattern TICKET-NG-11 rolls out) would also work, but it hides the whole review panel during the load just to fix one form.
- `ambiguousCandidates` reads the store's signals directly, so it already follows the load. Only the form is affected.
