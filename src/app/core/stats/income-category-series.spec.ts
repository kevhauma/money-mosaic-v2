import type { Category, Transaction } from '@/core/data-access';
import { computeCategoryCompositionTrend } from './category-composition-trend';
import { computeIncomeCategorySeries } from './income-category-series';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Salary',
  kind: 'income',
  color: '#34d399',
  icon: 'cash',
  archived: false,
  isSystem: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-01-15',
  amount: 2000,
  currency: 'EUR',
  rawDescription: 'x',
  fingerprint: 'fp',
  createdAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

const salaryAndOther = new Map<number, Category>([
  [1, category({ id: 1, name: 'Salary', color: '#34d399' })],
  [2, category({ id: 2, name: 'Other Income', color: '#2dd4bf' })],
]);

describe('computeIncomeCategorySeries: gap-filled buckets (FR-INC-2)', () => {
  it('returns no series and no buckets for an empty range with no selection', () => {
    const result = computeIncomeCategorySeries(
      [],
      new Map(),
      new Set(),
      '2026-01-01',
      '2026-01-01',
      'month',
    );

    expect(result.series).toEqual([]);
    expect(result.bucketKeys).toEqual(['2026-01']);
  });

  it('zero-fills every bucket for a selected category with no income at all', () => {
    const result = computeIncomeCategorySeries(
      [],
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-03-31',
      'month',
    );

    expect(result.bucketKeys).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(result.series).toEqual([
      { categoryId: 1, name: 'Salary', color: '#34d399', values: [0, 0, 0] },
    ]);
  });

  it('gives two overlapping income categories one aligned value per bucket each', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-01-20', amount: 150, categoryId: 2 }),
      transaction({ id: 3, bookingDate: '2026-02-15', amount: 2100, categoryId: 1 }),
      // Nothing for category 2 in February — it must still get a 0, not a hole.
      transaction({ id: 4, bookingDate: '2026-03-15', amount: 2100, categoryId: 1 }),
      transaction({ id: 5, bookingDate: '2026-03-18', amount: 90, categoryId: 2 }),
    ];

    const result = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1, 2]),
      '2026-01-01',
      '2026-03-31',
      'month',
    );

    expect(result.bucketKeys).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(result.series).toEqual([
      { categoryId: 1, name: 'Salary', color: '#34d399', values: [2000, 2100, 2100] },
      { categoryId: 2, name: 'Other Income', color: '#2dd4bf', values: [150, 0, 90] },
    ]);
  });

  it('every series has exactly one value per bucket key, whatever the granularity', () => {
    const result = computeIncomeCategorySeries(
      [transaction({ id: 1, bookingDate: '2026-02-10', amount: 500, categoryId: 1 })],
      salaryAndOther,
      new Set([1, 2]),
      '2026-01-01',
      '2026-12-31',
      'quarter',
    );

    expect(result.bucketKeys).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
    for (const series of result.series) {
      expect(series.values).toHaveLength(result.bucketKeys.length);
    }
  });
});

describe('computeIncomeCategorySeries: selection (FR-INC-3)', () => {
  it('omits a category excluded from the selection entirely', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-01-20', amount: 150, categoryId: 2 }),
    ];

    const result = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(result.series.map((s) => s.categoryId)).toEqual([1]);
  });

  it('leaves the remaining categories’ own totals untouched when one is deselected', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-01-20', amount: 150, categoryId: 2 }),
    ];
    const args = ['2026-01-01', '2026-01-31', 'month'] as const;

    const withBoth = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1, 2]),
      ...args,
    );
    const withOne = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1]),
      ...args,
    );

    expect(withOne.series[0].values).toEqual(withBoth.series[0].values);
  });

  it('applies no top-N cap: 7 selected income categories give 7 series', () => {
    const categoriesById = new Map<number, Category>(
      Array.from({ length: 7 }, (_, i) => [i + 1, category({ id: i + 1, name: `Income${i + 1}` })]),
    );
    // Descending totals, so a top-5 cap (the dashboard's behaviour) would drop ids 6 and 7.
    const transactions = Array.from({ length: 7 }, (_, i) =>
      transaction({
        id: i + 1,
        bookingDate: '2026-01-10',
        amount: 700 - i * 100,
        categoryId: i + 1,
      }),
    );
    const selected = new Set([1, 2, 3, 4, 5, 6, 7]);

    const result = computeIncomeCategorySeries(
      transactions,
      categoriesById,
      selected,
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(result.series).toHaveLength(7);
    expect(result.series.map((s) => s.categoryId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // The one behavioural difference from the dashboard's helper, asserted side by side.
    const dashboard = computeCategoryCompositionTrend(
      transactions,
      categoriesById,
      '2026-01-01',
      '2026-01-31',
      'month',
    );
    expect(dashboard.incomeSeries).toHaveLength(5);
  });
});

describe('computeIncomeCategorySeries: classification is delegated to classifyForStats', () => {
  it('ignores a linked transfer leg', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-01-16', amount: 500, categoryId: 1, transferId: 7 }),
    ];

    const result = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(result.series[0].values).toEqual([2000]);
  });

  it('ignores a nullified transaction', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
      transaction({
        id: 2,
        bookingDate: '2026-01-16',
        amount: 500,
        categoryId: 1,
        nullified: true,
      }),
    ];

    const result = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(result.series[0].values).toEqual([2000]);
  });

  it('ignores a withdrawal from an own savings account rather than counting it as income', () => {
    const savingsIban = 'BE68539007547034';
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
      transaction({
        id: 2,
        bookingDate: '2026-01-16',
        amount: 500,
        categoryId: 1,
        counterpartyIban: savingsIban,
      }),
    ];

    const result = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-01-31',
      'month',
      new Set([savingsIban]),
    );

    expect(result.series[0].values).toEqual([2000]);
  });

  it('nets a refund on an income category down rather than bucketing it as expense', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-01-20', amount: -200, categoryId: 1 }),
    ];

    const result = computeIncomeCategorySeries(
      transactions,
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(result.series[0].values).toEqual([1800]);
  });
});
