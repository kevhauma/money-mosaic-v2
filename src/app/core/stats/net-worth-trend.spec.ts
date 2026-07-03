import type { Account, Transaction } from '@/core/data-access';
import { computeNetWorthTrend } from './net-worth-trend';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#000000',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-01-15',
  amount: 100,
  currency: 'EUR',
  rawDescription: 'Deposit',
  fingerprint: 'fp',
  createdAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

describe('computeNetWorthTrend', () => {
  it('snapshots cumulative balance at each bucket boundary', () => {
    const accounts = [account({ id: 1, openingBalance: 1000 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 200, bookingDate: '2026-01-10' }),
      transaction({ id: 2, accountId: 1, amount: -50, bookingDate: '2026-02-20' }),
    ];

    const points = computeNetWorthTrend(
      transactions,
      accounts,
      '2026-01-01',
      '2026-03-31',
      'month',
    );

    expect(points).toEqual([
      { bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1200 },
      { bucketKey: '2026-02', bucketEnd: '2026-02-28', netWorth: 1150 },
      { bucketKey: '2026-03', bucketEnd: '2026-03-31', netWorth: 1150 },
    ]);
  });

  it('sums balances across multiple accounts', () => {
    const accounts = [
      account({ id: 1, openingBalance: 100 }),
      account({ id: 2, openingBalance: 500 }),
    ];
    const transactions = [
      transaction({ id: 1, accountId: 2, amount: 50, bookingDate: '2026-01-10' }),
    ];

    const points = computeNetWorthTrend(
      transactions,
      accounts,
      '2026-01-01',
      '2026-01-31',
      'month',
    );
    expect(points).toEqual([{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 650 }]);
  });

  it('carries transactions before the range into the opening balance of the first bucket', () => {
    const accounts = [account({ id: 1, openingBalance: 0 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 300, bookingDate: '2025-12-01' }),
    ];

    const points = computeNetWorthTrend(
      transactions,
      accounts,
      '2026-01-01',
      '2026-01-31',
      'month',
    );
    expect(points).toEqual([{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 300 }]);
  });
});
