import type { Account, Category, Transaction, Transfer } from '@/core/data-access';
import type { JointLegContext } from './classify-joint-leg';
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

describe('computeNetWorthTrend: joint account stake (TICKET-STAT-03)', () => {
  const jointAccount = (overrides: Partial<Account> = {}): Account => ({
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
    ...overrides,
  });

  const ownAccount: Account = {
    id: 2,
    name: 'Checking',
    type: 'checking',
    currency: 'EUR',
    openingBalance: 5000,
    openingBalanceDate: '2026-01-01',
    color: '#000000',
    icon: 'wallet',
    archived: false,
  };

  const neutralCategory: Category = {
    id: 1,
    name: 'Partner contribution',
    kind: 'neutral',
    color: '#000000',
    icon: 'users',
    archived: false,
    isSystem: true,
  };

  it('walks the trend by my stake, not the raw amount, for a joint account', () => {
    const transferOut = transaction({
      id: 2,
      accountId: 2,
      amount: -1000,
      transferId: 100,
      bookingDate: '2026-01-01',
    });
    const transferIn = transaction({
      id: 1,
      accountId: 1,
      amount: 1000,
      transferId: 100,
      bookingDate: '2026-01-01',
    });
    const partnerDeposit = transaction({
      id: 3,
      accountId: 1,
      amount: 1000,
      categoryId: 1,
      bookingDate: '2026-01-05',
    });
    const groceries = transaction({ id: 4, accountId: 1, amount: -400, bookingDate: '2026-01-10' });
    const transactions = [transferOut, transferIn, partnerDeposit, groceries];
    const transfer: Transfer = {
      id: 100,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-01-01T00:00:00.000Z',
    };
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, jointAccount()],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [1, transfer],
        [2, transfer],
      ]),
      categoriesById: new Map([[1, neutralCategory]]),
    };

    const points = computeNetWorthTrend(
      transactions,
      [jointAccount()],
      '2026-01-01',
      '2026-01-31',
      'month',
      context,
    );

    // My stake: +1000 (mineIn) + 0 (partner, coOwnerIn) - 200 (my share of €400 groceries) = 800.
    expect(points).toEqual([{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 800 }]);
  });

  it('agrees with a manually-summed point-in-time stake at the end of the range', () => {
    const transferOut = transaction({
      id: 2,
      accountId: 2,
      amount: -1000,
      transferId: 100,
      bookingDate: '2026-01-01',
    });
    const transferIn = transaction({
      id: 1,
      accountId: 1,
      amount: 1000,
      transferId: 100,
      bookingDate: '2026-01-01',
    });
    const groceries = transaction({ id: 3, accountId: 1, amount: -400, bookingDate: '2026-01-10' });
    const transactions = [transferOut, transferIn, groceries];
    const transfer: Transfer = {
      id: 100,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-01-01T00:00:00.000Z',
    };
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, jointAccount()],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [1, transfer],
        [2, transfer],
      ]),
      categoriesById: new Map(),
    };
    const expectedStake = 1000 - 400 * 0.5; // mineIn 1000, my half of €400 groceries.

    const points = computeNetWorthTrend(
      transactions,
      [jointAccount()],
      '2026-01-01',
      '2026-01-31',
      'month',
      context,
    );

    expect(points.at(-1)?.netWorth).toBe(expectedStake);
  });

  it('is unaffected by an untracked account’s transactions even when they resolve a joint leg’s transfer', () => {
    const transferOut = transaction({
      id: 2,
      accountId: 2,
      amount: -1000,
      transferId: 100,
      bookingDate: '2026-01-01',
    });
    const transferIn = transaction({
      id: 1,
      accountId: 1,
      amount: 1000,
      transferId: 100,
      bookingDate: '2026-01-01',
    });
    const transactions = [transferOut, transferIn];
    const transfer: Transfer = {
      id: 100,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-01-01T00:00:00.000Z',
    };
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, jointAccount()],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [1, transfer],
        [2, transfer],
      ]),
      categoriesById: new Map(),
    };

    // Only the joint account is tracked — the checking leg must not add its own -1000 on top.
    const points = computeNetWorthTrend(
      transactions,
      [jointAccount()],
      '2026-01-01',
      '2026-01-31',
      'month',
      context,
    );

    expect(points).toEqual([{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1000 }]);
  });
});
