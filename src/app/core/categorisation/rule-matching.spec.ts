import type { Rule, Transaction } from '@/core/data-access';
import { conditionMatches, matchesRule, resolveCategoryForTransaction } from './rule-matching';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 10,
  bookingDate: '2026-07-01',
  amount: -42.5,
  currency: 'EUR',
  rawDescription: 'CARREFOUR MARKET BRUSSELS',
  counterpartyName: 'Carrefour',
  counterpartyIban: 'BE68539007547034',
  fingerprint: 'fp',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const rule = (overrides: Partial<Rule> = {}): Rule => ({
  name: 'Test rule',
  priority: 10,
  enabled: true,
  continueOnMatch: false,
  conditions: [{ field: 'description', operator: 'contains', value: 'carrefour' }],
  action: { setCategoryId: 1 },
  ...overrides,
});

describe('conditionMatches: text operators', () => {
  it('contains is case-insensitive', () => {
    expect(
      conditionMatches(transaction(), {
        field: 'description',
        operator: 'contains',
        value: 'CARREFOUR',
      }),
    ).toBe(true);
    expect(
      conditionMatches(transaction(), {
        field: 'description',
        operator: 'contains',
        value: 'delhaize',
      }),
    ).toBe(false);
  });

  it('equals compares the whole string case-insensitively', () => {
    expect(
      conditionMatches(transaction(), {
        field: 'counterpartyName',
        operator: 'equals',
        value: 'carrefour',
      }),
    ).toBe(true);
    expect(
      conditionMatches(transaction(), {
        field: 'counterpartyName',
        operator: 'equals',
        value: 'carrefour market',
      }),
    ).toBe(false);
  });

  it('regex tests the field value', () => {
    expect(
      conditionMatches(transaction(), {
        field: 'description',
        operator: 'regex',
        value: '^CARREFOUR',
      }),
    ).toBe(true);
    expect(
      conditionMatches(transaction(), {
        field: 'description',
        operator: 'regex',
        value: '^DELHAIZE',
      }),
    ).toBe(false);
  });

  it('an invalid regex fails closed rather than throwing', () => {
    expect(
      conditionMatches(transaction(), {
        field: 'description',
        operator: 'regex',
        value: '(unterminated',
      }),
    ).toBe(false);
  });

  it('missing optional fields fall back to empty string', () => {
    expect(
      conditionMatches(transaction({ counterpartyIban: undefined }), {
        field: 'counterpartyIban',
        operator: 'contains',
        value: 'BE',
      }),
    ).toBe(false);
  });
});

describe('conditionMatches: numeric operators', () => {
  it('supports >, <, and equals on amount', () => {
    const txn = transaction({ amount: -42.5 });
    expect(conditionMatches(txn, { field: 'amount', operator: '<', value: 0 })).toBe(true);
    expect(conditionMatches(txn, { field: 'amount', operator: '>', value: 0 })).toBe(false);
    expect(conditionMatches(txn, { field: 'amount', operator: 'equals', value: -42.5 })).toBe(true);
  });

  it('supports between (inclusive) on amount', () => {
    const txn = transaction({ amount: -42.5 });
    expect(conditionMatches(txn, { field: 'amount', operator: 'between', value: [-50, -40] })).toBe(
      true,
    );
    expect(conditionMatches(txn, { field: 'amount', operator: 'between', value: [-50, -43] })).toBe(
      false,
    );
  });

  it('supports equals on accountId', () => {
    expect(
      conditionMatches(transaction({ accountId: 10 }), {
        field: 'accountId',
        operator: 'equals',
        value: 10,
      }),
    ).toBe(true);
    expect(
      conditionMatches(transaction({ accountId: 10 }), {
        field: 'accountId',
        operator: 'equals',
        value: 11,
      }),
    ).toBe(false);
  });
});

describe('matchesRule: all conditions must match (AND)', () => {
  it('matches only when every condition is satisfied', () => {
    const multiCondition = rule({
      conditions: [
        { field: 'description', operator: 'contains', value: 'carrefour' },
        { field: 'amount', operator: '<', value: 0 },
      ],
    });
    expect(matchesRule(transaction({ amount: -10 }), multiCondition)).toBe(true);
    expect(matchesRule(transaction({ amount: 10 }), multiCondition)).toBe(false);
  });

  it('a rule with no conditions never matches', () => {
    expect(matchesRule(transaction(), rule({ conditions: [] }))).toBe(false);
  });

  it('a rule with no conditions never matches even with conditionMatch any', () => {
    expect(matchesRule(transaction(), rule({ conditionMatch: 'any', conditions: [] }))).toBe(false);
  });

  it('a rule without a conditionMatch field behaves as all (AND)', () => {
    const multiCondition = rule({
      conditions: [
        { field: 'description', operator: 'contains', value: 'carrefour' },
        { field: 'amount', operator: '<', value: 0 },
      ],
    });
    expect(multiCondition.conditionMatch).toBeUndefined();
    expect(matchesRule(transaction({ amount: -10 }), multiCondition)).toBe(true);
    expect(matchesRule(transaction({ amount: 10 }), multiCondition)).toBe(false);
  });
});

describe('matchesRule: any condition matches (OR)', () => {
  const orRule = (): Rule =>
    rule({
      conditionMatch: 'any',
      conditions: [
        { field: 'description', operator: 'contains', value: 'carrefour' },
        { field: 'description', operator: 'contains', value: 'delhaize' },
      ],
    });

  it('matches when one of several conditions matches', () => {
    expect(matchesRule(transaction({ rawDescription: 'DELHAIZE CITY' }), orRule())).toBe(true);
  });

  it('matches when a different condition matches', () => {
    expect(matchesRule(transaction({ rawDescription: 'CARREFOUR EXPRESS' }), orRule())).toBe(true);
  });

  it('does not match when none of the conditions match', () => {
    expect(matchesRule(transaction({ rawDescription: 'ALDI STORE' }), orRule())).toBe(false);
  });

  it('conditionMatch all still requires every condition', () => {
    const andRule = rule({
      conditionMatch: 'all',
      conditions: [
        { field: 'description', operator: 'contains', value: 'carrefour' },
        { field: 'description', operator: 'contains', value: 'delhaize' },
      ],
    });
    expect(matchesRule(transaction({ rawDescription: 'CARREFOUR EXPRESS' }), andRule)).toBe(false);
  });
});

describe('resolveCategoryForTransaction: priority and continueOnMatch', () => {
  it('applies the highest-priority matching rule (first-match-wins)', () => {
    const rules = [
      rule({ priority: 20, action: { setCategoryId: 2 } }),
      rule({ priority: 10, action: { setCategoryId: 1 } }),
    ];
    expect(resolveCategoryForTransaction(transaction(), rules)).toBe(1);
  });

  it('a later rule overrides the assignment only when the earlier rule set continueOnMatch', () => {
    const rules = [
      rule({ priority: 10, continueOnMatch: true, action: { setCategoryId: 1 } }),
      rule({ priority: 20, action: { setCategoryId: 2 } }),
    ];
    expect(resolveCategoryForTransaction(transaction(), rules)).toBe(2);
  });

  it('stops at the first match when continueOnMatch is false', () => {
    const rules = [
      rule({ priority: 10, continueOnMatch: false, action: { setCategoryId: 1 } }),
      rule({ priority: 20, action: { setCategoryId: 2 } }),
    ];
    expect(resolveCategoryForTransaction(transaction(), rules)).toBe(1);
  });

  it('ignores disabled rules', () => {
    const rules = [rule({ enabled: false, action: { setCategoryId: 1 } })];
    expect(resolveCategoryForTransaction(transaction(), rules)).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    const rules = [
      rule({ conditions: [{ field: 'description', operator: 'contains', value: 'delhaize' }] }),
    ];
    expect(resolveCategoryForTransaction(transaction(), rules)).toBeUndefined();
  });
});
