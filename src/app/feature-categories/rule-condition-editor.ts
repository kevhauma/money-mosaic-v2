import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import type { RuleCondition } from '@/core/data-access';
import { FIELD_LABELS } from './rule-labels';

/** One condition's reactive form group, as built by the rule form and rendered by `app-rule-condition-row`. */
export type ConditionGroup = FormGroup<{
  field: FormControl<RuleCondition['field']>;
  operator: FormControl<RuleCondition['operator']>;
  value: FormControl<string>;
  valueTo: FormControl<string>;
}>;

/** Fields whose condition value is a number rather than free text. */
export const NUMERIC_CONDITION_FIELDS: RuleCondition['field'][] = ['amount', 'accountId'];

/** Cheap ReDoS damage limitation on user-authored regex patterns (TICKET-PERF-02) — not a safety analysis. */
export const MAX_REGEX_PATTERN_LENGTH = 200;

/** Only applies to a condition whose sibling `operator` control is currently `regex`. */
export const regexPatternMaxLength = (control: AbstractControl): ValidationErrors | null => {
  const group = control.parent;
  if (!(group instanceof FormGroup) || group.get('operator')?.value !== 'regex') {
    return null;
  }
  const length = String(control.value ?? '').length;
  return length > MAX_REGEX_PATTERN_LENGTH
    ? { regexPatternMaxLength: { requiredLength: MAX_REGEX_PATTERN_LENGTH, actualLength: length } }
    : null;
};

/** Field dropdown options, derived once from the shared label map (TICKET-CAT-05). */
export const CONDITION_FIELD_OPTIONS: { value: RuleCondition['field']; label: string }[] =
  Object.entries(FIELD_LABELS).map(([value, label]) => ({
    value: value as RuleCondition['field'],
    label,
  }));

/**
 * Which value editor a condition row renders (TICKET-CAT-08, CR4-1 §6 Option A) — one exhaustive
 * discriminant replacing the `isAccountField`/`isBetween`/`isNumericField` boolean trio, so adding
 * the next editor is a new `@switch` branch here and in the row template.
 *
 * Precedence is the pre-extraction template's: the account picker wins over `between`, which wins
 * over the plain numeric input. (`accountId` only permits `equals` in `OPERATORS_BY_FIELD`, so the
 * first two can't collide through the UI today — the order is preserved regardless.)
 */
export type ConditionEditorKind = 'account' | 'between' | 'numeric' | 'text';

export const editorKindFor = (
  field: RuleCondition['field'],
  operator: RuleCondition['operator'],
): ConditionEditorKind => {
  if (field === 'accountId') return 'account';
  if (operator === 'between') return 'between';
  if (NUMERIC_CONDITION_FIELDS.includes(field)) return 'numeric';
  return 'text';
};
