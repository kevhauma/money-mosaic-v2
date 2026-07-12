import type { Transaction } from '@/core/data-access';
import { bucketKeysInRange } from './date-buckets';
import { computePeriodStats } from './period-stats';
import { computeSpendingRate } from './spending-rate';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-13',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-13T00:00:00.000Z',
  ...overrides,
});

describe('computeSpendingRate', () => {
  it('returns day only for a 3-day range spanning a single week and month', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-13', amount: -30 }),
      transaction({ id: 2, bookingDate: '2026-07-14', amount: -60 }),
      transaction({ id: 3, bookingDate: '2026-07-15', amount: -90 }),
    ];

    expect(computeSpendingRate(transactions, '2026-07-13', '2026-07-15')).toEqual({
      avgPerDay: 60,
      avgPerWeek: null,
      avgPerMonth: null,
    });
  });

  it('returns day + week for a 10-day range spanning two weeks but one month', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: -100 }),
      transaction({ id: 2, bookingDate: '2026-07-10', amount: -200 }),
    ];

    expect(computeSpendingRate(transactions, '2026-07-01', '2026-07-10')).toEqual({
      avgPerDay: 30,
      avgPerWeek: 150,
      avgPerMonth: null,
    });
  });

  it('returns day + week + month for a 2-month range', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: -310 }),
      transaction({ id: 2, bookingDate: '2026-08-31', amount: -620 }),
    ];

    expect(computeSpendingRate(transactions, '2026-07-01', '2026-08-31')).toEqual({
      avgPerDay: 15,
      avgPerWeek: 93,
      avgPerMonth: 465,
    });
  });

  it('returns day only for a short all-time history that never reaches 2 week/month buckets', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: -20 }),
      transaction({ id: 2, bookingDate: '2026-07-02', amount: -40 }),
    ];

    expect(computeSpendingRate(transactions, '2026-07-01', '2026-07-02')).toEqual({
      avgPerDay: 30,
      avgPerWeek: null,
      avgPerMonth: null,
    });
  });

  it('derives from the same expense figure as computePeriodStats — avgPerDay * dayBucketCount ≈ periodStats.expense', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: -310 }),
      transaction({ id: 2, bookingDate: '2026-08-31', amount: -620 }),
    ];
    const from = '2026-07-01';
    const to = '2026-08-31';

    const rate = computeSpendingRate(transactions, from, to);
    const periodStats = computePeriodStats(transactions, from, to);
    const dayCount = bucketKeysInRange(from, to, 'day').length;

    expect(rate.avgPerDay * dayCount).toBeCloseTo(periodStats.expense, 10);
  });

  it('excludes savings movements from the expense figure exactly as computePeriodStats does', () => {
    const SAVINGS_IBAN = 'BE00SAVINGS';
    const ownSavings = new Set([SAVINGS_IBAN]);
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: -100 }),
      transaction({
        id: 2,
        bookingDate: '2026-07-02',
        amount: -200,
        counterpartyIban: SAVINGS_IBAN,
      }),
    ];

    expect(computeSpendingRate(transactions, '2026-07-01', '2026-07-02', ownSavings)).toEqual({
      avgPerDay: 50,
      avgPerWeek: null,
      avgPerMonth: null,
    });
  });
});
