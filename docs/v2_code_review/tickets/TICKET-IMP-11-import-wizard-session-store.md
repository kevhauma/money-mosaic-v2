# TICKET-IMP-11 — Extract an `ImportWizardSession` state machine from the wizard component

- **Area:** Import
- **Type:** Refactor
- **Traceability:** CR4-2 Option A ([solution doc](../solutions/CR4-02-import-wizard-commit-flow.md)); supersedes CR4-1 §1 Options A/B ([template doc](../solutions/CR4-01-template-complexity.md))

## User story

As a developer maintaining the import flow, I want the wizard's session state and commit orchestration in one injectable class with named transitions, so the "one commit per file" invariant is a property of a single-writer state machine that specs can drive directly, instead of an emergent property of ~10 signals, an ambient `effect()`, and two non-reactive guard fields.

## Description

The chosen fix for the hardest-to-reason-about code in the app. Move the whole wizard session — `step`, `queue`, `pendingDrafts`, `currentFileIndex`, `mapResult`, `batchMapping`, `manualOverrideActive`, `applyToRemaining`, `committing`, `commitResults`, `accountCreationError` — into an `ImportWizardSession` (signalStore scoped to the import route, or a plain signal-holding class). Components become views: they read computeds and call `advance()`, `commitCurrentFile()`, `overrideManually()`, `reset()`, etc.

## Current situation (as-is)

- [import-wizard.component.ts](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts): correctness depends on ordering interactions between the signals, the RxJS parse pipeline (`toObservable(parseInput).pipe(switchMap…)`), the auto-commit `effect()`, and the `autoCommittedFileIndex` guard field — spread across the wizard and [import-map-step](../../../src/app/feature-import/components/import-map-step/import-map-step.component.ts).
- The template renders the same state twice: the seven-condition Next-button `disabled` expression and the nested CTA label ladder ([import-wizard.component.html](../../../src/app/feature-import/components/import-wizard/import-wizard.component.html)).

## Desired result (to-be)

- `ImportWizardSession` owns the session state, the auto-commit trigger, and its single-flight guard; "one commit per file index" has one writer and is spec-tested by driving transitions.
- The parse pipeline moves into the session (or feeds it), making "commit is impossible while parsing" a session rule rather than a template `disabled` rule.
- CTA view model (`{ label, disabled }`) and a step-2 view discriminant (`'manual-map' | 'batch-waiting' | 'batch-mismatch' | 'not-ready'` rendered via one `@switch`) land as session/component computeds — the CR4-1 §1 A/B cleanups fall out of this ticket rather than being done separately.

## Acceptance criteria

- [ ] All session state listed above lives in `ImportWizardSession`; the wizard component holds no commit-ordering logic and no guard fields.
- [ ] The TICKET-TEST-03 flow specs pass unchanged in behavior (arrangement may move to driving the session).
- [ ] Session-level specs cover: double-advance cannot double-commit; `reset()`/`startNewImport()` clears all session state (explicit reset discipline if root-provided); manual override pauses batch mode.
- [ ] Template: Next-button `disabled` and CTA label bind to one CTA view model; step-2 nesting collapses to a single `@switch` on the view discriminant.
- [ ] All persistence still flows through existing repositories/stores — the session orchestrates, it does not touch `appDb` tables.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass; live browser check of a full CSV import (single + batch + mismatch + undo).
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs TICKET-IMP-10 (types out first) and TICKET-TEST-03 (safety net) — in that order.
- Route-scoped store providers are new to this app (all stores are `providedIn: 'root'`); if root-provided instead, `reset()` discipline is mandatory — record the choice in the ticket on completion.
- CR4-2 Options B/C/D were considered and rejected in favor of A (superset). CR4-4 Option D (prefill service) may be revisited afterward — the session may become prefill's natural owner.
