import type { Account, Transaction } from '@/core/data-access';
import { computeAccountBalanceTrends } from './account-balance-trend';

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

describe('computeAccountBalanceTrends', () => {
  it('produces one independent series per account, unaffected by other accounts transactions', () => {
    const accounts = [
      account({ id: 1, openingBalance: 1000 }),
      account({ id: 2, openingBalance: 500 }),
    ];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 200, bookingDate: '2026-01-10' }),
      transaction({ id: 2, accountId: 2, amount: -50, bookingDate: '2026-01-20' }),
    ];

    const series = computeAccountBalanceTrends(
      transactions,
      accounts,
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(series).toEqual([
      {
        accountId: 1,
        points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1200 }],
      },
      {
        accountId: 2,
        points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 450 }],
      },
    ]);
  });

  it('a transfer between two of the user own accounts moves balance from one series to the other', () => {
    const accounts = [account({ id: 1, openingBalance: 0 }), account({ id: 2, openingBalance: 0 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -300, bookingDate: '2026-01-05', transferId: 1 }),
      transaction({ id: 2, accountId: 2, amount: 300, bookingDate: '2026-01-05', transferId: 1 }),
    ];

    const series = computeAccountBalanceTrends(
      transactions,
      accounts,
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(series[0].points[0].netWorth).toBe(-300);
    expect(series[1].points[0].netWorth).toBe(300);
  });

  it('returns an empty array for an empty accounts list', () => {
    expect(computeAccountBalanceTrends([], [], '2026-01-01', '2026-01-31', 'month')).toEqual([]);
  });
});
