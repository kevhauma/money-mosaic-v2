import type { Rule } from '@/core/data-access';
import { matchesRuleFilters, type RuleFilters } from './rule-filters';

const noFilters: RuleFilters = {
  text: '',
  categoryId: '',
  enabled: '',
};

const rule = (overrides: Partial<Rule> = {}): Rule => ({
  id: 1,
  name: 'Groceries',
  priority: 10,
  enabled: true,
  continueOnMatch: false,
  conditions: [{ field: 'counterpartyName', operator: 'contains', value: 'Super Market' }],
  action: { setCategoryId: 3 },
  ...overrides,
});

describe('matchesRuleFilters', () => {
  it('matches everything when no filter is active', () => {
    expect(matchesRuleFilters(rule(), noFilters)).toBe(true);
  });

  describe('text axis', () => {
    it('matches on rule name, case-insensitively', () => {
      const filters: RuleFilters = { ...noFilters, text: 'grocer' };
      expect(matchesRuleFilters(rule({ name: 'Groceries' }), filters)).toBe(true);
    });

    it('matches on the describeRule() condition summary', () => {
      const filters: RuleFilters = { ...noFilters, text: 'super market' };
      expect(
        matchesRuleFilters(
          rule({
            name: 'Unrelated name',
            conditions: [
              { field: 'counterpartyName', operator: 'contains', value: 'Super Market' },
            ],
          }),
          filters,
        ),
      ).toBe(true);
    });

    it('rejects when the needle appears in neither name nor condition summary', () => {
      const filters: RuleFilters = { ...noFilters, text: 'zzz' };
      expect(matchesRuleFilters(rule(), filters)).toBe(false);
    });
  });

  describe('category axis', () => {
    it('isolates rules for the selected category', () => {
      const filters: RuleFilters = { ...noFilters, categoryId: '3' };
      expect(matchesRuleFilters(rule({ action: { setCategoryId: 3 } }), filters)).toBe(true);
    });

    it('rejects a rule targeting a different category', () => {
      const filters: RuleFilters = { ...noFilters, categoryId: '3' };
      expect(matchesRuleFilters(rule({ action: { setCategoryId: 4 } }), filters)).toBe(false);
    });
  });

  describe('enabled axis', () => {
    it('isolates enabled-only rules', () => {
      const filters: RuleFilters = { ...noFilters, enabled: 'enabled' };
      expect(matchesRuleFilters(rule({ enabled: true }), filters)).toBe(true);
      expect(matchesRuleFilters(rule({ enabled: false }), filters)).toBe(false);
    });

    it('isolates disabled-only rules', () => {
      const filters: RuleFilters = { ...noFilters, enabled: 'disabled' };
      expect(matchesRuleFilters(rule({ enabled: false }), filters)).toBe(true);
      expect(matchesRuleFilters(rule({ enabled: true }), filters)).toBe(false);
    });
  });

  it('combines axes with AND semantics', () => {
    const filters: RuleFilters = { text: 'grocer', categoryId: '3', enabled: 'enabled' };
    expect(
      matchesRuleFilters(
        rule({ name: 'Groceries', enabled: true, action: { setCategoryId: 3 } }),
        filters,
      ),
    ).toBe(true);

    // Same rule, but the enabled axis alone now disqualifies it.
    expect(
      matchesRuleFilters(
        rule({ name: 'Groceries', enabled: false, action: { setCategoryId: 3 } }),
        filters,
      ),
    ).toBe(false);
  });

  it('produces an empty result when no rule matches', () => {
    const rules = [rule({ name: 'Groceries' }), rule({ name: 'Rent', id: 2 })];
    const filters: RuleFilters = { ...noFilters, text: 'zzz' };
    expect(rules.filter((candidate) => matchesRuleFilters(candidate, filters))).toHaveLength(0);
  });
});
