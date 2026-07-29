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

- [x] The four editor kinds render and validate exactly as today, including the regex-length error on text — **but not browser-verified**: `rule-condition-row.component.spec.ts` asserts the rendered editor per kind (account picker, Min/Max pair, single number input, text input) and that the regex-length error shows on the text editor. The live browser check the AC asks for was skipped: the user explicitly asked to skip live browser verification for this whole ticket batch.
- [x] Unit tests cover `editorKindFor` for all four kinds and the operator-list swap on field change. (`rule-condition-editor.spec.ts` is TestBed-free per the pure-logic convention and also pins the account-over-between precedence; the row spec covers both operator-swap directions — swapped when the new field rejects the current operator, kept when it still allows it — plus the operator list itself.)
- [x] Rule persistence still flows through the store/repository; `categoryManual` overwrite protection untouched. (`submit`/`parseConditionValue`/`resetForm` and the whole `saved` output path are unchanged; nothing in this ticket touches the rules engine or the `categoryManual` flag.)
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass. (Lint clean, dev build clean, 1473/1475 tests pass. The failures are the pre-existing 20s-timeout flakes in `category-model.worker.spec.ts`'s TF.js training tests — reproduced on the unmodified tree before this batch; nothing here touches `core/ml`.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit`: 0 dead-code issues, 0 clone groups. Measured against the pre-change tree: the rule-form template drops cognitive 22 → 7 / cyclomatic 15 → 8, and the component drops cognitive 30 → 15 / cyclomatic 29 → 22; the extracted row template lands at cyclomatic 8 / cognitive 9. The remaining findings — `resetForm` (critical, cc 14), `newConditionGroup`, `regexPatternMaxLength` — are pre-existing and byte-identical before and after.)

## Notes

- Independent of the other CR4-1 tickets; the CAT-05 operator/label single-sourcing suggests this area keeps growing — which is why B was chosen over A-only.

## Implementation notes

- **The group is a typed `input()`, not `ControlContainer`/`formGroupName` wiring.** The to-be section named the ControlContainer pattern (citing TICKET-SOLID-06's `attribution-override-fieldset`, which in fact owns its own form rather than inheriting one). It was not used here: the row needs the `ConditionGroup` object itself for the editor discriminant, the operator list, and the `hasError('regexPatternMaxLength')` check, so it must receive the group regardless — and once it has it, binding `[formGroup]` inside the row is both type-safe and less machinery than injecting the parent container and addressing the item by index. The parent's `formArrayName="conditions"` wrapper is unchanged.
- `:host { display: contents }` keeps the parent `mm-flex` column laying out the row `<div>`s, same technique as `app-account-balance-block` (TICKET-ACC-06) and `app-transaction-row` (TICKET-TXN-09).
- The condition vocabulary moved out of the component into `feature-categories/rule-condition-editor.ts`, which now owns `ConditionGroup`, `NUMERIC_CONDITION_FIELDS`, `MAX_REGEX_PATTERN_LENGTH` + its validator, `CONDITION_FIELD_OPTIONS`, and `editorKindFor` — otherwise the row importing the group type from `rule-form.component.ts` (which imports the row) would be a cycle. `MAX_REGEX_PATTERN_LENGTH` is no longer re-exported from `rule-form.component.ts`; nothing imported it from there.
- `rule-form.component.spec.ts`'s "re-validates when switching from contains to regex" test now calls `updateValueAndValidity()` directly, since the handler that used to do it moved to the row; the handler itself is covered in the row's spec.
