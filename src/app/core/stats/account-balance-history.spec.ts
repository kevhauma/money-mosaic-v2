import type { Account, Category, Transaction } from '@/core/data-access';
import { computeAccountBalanceHistory } from './account-balance-history';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
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

const partnerContribution: Category = {
  id: 9,
  name: 'Partner contribution',
  kind: 'neutral',
  color: '#888888',
  icon: 'users',
  archived: false,
  isSystem: true,
};

describe('computeAccountBalanceHistory', () => {
  it('seeds from the full opening balance and accumulates raw amounts per bucket', () => {
    const points = computeAccountBalanceHistory(
      [
        transaction({ id: 1, amount: 200, bookingDate: '2026-01-10' }),
        transaction({ id: 2, amount: -50, bookingDate: '2026-02-20' }),
      ],
      account({ openingBalance: 1000 }),
      '2026-01-01',
      '2026-02-28',
      'month',
    );

    expect(points).toEqual([
      { bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1200 },
      { bucketKey: '2026-02', bucketEnd: '2026-02-28', balance: 1150 },
    ]);
  });

  it('ignores transactions booked on another account', () => {
    const points = computeAccountBalanceHistory(
      [
        transaction({ id: 1, accountId: 1, amount: 200 }),
        transaction({ id: 2, accountId: 2, amount: 5000 }),
      ],
      account({ id: 1, openingBalance: 0 }),
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(points.at(-1)?.balance).toBe(200);
  });
});

describe('computeAccountBalanceHistory: real balance, never the net-worth stake (TICKET-ACC-07)', () => {
  const jointAccount = account({
    id: 1,
    name: 'Joint',
    type: 'joint',
    openingBalance: 1000,
    ownershipShare: 0.5,
  });
  // A partner's deposit (neutral category) plus a joint spend: net worth would count the deposit at
  // 0 and the spend at the 0.5 share (→ 1000/2 + 0 - 100 = 400), the real balance counts both in
  // full (→ 1000 + 400 - 200 = 1200).
  const transactions = [
    transaction({
      id: 1,
      accountId: 1,
      amount: 400,
      bookingDate: '2026-01-05',
      categoryId: partnerContribution.id,
      rawDescription: 'Partner deposit',
    }),
    transaction({ id: 2, accountId: 1, amount: -200, bookingDate: '2026-01-10' }),
  ];
  it('ends a joint account at its full real balance, not at my stake', () => {
    const points = computeAccountBalanceHistory(
      transactions,
      jointAccount,
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(points.at(-1)?.balance).toBe(1200);
    expect(points.at(-1)?.balance).toBe(
      jointAccount.openingBalance + transactions.reduce((sum, t) => sum + t.amount, 0),
    );
  });

  it('still moves the balance for a nullified transaction (it only affects income/expense)', () => {
    const points = computeAccountBalanceHistory(
      [transaction({ id: 1, amount: -75, nullified: true })],
      account({ openingBalance: 500 }),
      '2026-01-01',
      '2026-01-31',
      'month',
    );

    expect(points.at(-1)?.balance).toBe(425);
  });

  it('is unaffected by a manual attributionOverride', () => {
    const overridden = transaction({
      id: 1,
      amount: -100,
      attributionOverride: { mode: 'shared', jointAccountId: 1 },
    });

    expect(
      computeAccountBalanceHistory(
        [overridden],
        account({ openingBalance: 500 }),
        '2026-01-01',
        '2026-01-31',
        'month',
      ),
    ).toEqual(
      computeAccountBalanceHistory(
        [transaction({ id: 1, amount: -100 })],
        account({ openingBalance: 500 }),
        '2026-01-01',
        '2026-01-31',
        'month',
      ),
    );
  });

  // Was a point-for-point comparison against `computeNetWorthTrend`, which TICKET-ACC-07 retired
  // from production and this change deleted. The guard it encoded still matters — for a plain
  // non-joint account there is no share to weight, so the series is just the running balance —
  // so the oracle's output is inlined as the expectation.
  it('is a plain running balance for a non-joint account, with no share weighting (no-op guard)', () => {
    const ownAccount = account({ id: 1, openingBalance: 1000 });
    const transactions = [
      transaction({ id: 1, amount: 200, bookingDate: '2026-01-10' }),
      transaction({ id: 2, amount: -80, bookingDate: '2026-02-14' }),
    ];

    const balance = computeAccountBalanceHistory(
      transactions,
      ownAccount,
      '2026-01-01',
      '2026-03-31',
      'month',
    );

    expect(balance.map((point) => point.balance)).toEqual([1200, 1120, 1120]);
  });
});
