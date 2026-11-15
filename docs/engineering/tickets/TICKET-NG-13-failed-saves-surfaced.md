# TICKET-NG-13 — Failed saves are shown; dialogs close only on success

- **Area:** Cross-cutting (feature forms, store writes)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-19; extends TICKET-SRV-06 (failures are shown, not swallowed) from reads to writes; touches the goal form (TICKET-FUT-02) and the loan form (TICKET-LOAN-03)

## User story

As a user adding a goal while the server is down or refuses the input, I want to see that the save failed and keep my form open, so I don't believe a goal exists that was never stored.

## Description

The goal and loan forms emit `saved` and close themselves in the same tick, before the parent's async save runs. The store only updates after the server answers, and many writes are `void`-ed fire-and-forget calls. With no app-level handling, a rejected save closes the dialog, adds nothing, and says nothing — at most a console line from Angular's default `ErrorHandler`.

## Current situation (as-is)

- [goal-form.component.ts:130-138](../../../src/app/feature-future/components/goal-form/goal-form.component.ts) — `this.saved.emit({...})` then `this.open.set(false)`; the parent's [goals-panel.component.ts:127-138](../../../src/app/feature-future/components/goals-panel/goals-panel.component.ts) `saveGoal` awaits `addGoal`/`updateGoal` after the dialog is already gone.
- [loan-form.component.ts:236-245](../../../src/app/feature-loans/components/loan-form/loan-form.component.ts) — same emit-then-close; parents [loans-overview.component.ts:62-69](../../../src/app/feature-loans/components/loans-overview/loans-overview.component.ts) (`saveLoan`) and [loan-detail.component.ts:129-135](../../../src/app/feature-loans/components/loan-detail/loan-detail.component.ts) (`saveEdit`).
- [loan-detail.component.ts:137-145](../../../src/app/feature-loans/components/loan-detail/loan-detail.component.ts) — `toggleArchive` fires `void loansStore.archiveLoan/unarchiveLoan`. About 70 `void this.<store>.<write>()` calls across 26 non-spec files follow the same pattern.
- [app.config.ts](../../../src/app/app.config.ts) — `provideBrowserGlobalErrorListeners()` and no custom `ErrorHandler`; `shared/ui` has `alert` but no toast.

## Desired result (to-be)

- Goal and loan forms stay open while the save runs (submit disabled), close on success, and show the server's message in an inline `mm-alert` on failure, keeping the entered values.
- Fire-and-forget writes surface their failure: one shared mechanism (an app `ErrorHandler` that shows the message of a rejected write, or a small helper the `void` call sites use) — not a per-call `try/catch`. Transport failures keep going to the existing server-status banner, not a second message.
- Expected outcomes (4xx with a server message) are shown to the user; unexpected errors (`TypeError`s) are still logged with their stack.

## Acceptance criteria

- [ ] "Add goal" with the repository rejecting `400 "Target amount must be positive"`: the dialog stays open, shows that message, and the goals list is unchanged.
- [ ] Same for add/edit loan from `/loans` and from `/loans/:id`.
- [ ] A successful save closes the dialog and the item appears, as today.
- [ ] Archive/unarchive loan rejecting with a 500: a visible error message appears and the loan's archived state is unchanged.
- [ ] A rejected `void store.setX()` from a settings toggle shows a message through the shared mechanism; a status-0 failure does not add a second message beside the server-unreachable banner.
- [ ] Writes keep going through stores/repositories; no component calls the API.
- [ ] Specs cover the goal-form and loan-form failure and success paths, and the shared mechanism.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: stop the API server, try "Add goal", see the error with the form still open; restart, save, see it close.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Distinguishing a 4xx from an unexpected error depends on [TICKET-NG-15](./TICKET-NG-15-api-client-keeps-http-status.md) (the status survives `ApiClient`); doable without it, simpler after it.
- Converting every `void` call site is not required if the shared mechanism catches unhandled rejections; check each remaining one still reaches it.
