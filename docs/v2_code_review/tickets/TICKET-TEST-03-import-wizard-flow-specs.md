# TICKET-TEST-03 — Pin the import wizard's flow-level behaviors with specs

- **Area:** Testing / Import
- **Type:** Refactor
- **Traceability:** CR4-2 sequencing note ([solution doc](../solutions/CR4-02-import-wizard-commit-flow.md) — "the regression suite this flow has never had at the flow level")

## User story

As a developer about to restructure the import wizard's commit flow, I want its four correctness invariants pinned by flow-level specs first, so the TICKET-IMP-11 refactor has a safety net against double-commit and wrong-account-attribution regressions.

## Description

Test-only ticket, same role TICKET-TEST-02 played for the CR3 refactors. The wizard's commit/auto-commit invariants are currently enforced by signal-ordering and guard fields but asserted nowhere at flow level; write the specs against the *current* component before the session-store extraction changes where the logic lives.

## Current situation (as-is)

- [import-wizard.component.ts](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) owns the auto-commit `effect()` and the `autoCommittedFileIndex` guard; existing specs cover units, not the four flow invariants.
- The global fake-indexeddb setup ([src/test-setup.ts](../../../src/test-setup.ts)) already supports exercising Dexie for real in specs, so flow-level tests are possible today.

## Desired result (to-be)

Specs (component-level, driving the wizard through its public surface) that pin:

1. exactly one commit per file under batch auto-advance;
2. a header mismatch pauses the batch;
3. a failed account creation stops that file and its linked drafts;
4. undo removes exactly one batch.

## Acceptance criteria

- [x] All four invariants have failing-if-broken specs (verify each by temporarily inverting the guarded condition locally).
- [x] Specs go through stores/repositories and fake-indexeddb — no direct `appDb` table writes from test arrangement helpers beyond what existing spec utilities already do.
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Must land **before** TICKET-IMP-11; the specs should survive the extraction with only injection-site changes, which is itself evidence the refactor preserved behavior.
