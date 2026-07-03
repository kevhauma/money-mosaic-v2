import type { Transaction } from '@/core/data-access';
import { computePeriodStats } from './period-stats';
import { computeTrendBuckets } from './trend-buckets';

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

describe('computeTrendBuckets', () => {
  it('groups income/expense per bucket and fills empty buckets with zero', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000, bookingDate: '2026-01-10' }),
      transaction({ id: 2, amount: -200, bookingDate: '2026-03-05' }),
    ];

    const buckets = computeTrendBuckets(transactions, '2026-01-01', '2026-03-31', 'month');

    expect(buckets).toEqual([
      {
        bucketKey: '2026-01',
        bucketStart: '2026-01-01',
        bucketEnd: '2026-01-31',
        income: 1000,
        expense: 0,
        net: 1000,
      },
      {
        bucketKey: '2026-02',
        bucketStart: '2026-02-01',
        bucketEnd: '2026-02-28',
        income: 0,
        expense: 0,
        net: 0,
      },
      {
        bucketKey: '2026-03',
        bucketStart: '2026-03-01',
        bucketEnd: '2026-03-31',
        income: 0,
        expense: 200,
        net: -200,
      },
    ]);
  });

  it('excludes transfer-linked and out-of-range transactions', () => {
    const transactions = [
      transaction({ id: 1, amount: 500, bookingDate: '2026-07-10', transferId: 1 }),
      transaction({ id: 2, amount: 500, bookingDate: '2026-06-10' }),
    ];

    const buckets = computeTrendBuckets(transactions, '2026-07-01', '2026-07-31', 'month');
    expect(buckets).toEqual([
      {
        bucketKey: '2026-07',
        bucketStart: '2026-07-01',
        bucketEnd: '2026-07-31',
        income: 0,
        expense: 0,
        net: 0,
      },
    ]);
  });

  it('sums to the same totals as computePeriodStats over the same full range (consistency check)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1200, bookingDate: '2026-01-05' }),
      transaction({ id: 2, amount: -300, bookingDate: '2026-02-14' }),
      transaction({ id: 3, amount: -150, bookingDate: '2026-03-20' }),
      transaction({ id: 4, amount: 800, bookingDate: '2026-03-25' }),
    ];

    const buckets = computeTrendBuckets(transactions, '2026-01-01', '2026-03-31', 'month');
    const bucketIncome = buckets.reduce((sum, bucket) => sum + bucket.income, 0);
    const bucketExpense = buckets.reduce((sum, bucket) => sum + bucket.expense, 0);

    const overall = computePeriodStats(transactions, '2026-01-01', '2026-03-31');
    expect(bucketIncome).toBe(overall.income);
    expect(bucketExpense).toBe(overall.expense);
  });
});
