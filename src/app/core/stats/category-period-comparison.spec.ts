import type { Category, Transaction } from '@/core/data-access';
import { computeCategoryPeriodComparison } from './category-period-comparison';
import type { ComparisonWindowPeriod } from './period-window';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#111111',
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
  rawDescription: 'x',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

const period = (from: string, to: string, isSelected = false): ComparisonWindowPeriod => ({
  from,
  to,
  isSelected,
});

describe('computeCategoryPeriodComparison', () => {
  it('selects its top categories from the selected period only, not the window average', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries' })],
      [2, category({ id: 2, name: 'Travel' })],
    ]);
    const window = [period('2026-06-01', '2026-06-30'), period('2026-07-01', '2026-07-31', true)];

    const transactions = [
      // Selected period: Groceries only.
      transaction({ id: 1, bookingDate: '2026-07-05', amount: -50, categoryId: 1 }),
      // Prior period: Travel spikes far higher than Groceries ever does in the selected period.
      transaction({ id: 2, bookingDate: '2026-06-05', amount: -5000, categoryId: 2 }),
    ];

    const result = computeCategoryPeriodComparison(transactions, categoriesById, window);

    expect(result.entries.map((entry) => entry.categoryId)).toEqual([1]);
  });

  it('excludes a genuinely empty period from average/highest/lowest but counts a real zero', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries' })],
      [2, category({ id: 2, name: 'Other' })],
    ]);
    const window = [
      period('2026-04-01', '2026-04-30'), // genuinely empty: no transactions at all
      period('2026-05-01', '2026-05-31'), // has activity, but none in Groceries -> real 0
      period('2026-06-01', '2026-06-30', true),
    ];
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-05-10', amount: -20, categoryId: 2 }),
      transaction({ id: 2, bookingDate: '2026-06-10', amount: -80, categoryId: 1 }),
    ];

    const result = computeCategoryPeriodComparison(transactions, categoriesById, window);
    const groceries = result.entries.find((entry) => entry.categoryId === 1)!;

    expect(groceries.perPeriod).toEqual([0, 0, 80]);
    // Average over May (real 0) + June (80) only — April contributes nothing.
    expect(groceries.average).toBe(40);
    expect(groceries.lowest).toBe(0);
    expect(groceries.highest).toBe(80);
    expect(groceries.selectedTotal).toBe(80);
  });

  it('flags the biggest positive and negative delta vs. average among the top categories', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries' })],
      [2, category({ id: 2, name: 'Travel' })],
    ]);
    const window = [period('2026-05-01', '2026-05-31'), period('2026-06-01', '2026-06-30', true)];
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-05-10', amount: -100, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-06-10', amount: -200, categoryId: 1 }), // Groceries up
      transaction({ id: 3, bookingDate: '2026-05-15', amount: -100, categoryId: 2 }),
      transaction({ id: 4, bookingDate: '2026-06-15', amount: -20, categoryId: 2 }), // Travel down
    ];

    const result = computeCategoryPeriodComparison(transactions, categoriesById, window);

    expect(result.biggestIncreaseCategoryId).toBe(1);
    expect(result.biggestDecreaseCategoryId).toBe(2);
  });

  it('reports hasEnoughData as false when fewer than 2 window periods have any activity', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const window = [period('2026-05-01', '2026-05-31'), period('2026-06-01', '2026-06-30', true)];
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-06-10', amount: -50, categoryId: 1 }),
    ];

    const result = computeCategoryPeriodComparison(transactions, categoriesById, window);

    expect(result.hasEnoughData).toBe(false);
  });

  it('reports hasEnoughData as true once 2 window periods have activity', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const window = [period('2026-05-01', '2026-05-31'), period('2026-06-01', '2026-06-30', true)];
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-05-10', amount: -30, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-06-10', amount: -50, categoryId: 1 }),
    ];

    const result = computeCategoryPeriodComparison(transactions, categoriesById, window);

    expect(result.hasEnoughData).toBe(true);
  });

  it('caps the selected categories at 4, even when more had spend in the selected period', () => {
    const categoriesById = new Map<number, Category>(
      Array.from({ length: 5 }, (_, i) => [i + 1, category({ id: i + 1, name: `Cat ${i + 1}` })]),
    );
    const window = [period('2026-07-01', '2026-07-31', true)];
    const transactions = Array.from({ length: 5 }, (_, i) =>
      transaction({ id: i + 1, amount: -(100 - i), categoryId: i + 1 }),
    );

    const result = computeCategoryPeriodComparison(transactions, categoriesById, window);

    expect(result.entries).toHaveLength(4);
    expect(result.entries.map((entry) => entry.categoryId)).toEqual([1, 2, 3, 4]);
  });

  it('excludes user-selected categories from the top-N pick, letting the next-largest take its place', () => {
    const categoriesById = new Map<number, Category>(
      Array.from({ length: 5 }, (_, i) => [i + 1, category({ id: i + 1, name: `Cat ${i + 1}` })]),
    );
    const window = [period('2026-07-01', '2026-07-31', true)];
    const transactions = Array.from({ length: 5 }, (_, i) =>
      transaction({ id: i + 1, amount: -(100 - i), categoryId: i + 1 }),
    );

    const result = computeCategoryPeriodComparison(
      transactions,
      categoriesById,
      window,
      new Set(),
      new Map(),
      new Set([1, 2]),
    );

    expect(result.entries.map((entry) => entry.categoryId)).toEqual([3, 4, 5]);
  });

  it('never excludes the uncategorised bucket, even if its id-like sentinel were passed', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const window = [period('2026-07-01', '2026-07-31', true)];
    const transactions = [
      transaction({ id: 1, amount: -50, categoryId: undefined }),
      transaction({ id: 2, amount: -20, categoryId: 1 }),
    ];

    const result = computeCategoryPeriodComparison(
      transactions,
      categoriesById,
      window,
      new Set(),
      new Map(),
      new Set([1]),
    );

    expect(result.entries.map((entry) => entry.categoryId)).toEqual([null]);
  });
});
