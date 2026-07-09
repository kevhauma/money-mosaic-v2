import type { Account, Category, Transaction, Transfer } from '@/core/data-access';
import type { JointLegContext } from './classify-joint-leg';
import { computeAccountBalanceTrends } from './account-balance-trend';
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

describe('computeAccountBalanceTrends: per-account joint stake sums to the combined line (TICKET-STAT-03)', () => {
  it('sums each account’s own series to the same figure as the combined computeNetWorthTrend', () => {
    const jointAccount: Account = {
      id: 1,
      name: 'Joint',
      type: 'joint',
      currency: 'EUR',
      openingBalance: 0,
      openingBalanceDate: '2026-01-01',
      color: '#000000',
      icon: 'users',
      archived: false,
      ownershipShare: 0.5,
    };
    const ownAccount: Account = {
      id: 2,
      name: 'Checking',
      type: 'checking',
      currency: 'EUR',
      openingBalance: 1000,
      openingBalanceDate: '2026-01-01',
      color: '#000000',
      icon: 'wallet',
      archived: false,
    };
    const accounts = [jointAccount, ownAccount];

    const transferIn = transaction({
      id: 1,
      accountId: 1,
      amount: 500,
      transferId: 10,
      bookingDate: '2026-01-05',
    });
    const transferOut = transaction({
      id: 2,
      accountId: 2,
      amount: -500,
      transferId: 10,
      bookingDate: '2026-01-05',
    });
    const groceries = transaction({ id: 3, accountId: 1, amount: -200, bookingDate: '2026-01-10' });
    const transactions = [transferIn, transferOut, groceries];
    const transfer: Transfer = {
      id: 10,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-01-05T00:00:00.000Z',
    };
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, jointAccount],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [1, transfer],
        [2, transfer],
      ]),
      categoriesById: new Map<number, Category>(),
    };

    const perAccountSeries = computeAccountBalanceTrends(
      transactions,
      accounts,
      '2026-01-01',
      '2026-01-31',
      'month',
      context,
    );
    const combined = computeNetWorthTrend(
      transactions,
      accounts,
      '2026-01-01',
      '2026-01-31',
      'month',
      context,
    );

    const summedPerAccount = perAccountSeries.reduce(
      (sum, series) => sum + series.points[0].netWorth,
      0,
    );
    expect(summedPerAccount).toBe(combined[0].netWorth);
  });
});
