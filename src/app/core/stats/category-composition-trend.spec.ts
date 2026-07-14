import type { Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown } from './category-breakdown';
import { computeCategoryCompositionTrend } from './category-composition-trend';

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

describe('computeCategoryCompositionTrend', () => {
  it('selects top-N categories by whole-range total, not per-bucket totals', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries' })],
      [2, category({ id: 2, name: 'Travel' })],
    ]);
    const transactions = [
      // Whole-range: Groceries (300) > Travel (200) — Groceries should rank first.
      transaction({ id: 1, bookingDate: '2026-01-05', amount: -300, categoryId: 1 }),
      // Travel spikes in a single bucket, but its whole-range total still trails Groceries.
      transaction({ id: 2, bookingDate: '2026-02-05', amount: -200, categoryId: 2 }),
    ];

    const result = computeCategoryCompositionTrend(
      transactions,
      categoriesById,
      '2026-01-01',
      '2026-02-28',
      'month',
    );

    expect(result.expenseSeries.map((s) => s.categoryId)).toEqual([1, 2]);
  });

  it('never includes a category outside the top-N in any bucket, and zero-fills inactive buckets', () => {
    const categoriesById = new Map<number, Category>(
      Array.from({ length: 6 }, (_, i) => [i + 1, category({ id: i + 1, name: `Cat${i + 1}` })]),
    );
    // 6 categories, each with a distinct descending total so category 6 falls outside the top 5.
    const transactions = Array.from({ length: 6 }, (_, i) =>
      transaction({
        id: i + 1,
        bookingDate: '2026-01-10',
        amount: -(600 - i * 100),
        categoryId: i + 1,
      }),
    );

    const result = computeCategoryCompositionTrend(
      transactions,
      categoriesById,
      '2026-01-01',
      '2026-02-28',
      'month',
    );

    expect(result.expenseSeries).toHaveLength(5);
    expect(result.expenseSeries.map((s) => s.categoryId)).not.toContain(6);

    // February bucket has no activity for any category — every top-N series still has a 0 entry
    // aligned to bucketKeys, not a missing one.
    const febIndex = result.bucketKeys.indexOf('2026-02');
    for (const series of result.expenseSeries) {
      expect(series.values[febIndex]).toBe(0);
      expect(series.values).toHaveLength(result.bucketKeys.length);
    }
  });

  it('matches computeCategoryBreakdown() called directly for each bucket (no drift)', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries' })],
      [2, category({ id: 2, name: 'Salary', kind: 'income' })],
    ]);
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-10', amount: -50, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-02-10', amount: -80, categoryId: 1 }),
      transaction({ id: 3, bookingDate: '2026-02-15', amount: 2000, categoryId: 2 }),
    ];

    const result = computeCategoryCompositionTrend(
      transactions,
      categoriesById,
      '2026-01-01',
      '2026-02-28',
      'month',
    );

    for (const bucketKey of result.bucketKeys) {
      const [year, month] = bucketKey.split('-');
      const start = `${year}-${month}-01`;
      const end = new Date(Date.UTC(Number(year), Number(month), 0)).toISOString().slice(0, 10);
      const direct = computeCategoryBreakdown(transactions, categoriesById, start, end);
      const bucketIndex = result.bucketKeys.indexOf(bucketKey);

      for (const series of result.expenseSeries) {
        const directTotal =
          direct.expenseByCategory.find((e) => e.categoryId === series.categoryId)?.total ?? 0;
        expect(series.values[bucketIndex]).toBe(directTotal);
      }
      for (const series of result.incomeSeries) {
        const directTotal =
          direct.incomeBySource.find((e) => e.categoryId === series.categoryId)?.total ?? 0;
        expect(series.values[bucketIndex]).toBe(directTotal);
      }
    }
  });

  it('uses the uncategorised grey fallback and "Uncategorised" name for the null-category entry', () => {
    const categoriesById = new Map<number, Category>();
    const transactions = [transaction({ id: 1, bookingDate: '2026-01-10', amount: -50 })];

    const result = computeCategoryCompositionTrend(
      transactions,
      categoriesById,
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(result.expenseSeries).toEqual([
      { categoryId: null, name: 'Uncategorised', color: '#9ca3af', values: [50] },
    ]);
  });
});
