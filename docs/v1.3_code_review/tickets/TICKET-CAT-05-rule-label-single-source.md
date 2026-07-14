# TICKET-CAT-05 — Single-source the rule field/operator display labels

- **Area:** Categorisation (rules UI)
- **Type:** Refactor
- **Traceability:** CR2-3.3 (carried over, still open)

## User story

As a developer adding a rule field or operator, I want its display label declared once, so the rule form's dropdowns and the rule summary line can never disagree about what an operator is called.

## Description

The human-readable labels for rule condition fields and operators exist twice with nothing linking the copies: `rule-summary.ts` has module-level `FIELD_LABELS`/`OPERATOR_LABELS` records, and `rule-form.component.ts` re-declares its own `fieldOptions` labels and `operatorLabels`. Adding an operator (or rewording one) requires remembering both sites.

## Current situation (as-is)

- [rule-summary.ts:3-16](../../../src/app/feature-categories/rule-summary.ts) — `FIELD_LABELS` and `OPERATOR_LABELS`, keyed by the `RuleCondition` unions (module-private).
- [rule-form.component.ts:56-71](../../../src/app/feature-categories/components/rule-form/rule-form.component.ts) — `fieldOptions` (value+label pairs, labels retyped) and `operatorLabels` (full record, retyped).
- `OPERATORS_BY_FIELD` in [rule-matching.ts:3-9](../../../src/app/core/categorisation/rule-matching.ts) already single-sources *which* operators apply per field — only the labels are duplicated.

## Desired result (to-be)

- One exported label source in the feature (e.g. `rule-labels.ts` next to `rule-summary.ts`, or exported from it): `FIELD_LABELS`, `OPERATOR_LABELS`, both `Record<union, string>` so an added union member is a compile error until labelled.
- `rule-form` derives `fieldOptions` from `FIELD_LABELS` (order preserved — keep an explicit ordered key array if object-key order is too implicit) and consumes `OPERATOR_LABELS` directly; its local copies are deleted.
- `describeRule` keeps working off the same records.

## Acceptance criteria

- [ ] Each label string exists exactly once in `src` (`grep -rn "matches regex" src` → one hit).
- [ ] Adding a hypothetical operator to `RuleCondition['operator']` fails compilation until both label records cover it (i.e. the records stay exhaustively typed, no `Partial`).
- [ ] Rule form dropdowns and rule summary lines render unchanged — existing `rule-summary.spec.ts` and rule-form specs pass; live browser check of the rules page (create/edit a rule, summary text).
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Keep the labels in `feature-categories` (they're presentation), not in `core/categorisation` — `OPERATORS_BY_FIELD` stays where it is.
