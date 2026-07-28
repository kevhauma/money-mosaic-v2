# TICKET-IMP-10 — Extract import-map-step's shared vocabulary and pure derivations

- **Area:** Import
- **Type:** Refactor
- **Traceability:** CR4-4 Options A+B, CR4-7 Instance 2 Option A ([solution doc](../solutions/CR4-04-import-map-step.md), [CR4-7 doc](../solutions/CR4-07-exports-from-component-files.md))

## User story

As a developer working in the import feature, I want the shared mapping types/constants and the pure derived-state functions out of the 506-line `import-map-step` component, so I can find and test the import vocabulary without paying the full component's context tax.

## Description

The mechanical floor of the CR4-4 decision (deeper cuts C1/D were explicitly deferred): move shared types and constants into plain modules, and lift the five pure computeds into module functions. Also resolves the import half of CR4-7 (domain types exported from component files with 4-file fan-in).

## Current situation (as-is)

- [import-map-step.component.ts](../../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) (506 lines + 225-line template) exports the feature's shared vocabulary: `ColumnFieldKey`, `ColumnFieldDef`, `COLUMN_FIELD_DEFS`, `ImportMappingResult`, `SIGN_CONVENTION_LABELS`, and the `MapperStep*` family — consumed by 4 files including sibling components and the wizard. [import-select-step](../../../src/app/feature-import/components/import-select-step/import-select-step.component.ts) similarly hosts queue/draft types.
- `resolvedSamples`, `duplicateWarnings`, `invalidFieldLabels`, `summaryRows`, and `stepStatus` are pure functions of `(formValue, headers, previewRows)` wrapped in `computed()`s, testable only through component rendering.

## Desired result (to-be)

- Plain modules in `feature-import/` (e.g. `column-mapping.ts`, `mapper-steps.ts`, and a queue/draft module for the select-step types) own the vocabulary; components import types, never the reverse; the feature barrel re-exports.
- The five pure derivations live as module functions with one-line `computed()` wrappers left in the component.

## Acceptance criteria

- [ ] No type, constant, or interface consumed by more than its host component remains exported from a `*.component.ts` file in `feature-import/`.
- [ ] All importers (siblings + wizard) updated; cross-feature consumers keep importing via the `@/feature-import` barrel; no behavior change.
- [ ] The five lifted functions get TestBed-free unit specs (cases: sample resolution per field kind, duplicate warning triggering, invalid-field labeling, summary-row assembly, step-status derivation).
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Prerequisite for TICKET-IMP-11 (session store) — do this first; it makes the behavioral diff reviewable.
- CR4-4 Options C1 (stepper factory) and D (prefill service) were considered and deliberately deferred; Option E's growth cap applies — new mapping concerns go into modules, not the component class (rule written down in TICKET-DX-05).
