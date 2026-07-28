# TICKET-CAT-08 — Rule-form editor discriminant + `rule-condition-row` extraction

- **Area:** Categories / Rules
- **Type:** Refactor
- **Traceability:** CR4-1 §6 Options A+B ([solution doc](../solutions/CR4-01-template-complexity.md))

## User story

As a developer extending rule conditions, I want the per-condition row in its own component with one exhaustive editor-kind switch, so adding the next value-editor kind is a new `@switch` branch in one cohesive file instead of a fourth boolean helper threaded through the modal.

## Description

Do Option A inside Option B: replace the three boolean helpers with a single `editorKindFor(group): 'account' | 'between' | 'numeric' | 'text'` rendered by one `@switch`, and extract the condition row (used from a `FormArray`) as a `rule-condition-row` component carrying `operatorsFor`, the field/operator change handlers, and the discriminant.

## Current situation (as-is)

- [rule-form.component.html](../../../src/app/feature-categories/components/rule-form/rule-form.component.html) (cognitive 22): the per-condition row (lines ~58–134) branches four ways on `isAccountField`/`isBetween`/`isNumericField`/else; everything else in the modal is a flat form.

## Desired result (to-be)

- `rule-condition-row` component under `feature-categories/components/`, wired for the `FormArray` via the standard `ControlContainer`/`viewProviders` pattern (prior art: TICKET-SOLID-06's `attribution-override-fieldset`).
- One `@switch` on the editor discriminant; the semi-redundant boolean helpers are gone.

## Acceptance criteria

- [ ] The four editor kinds render and validate exactly as today, including the regex-length error on text (live browser check while editing a rule with each condition kind).
- [ ] Unit tests cover `editorKindFor` for all four kinds and the operator-list swap on field change.
- [ ] Rule persistence still flows through the store/repository; `categoryManual` overwrite protection untouched.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Independent of the other CR4-1 tickets; the CAT-05 operator/label single-sourcing suggests this area keeps growing — which is why B was chosen over A-only.
