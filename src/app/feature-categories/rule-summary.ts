import type { Rule, RuleCondition } from '@/core/data-access';

const FIELD_LABELS: Record<RuleCondition['field'], string> = {
  description: 'Description',
  counterpartyName: 'Counterparty name',
  counterpartyIban: 'Counterparty IBAN',
  amount: 'Amount',
  accountId: 'Account',
};

const OPERATOR_LABELS: Record<RuleCondition['operator'], string> = {
  contains: 'contains',
  equals: 'equals',
  regex: 'matches',
  '>': '>',
  '<': '<',
  between: 'between',
};

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
