# TICKET-IMP-12 — Extract the wizard's batch-wait card into a presentational component

- **Area:** Import
- **Type:** Refactor
- **Traceability:** CR4-1 §1 Option C ([solution doc](../solutions/CR4-01-template-complexity.md))

## User story

As a developer reading the import wizard template, I want the batch-waiting paper (message + filename + "Map this file individually" button) to be its own named dumb component, so the wizard template's branch count stops including the card's internals.

## Description

The user-selected remainder of CR4-1 §1 after TICKET-IMP-11 absorbs Options A/B: extract the lines-90–102 paper from the wizard template into a small presentational component.

## Current situation (as-is)

- [import-wizard.component.html](../../../src/app/feature-import/components/import-wizard/import-wizard.component.html) inlines the batch-wait card inside the step-2 nesting (cognitive complexity 45 pre-IMP-11).

## Desired result (to-be)

- A `batch-wait-card` (naming per conventions) presentational component in `feature-import/components/`, taking the filename/message as inputs and emitting the map-individually action; the wizard template renders one element in the `@switch` branch.

## Acceptance criteria

- [ ] The card renders identically (live browser check during a batch import with a header mismatch) — **skipped**: the user explicitly asked to skip live browser verification for this whole ticket batch. Component-level spec (`batch-wait-card.component.spec.ts`) confirms the waiting/mismatch text and file name render and the output emits, but this was never exercised in a real browser.
- [x] No logic in the child beyond inputs/outputs; wizard passes data from the session's computeds.
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Sequence after TICKET-IMP-11 — the `@switch` branch this component slots into is created there.
