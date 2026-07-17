import type { Category, Rule } from '@/core/data-access';
import {
  parseSharedRuleEntry,
  parseSharedRulesFile,
  toSharedRules,
  UNCATEGORISED_RULE_CATEGORY_NAME,
} from './rule-share';

const rule = (overrides: Partial<Rule> = {}): Rule => ({
  id: 1,
  name: 'Test rule',
  priority: 10,
  enabled: true,
  continueOnMatch: false,
  conditions: [{ field: 'description', operator: 'contains', value: 'carrefour' }],
  action: { setCategoryId: 1 },
  ...overrides,
});

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#4ADE80',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
  ...overrides,
});

describe('toSharedRules', () => {
  it('resolves each rule action to the category name instead of its id, sorted by priority', () => {
    const categoriesById = new Map([
      [1, category({ id: 1, name: 'Groceries' })],
      [2, category({ id: 2, name: 'Salary' })],
    ]);

    const result = toSharedRules(
      [
        rule({ id: 1, priority: 20, action: { setCategoryId: 2 } }),
        rule({ id: 2, priority: 10, action: { setCategoryId: 1 } }),
      ],
      categoriesById,
    );

    expect(result.rules.map((r) => r.action.setCategoryName)).toEqual(['Groceries', 'Salary']);
    expect(result.rules.map((r) => r.priority)).toEqual([10, 20]);
  });

  it('falls back to the Uncategorised label when a rule references a category that no longer exists', () => {
    const result = toSharedRules([rule({ action: { setCategoryId: 999 } })], new Map());

    expect(result.rules[0].action.setCategoryName).toBe(UNCATEGORISED_RULE_CATEGORY_NAME);
  });

  it('defaults a missing conditionMatch to "all"', () => {
    const result = toSharedRules([rule({ conditionMatch: undefined })], new Map([[1, category()]]));

    expect(result.rules[0].conditionMatch).toBe('all');
  });
});

describe('parseSharedRuleEntry', () => {
  const validEntry = {
    name: 'Groceries rule',
    priority: 10,
    enabled: true,
    continueOnMatch: false,
    conditionMatch: 'all',
    conditions: [{ field: 'description', operator: 'contains', value: 'carrefour' }],
    action: { setCategoryName: 'Groceries' },
  };

  it('accepts a well-formed entry', () => {
    const result = parseSharedRuleEntry(validEntry);
    expect('error' in result).toBe(false);
  });

  it('rejects an entry missing a name', () => {
    const result = parseSharedRuleEntry({ ...validEntry, name: '' });
    expect(result).toMatchObject({ error: expect.stringMatching(/name/) });
  });

  it('rejects an entry with no conditions', () => {
    const result = parseSharedRuleEntry({ ...validEntry, conditions: [] });
    expect(result).toMatchObject({ error: expect.stringMatching(/conditions/) });
  });

  it('rejects an entry with an unrecognised condition operator', () => {
    const result = parseSharedRuleEntry({
      ...validEntry,
      conditions: [{ field: 'description', operator: 'startsWith', value: 'x' }],
    });
    expect(result).toMatchObject({ error: expect.stringMatching(/unrecognised/) });
  });

  it('rejects an entry with an unrecognised condition field', () => {
    const result = parseSharedRuleEntry({
      ...validEntry,
      conditions: [{ field: 'notes', operator: 'contains', value: 'x' }],
    });
    expect(result).toMatchObject({ error: expect.stringMatching(/unrecognised/) });
  });

  it('rejects an entry missing a category name', () => {
    const result = parseSharedRuleEntry({ ...validEntry, action: {} });
    expect(result).toMatchObject({ error: expect.stringMatching(/category/) });
  });

  it('defaults enabled to true and continueOnMatch to false when absent', () => {
    const { name, priority, conditionMatch, conditions, action } = validEntry;
    const result = parseSharedRuleEntry({ name, priority, conditionMatch, conditions, action });
    expect(result).toMatchObject({ enabled: true, continueOnMatch: false });
  });
});

describe('parseSharedRulesFile', () => {
  it('throws for a file with no rules array', () => {
    expect(() => parseSharedRulesFile({})).toThrow(/not a Money Mosaic rules export/);
  });

  it('separates parseable entries from unrepairable ones instead of failing the whole file', () => {
    const result = parseSharedRulesFile({
      schemaVersion: 1,
      exportedAt: '2026-07-16T00:00:00.000Z',
      rules: [
        {
          name: 'Good rule',
          priority: 10,
          enabled: true,
          continueOnMatch: false,
          conditionMatch: 'all',
          conditions: [{ field: 'description', operator: 'contains', value: 'x' }],
          action: { setCategoryName: 'Groceries' },
        },
        { name: '' },
      ],
    });

    expect(result.entries).toHaveLength(1);
    expect(result.skipped).toEqual([{ index: 1, reason: expect.any(String) }]);
  });
});
