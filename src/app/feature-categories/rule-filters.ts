import type { Rule } from '@/core/data-access';
import { describeRule } from './rule-summary';

/** The filter axes the Rules screen's search/filter bar exposes (TICKET-CAT-04). */
export type RuleFilters = {
  text: string;
  categoryId: string;
  enabled: '' | 'enabled' | 'disabled';
};

/**
 * Pure predicate for whether a rule survives every active filter axis, mirroring
 * `matchesTransactionFilters` so the Rules screen's filter bar follows the same shape.
 */
export function matchesRuleFilters(
  rule: Rule,
  filters: RuleFilters,
  resolveAccountName?: (accountId: number) => string,
): boolean {
  if (filters.categoryId && rule.action.setCategoryId !== Number(filters.categoryId)) return false;

  if (filters.enabled === 'enabled' && !rule.enabled) return false;
  if (filters.enabled === 'disabled' && rule.enabled) return false;

  if (filters.text) {
    const haystack = `${rule.name} ${describeRule(rule, resolveAccountName)}`.toLowerCase();
    if (!haystack.includes(filters.text.toLowerCase())) return false;
  }

  return true;
}
