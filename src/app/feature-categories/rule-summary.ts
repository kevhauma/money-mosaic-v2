import type { Rule, RuleCondition } from '@/core/data-access';
import { FIELD_LABELS, OPERATOR_LABELS } from './rule-labels';

const describeCondition = (
  condition: RuleCondition,
  resolveAccountName?: (accountId: number) => string,
): string => {
  let displayValue: string;
  if (condition.field === 'accountId' && resolveAccountName) {
    displayValue = resolveAccountName(Number(condition.value));
  } else if (condition.operator === 'between') {
    const [min, max] = condition.value as [number, number];
    displayValue = `${min} and ${max}`;
  } else {
    displayValue = String(condition.value);
  }
  return `${FIELD_LABELS[condition.field]} ${OPERATOR_LABELS[condition.operator]} "${displayValue}"`;
};

/**
 * Human-readable summary of a rule's conditions, joined by the combinator the rule declares —
 * `' OR '` for `conditionMatch: 'any'`, `' AND '` otherwise (including legacy rules with no field).
 */
export const describeRule = (
  rule: Rule,
  resolveAccountName?: (accountId: number) => string,
): string => {
  const separator = rule.conditionMatch === 'any' ? ' OR ' : ' AND ';
  return rule.conditions
    .map((condition) => describeCondition(condition, resolveAccountName))
    .join(separator);
};
