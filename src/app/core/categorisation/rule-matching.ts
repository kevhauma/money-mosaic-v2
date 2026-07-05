import type { Rule, RuleCondition, Transaction } from '@/core/data-access';

export const OPERATORS_BY_FIELD: Record<RuleCondition['field'], RuleCondition['operator'][]> = {
  description: ['contains', 'equals', 'regex'],
  counterpartyName: ['contains', 'equals', 'regex'],
  counterpartyIban: ['contains', 'equals', 'regex'],
  amount: ['equals', '>', '<', 'between'],
  accountId: ['equals'],
};

const fieldValue = (transaction: Transaction, field: RuleCondition['field']): string | number => {
  switch (field) {
    case 'description':
      return transaction.rawDescription;
    case 'counterpartyName':
      return transaction.counterpartyName ?? '';
    case 'counterpartyIban':
      return transaction.counterpartyIban ?? '';
    case 'amount':
      return transaction.amount;
    case 'accountId':
      return transaction.accountId;
  }
};

export const conditionMatches = (transaction: Transaction, condition: RuleCondition): boolean => {
  const actual = fieldValue(transaction, condition.field);

  switch (condition.operator) {
    case 'contains':
      return String(actual).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'equals':
      return typeof actual === 'number'
        ? actual === Number(condition.value)
        : String(actual).toLowerCase() === String(condition.value).toLowerCase();
    case 'regex':
      try {
        return new RegExp(String(condition.value), 'i').test(String(actual));
      } catch {
        return false;
      }
    case '>':
      return Number(actual) > Number(condition.value);
    case '<':
      return Number(actual) < Number(condition.value);
    case 'between': {
      const [min, max] = condition.value as [number, number];
      return Number(actual) >= min && Number(actual) <= max;
    }
  }
};

export const matchesRule = (transaction: Transaction, rule: Rule): boolean => {
  if (rule.conditions.length === 0) return false;
  const matches = (condition: RuleCondition): boolean => conditionMatches(transaction, condition);
  // Anything other than the explicit 'any' (including a legacy rule with no field) means AND.
  return rule.conditionMatch === 'any'
    ? rule.conditions.some(matches)
    : rule.conditions.every(matches);
};

/** Evaluates enabled rules in priority order (ascending = higher priority). First match wins unless `continueOnMatch` lets a later rule override the assignment (FR-CAT-2). */
export const resolveCategoryForTransaction = (
  transaction: Transaction,
  rules: Rule[],
): number | undefined => {
  const sortedRules = [...rules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority);

  let result: number | undefined;
  for (const rule of sortedRules) {
    if (matchesRule(transaction, rule)) {
      result = rule.action.setCategoryId;
      if (!rule.continueOnMatch) {
        return result;
      }
    }
  }
  return result;
};
