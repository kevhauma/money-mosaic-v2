import type { Rule } from '@/core/data-access';
import { describeRule } from './rule-summary';

const rule = (overrides: Partial<Rule> = {}): Rule => ({
  name: 'Test rule',
  priority: 10,
  enabled: true,
  continueOnMatch: false,
  conditions: [
    { field: 'description', operator: 'contains', value: 'carrefour' },
    { field: 'description', operator: 'contains', value: 'delhaize' },
  ],
  action: { setCategoryId: 1 },
  ...overrides,
});

describe('describeRule', () => {
  it('joins conditions with AND for conditionMatch all', () => {
    expect(describeRule(rule({ conditionMatch: 'all' }))).toBe(
      'Description contains "carrefour" AND Description contains "delhaize"',
    );
  });

  it('joins conditions with OR for conditionMatch any', () => {
    expect(describeRule(rule({ conditionMatch: 'any' }))).toBe(
      'Description contains "carrefour" OR Description contains "delhaize"',
    );
  });

  it('defaults to AND for a legacy rule with no conditionMatch field', () => {
    expect(describeRule(rule())).toContain(' AND ');
  });

  it('resolves account names via the provided resolver', () => {
    const accountRule = rule({
      conditionMatch: 'all',
      conditions: [{ field: 'accountId', operator: 'equals', value: 5 }],
    });
    expect(describeRule(accountRule, () => 'Checking')).toBe('Account equals "Checking"');
  });
});
