import type { Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown } from './category-breakdown';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#000000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-15',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

describe('computeCategoryBreakdown', () => {
  it('splits expense and income totals by category kind with share-of-total summing to 1', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
      [2, category({ id: 2, name: 'Rent', kind: 'expense' })],
      [3, category({ id: 3, name: 'Salary', kind: 'income' })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: -60, categoryId: 1 }),
      transaction({ id: 2, amount: -40, categoryId: 2 }),
      transaction({ id: 3, amount: 2000, categoryId: 3 }),
    ];

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 60, share: 0.6, transactionCount: 1 },
      { categoryId: 2, total: 40, share: 0.4, transactionCount: 1 },
    ]);
    expect(incomeBySource).toEqual([{ categoryId: 3, total: 2000, share: 1, transactionCount: 1 }]);
  });

  it('buckets uncategorised transactions by amount sign into their own entry', () => {
    const categoriesById = new Map<number, Category>();
    const transactions = [transaction({ id: 1, amount: -30 }), transaction({ id: 2, amount: 500 })];

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([
      { categoryId: null, total: 30, share: 1, transactionCount: 1 },
    ]);
    expect(incomeBySource).toEqual([
      { categoryId: null, total: 500, share: 1, transactionCount: 1 },
    ]);
  });

  it('excludes movements to a savings account so they never surface as an uncategorised expense (TICKET-TRF-02)', () => {
    const categoriesById = new Map<number, Category>();
    const transactions = [
      // Uncategorised movement to an own savings account — must NOT appear as an expense entry.
      transaction({ id: 1, amount: -200, counterpartyIban: 'BE00SAVINGS' }),
      // A genuinely uncategorised spend still shows up.
      transaction({ id: 2, amount: -30, counterpartyIban: 'BE00SHOP' }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(['BE00SAVINGS']),
    );

    expect(expenseByCategory).toEqual([
      { categoryId: null, total: 30, share: 1, transactionCount: 1 },
    ]);
  });

  it('excludes transfer-linked transactions', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const transactions = [transaction({ id: 1, amount: -100, categoryId: 1, transferId: 5 })];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );
    expect(expenseByCategory).toEqual([]);
  });

  it('excludes transactions outside the date range', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const transactions = [
      transaction({ id: 1, amount: -100, categoryId: 1, bookingDate: '2026-06-01' }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );
    expect(expenseByCategory).toEqual([]);
  });

  it('excludes a neutral-kind category from both expenseByCategory and incomeBySource (TICKET-CAT-02)', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Partner contribution', kind: 'neutral' })],
      [2, category({ id: 2, name: 'Groceries', kind: 'expense' })],
    ]);
    const transactions = [
      // A partner's contribution: positive amount, but must never surface as an income source.
      transaction({ id: 1, amount: 500, categoryId: 1 }),
      transaction({ id: 2, amount: -60, categoryId: 2 }),
    ];

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(incomeBySource).toEqual([]);
    expect(expenseByCategory).toEqual([
      { categoryId: 2, total: 60, share: 1, transactionCount: 1 },
    ]);
  });

  it('sorts entries by total descending', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1 })],
      [2, category({ id: 2 })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: -10, categoryId: 1 }),
      transaction({ id: 2, amount: -90, categoryId: 2 }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );
    expect(expenseByCategory.map((entry) => entry.categoryId)).toEqual([2, 1]);
  });
});
