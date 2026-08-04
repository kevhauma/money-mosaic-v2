import type { Transaction } from '@/core/data-access';
import {
  describeExcludedFilterAxes,
  excludedFilterAxisLabels,
  filtersToRuleConditions,
  matchesTransactionFilters,
  type TransactionFilters,
} from './transaction-filters';

const noFilters: TransactionFilters = {
  accountId: '',
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  text: '',
  amountMin: '',
  amountMax: '',
  amountDirection: 'all',
};

/**
 * The baseline with the direction pinned to Expenses — what `noFilters` itself was before
 * TICKET-TXN-10 made `'all'` the default. The two describes below shadow `noFilters` with it, so
 * every TICKET-TXN-08 assertion inside them reads exactly as it did.
 */
const expenseBaseline: TransactionFilters = { ...noFilters, amountDirection: 'expense' };

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-15',
  amount: -42,
  currency: 'EUR',
  rawDescription: 'Grocery run',
  counterpartyName: 'Super Market',
  fingerprint: 'fp-1',
  createdAt: '2026-06-15T00:00:00.000Z',
  ...overrides,
});

describe('matchesTransactionFilters', () => {
  it('matches everything when no filter is active', () => {
    expect(matchesTransactionFilters(transaction(), noFilters, new Set())).toBe(true);
  });

  describe('account axis', () => {
    it('matches the transaction on the selected account', () => {
      const filters = { ...noFilters, accountId: '1' };
      expect(matchesTransactionFilters(transaction({ accountId: 1 }), filters, new Set())).toBe(
        true,
      );
    });

    it('rejects a transaction on a different account', () => {
      const filters = { ...noFilters, accountId: '2' };
      expect(matchesTransactionFilters(transaction({ accountId: 1 }), filters, new Set())).toBe(
        false,
      );
    });
  });

  describe('date range axis', () => {
    it('rejects a transaction booked before dateFrom', () => {
      const filters = { ...noFilters, dateFrom: '2026-06-16' };
      expect(
        matchesTransactionFilters(transaction({ bookingDate: '2026-06-15' }), filters, new Set()),
      ).toBe(false);
    });

    it('rejects a transaction booked after dateTo', () => {
      const filters = { ...noFilters, dateTo: '2026-06-14' };
      expect(
        matchesTransactionFilters(transaction({ bookingDate: '2026-06-15' }), filters, new Set()),
      ).toBe(false);
    });

    it('matches a transaction inside the range', () => {
      const filters = { ...noFilters, dateFrom: '2026-06-01', dateTo: '2026-06-30' };
      expect(
        matchesTransactionFilters(transaction({ bookingDate: '2026-06-15' }), filters, new Set()),
      ).toBe(true);
    });
  });

  describe('category axis', () => {
    it('matches a transaction with the selected category', () => {
      const filters = { ...noFilters, categoryId: '3' };
      expect(matchesTransactionFilters(transaction({ categoryId: 3 }), filters, new Set())).toBe(
        true,
      );
    });

    it('rejects a transaction with a different category', () => {
      const filters = { ...noFilters, categoryId: '3' };
      expect(matchesTransactionFilters(transaction({ categoryId: 4 }), filters, new Set())).toBe(
        false,
      );
    });

    it('uncategorised sentinel matches a transaction with no category', () => {
      const filters = { ...noFilters, categoryId: 'uncategorised' };
      expect(
        matchesTransactionFilters(transaction({ categoryId: undefined }), filters, new Set()),
      ).toBe(true);
    });

    it('uncategorised sentinel rejects a transaction that already has a category', () => {
      const filters = { ...noFilters, categoryId: 'uncategorised' };
      expect(matchesTransactionFilters(transaction({ categoryId: 3 }), filters, new Set())).toBe(
        false,
      );
    });

    it('uncategorised sentinel rejects a movement to an own savings account (TICKET-TRF-02)', () => {
      const filters = { ...noFilters, categoryId: 'uncategorised' };
      const ownSavingsIbans = new Set(['BE00SAVINGS']);
      expect(
        matchesTransactionFilters(
          transaction({ categoryId: undefined, counterpartyIban: 'BE00SAVINGS' }),
          filters,
          ownSavingsIbans,
        ),
      ).toBe(false);
    });

    it('uncategorised sentinel rejects a transaction linked as a transfer (TICKET-TRF-01)', () => {
      const filters = { ...noFilters, categoryId: 'uncategorised' };
      expect(
        matchesTransactionFilters(
          transaction({ categoryId: undefined, transferId: 42 }),
          filters,
          new Set(),
        ),
      ).toBe(false);
    });
  });

  describe('text axis', () => {
    it('matches on rawDescription, case-insensitively', () => {
      const filters = { ...noFilters, text: 'grocery' };
      expect(
        matchesTransactionFilters(
          transaction({ rawDescription: 'Grocery Run' }),
          filters,
          new Set(),
        ),
      ).toBe(true);
    });

    it('matches on counterpartyName', () => {
      const filters = { ...noFilters, text: 'super market' };
      expect(
        matchesTransactionFilters(
          transaction({ rawDescription: 'x', counterpartyName: 'Super Market' }),
          filters,
          new Set(),
        ),
      ).toBe(true);
    });

    it('rejects when the needle appears nowhere', () => {
      const filters = { ...noFilters, text: 'zzz' };
      expect(matchesTransactionFilters(transaction(), filters, new Set())).toBe(false);
    });
  });

  describe('amount axis (TICKET-TXN-08)', () => {
    describe('expense direction', () => {
      const noFilters = expenseBaseline;

      it('matches a transaction with magnitude inside the range', () => {
        const filters = { ...noFilters, amountMin: '10', amountMax: '50' };
        expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
          true,
        );
      });

      it('rejects a transaction below amountMin', () => {
        const filters = { ...noFilters, amountMin: '50' };
        expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
          false,
        );
      });

      it('rejects a transaction above amountMax', () => {
        const filters = { ...noFilters, amountMax: '10' };
        expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
          false,
        );
      });

      it('matches on the boundary (magnitude equal to min and max)', () => {
        const filters = { ...noFilters, amountMin: '42', amountMax: '42' };
        expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
          true,
        );
      });

      it('rejects an income transaction even when its magnitude is in range', () => {
        const filters = { ...noFilters, amountMin: '10', amountMax: '50' };
        expect(matchesTransactionFilters(transaction({ amount: 42 }), filters, new Set())).toBe(
          false,
        );
      });

      it('is equivalent to the pre-TICKET-TXN-08 manually-signed range (regression)', () => {
        // Old behaviour: raw signed Min=-50/Max=-10 matched amounts in [-50,-10].
        // New behaviour: Expenses switch + magnitude Min=10/Max=50 matches the same set.
        const filters = { ...noFilters, amountMin: '10', amountMax: '50' };
        expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
          true,
        );
        expect(matchesTransactionFilters(transaction({ amount: -5 }), filters, new Set())).toBe(
          false,
        );
        expect(matchesTransactionFilters(transaction({ amount: -60 }), filters, new Set())).toBe(
          false,
        );
      });
    });

    describe('income direction', () => {
      const income = { ...noFilters, amountDirection: 'income' as const };

      it('matches a transaction with magnitude inside the range', () => {
        const filters = { ...income, amountMin: '10', amountMax: '50' };
        expect(matchesTransactionFilters(transaction({ amount: 42 }), filters, new Set())).toBe(
          true,
        );
      });

      it('rejects a transaction below amountMin', () => {
        const filters = { ...income, amountMin: '50' };
        expect(matchesTransactionFilters(transaction({ amount: 42 }), filters, new Set())).toBe(
          false,
        );
      });

      it('rejects a transaction above amountMax', () => {
        const filters = { ...income, amountMax: '10' };
        expect(matchesTransactionFilters(transaction({ amount: 42 }), filters, new Set())).toBe(
          false,
        );
      });

      it('matches on the boundary (magnitude equal to min and max)', () => {
        const filters = { ...income, amountMin: '42', amountMax: '42' };
        expect(matchesTransactionFilters(transaction({ amount: 42 }), filters, new Set())).toBe(
          true,
        );
      });

      it('rejects an expense transaction even when its magnitude is in range', () => {
        const filters = { ...income, amountMin: '10', amountMax: '50' };
        expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
          false,
        );
      });
    });

    describe('direction filters on its own, without a bound (TICKET-TXN-10)', () => {
      const mixed = [
        transaction({ id: 1, amount: 2800 }),
        transaction({ id: 2, amount: 12.5 }),
        transaction({ id: 3, amount: -42 }),
        transaction({ id: 4, amount: -900 }),
      ];
      const surviving = (filters: TransactionFilters): number[] =>
        mixed.filter((t) => matchesTransactionFilters(t, filters, new Set())).map((t) => t.id!);

      it('"Income" with both amount fields empty hides every expense', () => {
        // The bug: this check used to live *inside* `if (amountMin !== null || amountMax !== null)`,
        // so picking Income with no bounds left the expenses in the table.
        expect(surviving({ ...noFilters, amountDirection: 'income' })).toEqual([1, 2]);
      });

      it('"Expenses" with both amount fields empty hides every income', () => {
        expect(surviving({ ...noFilters, amountDirection: 'expense' })).toEqual([3, 4]);
      });

      it('"All" with both amount fields empty keeps everything', () => {
        expect(surviving(noFilters)).toEqual([1, 2, 3, 4]);
      });

      it('"All" with a bound filters by magnitude across both signs', () => {
        // One income and one expense of the same magnitude — a size filter, not a sign filter.
        const sameMagnitude = [
          transaction({ id: 1, amount: 500 }),
          transaction({ id: 2, amount: -500 }),
        ];
        const filters = { ...noFilters, amountMin: '100', amountMax: '900' };

        expect(
          sameMagnitude
            .filter((t) => matchesTransactionFilters(t, filters, new Set()))
            .map((t) => t.id),
        ).toEqual([1, 2]);
        expect(surviving(filters)).toEqual([4]);
      });

      it('treats a zero-amount transaction as income, matching the ">= 0" boundary', () => {
        const zero = transaction({ amount: 0 });

        expect(
          matchesTransactionFilters(zero, { ...noFilters, amountDirection: 'income' }, new Set()),
        ).toBe(true);
        expect(
          matchesTransactionFilters(zero, { ...noFilters, amountDirection: 'expense' }, new Set()),
        ).toBe(false);
      });
    });
  });

  it('combines axes with AND semantics', () => {
    const filters: TransactionFilters = {
      accountId: '1',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      categoryId: '',
      text: 'grocery',
      amountMin: '0',
      amountMax: '100',
      amountDirection: 'expense',
    };
    expect(
      matchesTransactionFilters(
        transaction({ accountId: 1, bookingDate: '2026-06-15', amount: -42 }),
        filters,
        new Set(),
      ),
    ).toBe(true);

    // Same transaction, but the account axis alone now disqualifies it.
    expect(
      matchesTransactionFilters(
        transaction({ accountId: 2, bookingDate: '2026-06-15', amount: -42 }),
        filters,
        new Set(),
      ),
    ).toBe(false);
  });
});

describe('filtersToRuleConditions (TICKET-CAT-07)', () => {
  it('returns nothing for an all-empty filter set', () => {
    expect(filtersToRuleConditions(noFilters)).toEqual([]);
  });

  it('converts text alone into a description-contains condition', () => {
    expect(filtersToRuleConditions({ ...noFilters, text: 'netflix' })).toEqual([
      { field: 'description', operator: 'contains', value: 'netflix' },
    ]);
  });

  it('converts accountId alone into an accountId-equals condition', () => {
    expect(filtersToRuleConditions({ ...noFilters, accountId: '2' })).toEqual([
      { field: 'accountId', operator: 'equals', value: 2 },
    ]);
  });

  describe('amount axis, expense direction', () => {
    const noFilters = expenseBaseline;

    it('both bounds set converts to a between condition, re-signed negative', () => {
      expect(filtersToRuleConditions({ ...noFilters, amountMin: '10', amountMax: '50' })).toEqual([
        { field: 'amount', operator: 'between', value: [-50, -10] },
      ]);
    });

    it('only amountMin set converts to a "<" condition against the re-signed bound', () => {
      expect(filtersToRuleConditions({ ...noFilters, amountMin: '10' })).toEqual([
        { field: 'amount', operator: '<', value: -10 },
      ]);
    });

    it('only amountMax set converts to a ">" condition against the re-signed bound', () => {
      expect(filtersToRuleConditions({ ...noFilters, amountMax: '50' })).toEqual([
        { field: 'amount', operator: '>', value: -50 },
      ]);
    });
  });

  describe('amount axis, income direction', () => {
    const income = { ...noFilters, amountDirection: 'income' as const };

    it('both bounds set converts to a between condition, unsigned', () => {
      expect(filtersToRuleConditions({ ...income, amountMin: '10', amountMax: '50' })).toEqual([
        { field: 'amount', operator: 'between', value: [10, 50] },
      ]);
    });

    it('only amountMin set converts to a ">" condition', () => {
      expect(filtersToRuleConditions({ ...income, amountMin: '10' })).toEqual([
        { field: 'amount', operator: '>', value: 10 },
      ]);
    });

    it('only amountMax set converts to a "<" condition', () => {
      expect(filtersToRuleConditions({ ...income, amountMax: '50' })).toEqual([
        { field: 'amount', operator: '<', value: 50 },
      ]);
    });
  });

  describe('amount axis, "all" direction (TICKET-TXN-10)', () => {
    it('drops the amount condition rather than guessing a sign', () => {
      // `|amount| >= 10` is `amount <= -10` OR `amount >= 10`, and RuleCondition has no `or` — so
      // emitting either signed branch would convert the filter into something narrower than what
      // the user was looking at.
      expect(filtersToRuleConditions({ ...noFilters, amountMin: '10', amountMax: '50' })).toEqual(
        [],
      );
      expect(filtersToRuleConditions({ ...noFilters, amountMin: '10' })).toEqual([]);
      expect(filtersToRuleConditions({ ...noFilters, amountMax: '50' })).toEqual([]);
    });

    it('still converts the other axes alongside it', () => {
      expect(filtersToRuleConditions({ ...noFilters, text: 'rent', amountMin: '10' })).toEqual([
        { field: 'description', operator: 'contains', value: 'rent' },
      ]);
    });
  });

  it('combines every convertible axis at once', () => {
    const filters: TransactionFilters = {
      ...expenseBaseline,
      text: 'netflix',
      accountId: '2',
      amountMin: '10',
      amountMax: '50',
    };

    expect(filtersToRuleConditions(filters)).toEqual([
      { field: 'description', operator: 'contains', value: 'netflix' },
      { field: 'accountId', operator: 'equals', value: 2 },
      { field: 'amount', operator: 'between', value: [-50, -10] },
    ]);
  });

  it('omits date range and category — they have no matching RuleCondition field', () => {
    expect(
      filtersToRuleConditions({
        ...noFilters,
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
        categoryId: '3',
      }),
    ).toEqual([]);
  });
});

describe('excludedFilterAxisLabels (TICKET-CAT-07)', () => {
  it('returns nothing when no date/category filter is active', () => {
    expect(excludedFilterAxisLabels({ ...noFilters, text: 'x', accountId: '1' })).toEqual([]);
  });

  it('flags an active date range', () => {
    expect(excludedFilterAxisLabels({ ...noFilters, dateFrom: '2026-06-01' })).toEqual([
      'Date range',
    ]);
    expect(excludedFilterAxisLabels({ ...noFilters, dateTo: '2026-06-30' })).toEqual([
      'Date range',
    ]);
  });

  it('flags an active category', () => {
    expect(excludedFilterAxisLabels({ ...noFilters, categoryId: '3' })).toEqual(['Category']);
  });

  it('flags an amount bound with no direction, which no rule condition can express (TICKET-TXN-10)', () => {
    expect(excludedFilterAxisLabels({ ...noFilters, amountMin: '10' })).toEqual(['Amount']);
    expect(excludedFilterAxisLabels({ ...noFilters, amountMax: '50' })).toEqual(['Amount']);
    // A direction makes it convertible again, so it isn't excluded.
    expect(
      excludedFilterAxisLabels({ ...noFilters, amountDirection: 'income', amountMin: '10' }),
    ).toEqual([]);
    // …and a direction with no bound has nothing to convert either way.
    expect(excludedFilterAxisLabels({ ...noFilters, amountDirection: 'income' })).toEqual([]);
  });

  it('flags both together', () => {
    expect(
      excludedFilterAxisLabels({ ...noFilters, dateFrom: '2026-06-01', categoryId: '3' }),
    ).toEqual(['Date range', 'Category']);
  });
});

describe('describeExcludedFilterAxes (TICKET-CAT-07)', () => {
  it('returns null for an empty label list', () => {
    expect(describeExcludedFilterAxes([])).toBeNull();
  });

  it('describes a single excluded axis in the singular', () => {
    expect(describeExcludedFilterAxes(['Date range'])).toBe(
      "Date range filter isn't included — rules can't match on that yet.",
    );
  });

  it('describes multiple excluded axes in the plural', () => {
    expect(describeExcludedFilterAxes(['Date range', 'Category'])).toBe(
      "Date range and Category filters aren't included — rules can't match on those yet.",
    );
  });
});
