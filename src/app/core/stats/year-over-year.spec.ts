import type { Transaction } from '@/core/data-access';
import { computeYearOverYearComparison, shiftRangeByYears } from './year-over-year';

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

describe('shiftRangeByYears', () => {
  it('clamps Feb 29 in a leap-year range to Feb 28 in a non-leap target year', () => {
    expect(shiftRangeByYears('2024-02-29', '2024-02-29', 1)).toEqual({
      from: '2023-02-28',
      to: '2023-02-28',
    });
  });

  it('shifts a plain month range back by a whole calendar year unchanged otherwise', () => {
    expect(shiftRangeByYears('2026-07-01', '2026-07-31', 1)).toEqual({
      from: '2025-07-01',
      to: '2025-07-31',
    });
  });

  it('shifts a range spanning New Year’s Eve, moving each end’s year independently', () => {
    expect(shiftRangeByYears('2025-12-20', '2026-01-05', 1)).toEqual({
      from: '2024-12-20',
      to: '2025-01-05',
    });
  });

  it('lands on a leap day when shifting into another leap year', () => {
    expect(shiftRangeByYears('2024-02-29', '2024-02-29', 4)).toEqual({
      from: '2020-02-29',
      to: '2020-02-29',
    });
  });
});

describe('computeYearOverYearComparison', () => {
  it('reuses computePeriodStats and returns a delta vs. the immediately-prior year', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: 1200 }),
      transaction({ id: 2, bookingDate: '2026-07-15', amount: -400 }),
      transaction({ id: 3, bookingDate: '2025-07-01', amount: 1000 }),
      transaction({ id: 4, bookingDate: '2025-07-15', amount: -500 }),
      transaction({ id: 5, bookingDate: '2024-07-01', amount: 500 }),
    ];

    const result = computeYearOverYearComparison(
      transactions,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      new Map(),
      new Map(),
      3,
    );

    expect(result.current).toEqual({
      income: 1200,
      expense: 400,
      savings: 0,
      net: 800,
      savingsRate: 0,
    });
    expect(result.priorYears).toHaveLength(2);
    expect(result.priorYears[0]).toMatchObject({
      yearsBack: 1,
      from: '2025-07-01',
      to: '2025-07-31',
      stats: { income: 1000, expense: 500, net: 500 },
    });
    expect(result.delta).toEqual({
      income: (1200 - 1000) / 1000,
      expense: (400 - 500) / 500,
      net: (800 - 500) / 500,
    });
  });

  it('stops requesting years earlier than the dataset’s earliest transaction', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-15', amount: 100 }),
      transaction({ id: 2, bookingDate: '2025-08-01', amount: 100 }),
    ];

    const result = computeYearOverYearComparison(transactions, '2026-07-01', '2026-07-31');

    // 1 year back (2025-07-01..2025-07-31) predates the earliest transaction (2025-08-01) — no
    // qualifying prior year, so the comparison must not fabricate an all-zero one.
    expect(result.priorYears).toHaveLength(0);
    expect(result.delta).toBeNull();
  });

  it('returns a null delta for a fresh dataset with less than a year of history', () => {
    const transactions = [transaction({ id: 1, bookingDate: '2026-07-01', amount: 100 })];

    const result = computeYearOverYearComparison(transactions, '2026-06-01', '2026-07-31');

    expect(result.priorYears).toHaveLength(0);
    expect(result.delta).toBeNull();
  });

  it('leaves a metric’s delta null when its prior-year value was exactly zero', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: 100 }),
      transaction({ id: 2, bookingDate: '2025-07-01', amount: -50 }),
    ];

    const result = computeYearOverYearComparison(transactions, '2026-07-01', '2026-07-31');

    expect(result.priorYears).toHaveLength(1);
    // prior income is 0 (only an expense booked that year) — percent delta on income must be null, not +Infinity.
    expect(result.delta?.income).toBeNull();
  });

  it('caps at yearsBack even when more history is available', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-01', amount: 100 }),
      transaction({ id: 2, bookingDate: '2025-07-01', amount: 100 }),
      transaction({ id: 3, bookingDate: '2024-07-01', amount: 100 }),
      transaction({ id: 4, bookingDate: '2023-07-01', amount: 100 }),
      transaction({ id: 5, bookingDate: '2020-07-01', amount: 100 }),
    ];

    const result = computeYearOverYearComparison(
      transactions,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      new Map(),
      new Map(),
      2,
    );

    expect(result.priorYears.map((p) => p.yearsBack)).toEqual([1, 2]);
  });
});
