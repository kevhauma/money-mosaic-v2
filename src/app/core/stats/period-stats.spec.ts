import type { Transaction } from '@/core/data-access';
import { computePeriodStats } from './period-stats';

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

describe('computePeriodStats', () => {
  it('sums income and expense separately and computes net + savings rate', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -300 }),
      transaction({ id: 3, amount: -200 }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 1000,
      expense: 500,
      net: 500,
      savingsRate: 0.5,
    });
  });

  it('excludes transactions linked as transfers from both income and expense (FR-STAT-2)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -1000, transferId: 7 }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 1000,
      expense: 0,
      net: 1000,
      savingsRate: 1,
    });
  });

  it('excludes transactions outside the date range', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000, bookingDate: '2026-06-30' }),
      transaction({ id: 2, amount: -300, bookingDate: '2026-07-15' }),
      transaction({ id: 3, amount: -200, bookingDate: '2026-08-01' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 0,
      expense: 300,
      net: -300,
      savingsRate: null,
    });
  });

  it('includes transactions on the exact from/to boundary dates', () => {
    const transactions = [
      transaction({ id: 1, amount: 100, bookingDate: '2026-07-01' }),
      transaction({ id: 2, amount: 100, bookingDate: '2026-07-31' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31').income).toBe(200);
  });

  it('returns null savings rate when income is zero, rather than dividing by zero', () => {
    const transactions = [transaction({ id: 1, amount: -100 })];
    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31').savingsRate).toBeNull();
  });
});
