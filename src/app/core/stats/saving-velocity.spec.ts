import type { Account, Transaction } from '@/core/data-access';
import type { SavingBasis } from './saving-velocity';
import { computePeriodStats } from './period-stats';
import { computeSavingVelocity } from './saving-velocity';

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

const SAVINGS_IBAN = 'BE00SAVINGS';
const ownSavingsIbans = new Set([SAVINGS_IBAN]);

const accountOf = (id: number, name: string, type: Account['type'], iban: string): Account => ({
  id,
  name,
  type,
  iban,
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2020-01-01',
  color: '#000000',
  icon: 'bank',
  archived: false,
});

/** One income transaction of `amount` on the 5th of each given month, ids kept unique. */
const monthlyIncome = (byMonth: Record<string, number>): Transaction[] =>
  Object.entries(byMonth).map(([month, amount], index) =>
    transaction({ id: index + 1, bookingDate: `${month}-05`, amount }),
  );

describe('computeSavingVelocity: window enumeration', () => {
  it('returns one point per complete calendar month, in order, with that month’s real boundaries', () => {
    const velocity = computeSavingVelocity(
      monthlyIncome({ '2026-01': 100, '2026-02': 100, '2026-03': 100, '2026-04': 100 }),
      { today: '2026-05-10', lookbackMonths: 4, basis: 'net-cash-flow' },
    );

    expect(velocity.months).toEqual([
      { bucketKey: '2026-01', from: '2026-01-01', to: '2026-01-31', amount: 100 },
      { bucketKey: '2026-02', from: '2026-02-01', to: '2026-02-28', amount: 100 },
      { bucketKey: '2026-03', from: '2026-03-01', to: '2026-03-31', amount: 100 },
      { bucketKey: '2026-04', from: '2026-04-01', to: '2026-04-30', amount: 100 },
    ]);
    expect(velocity.monthsCovered).toBe(4);
    expect(velocity.hasEnoughHistory).toBe(true);
  });

  it('reads a leap February’s boundary as the 29th', () => {
    const velocity = computeSavingVelocity(monthlyIncome({ '2024-02': 100 }), {
      today: '2024-03-01',
      lookbackMonths: 1,
      basis: 'net-cash-flow',
    });

    expect(velocity.months).toEqual([
      { bucketKey: '2024-02', from: '2024-02-01', to: '2024-02-29', amount: 100 },
    ]);
  });

  it.each(['2026-08-01', '2026-08-12', '2026-08-31'])(
    'excludes the current partial month whatever the day-of-month is (%s)',
    (today) => {
      const velocity = computeSavingVelocity(
        monthlyIncome({ '2026-06': 100, '2026-07': 200, '2026-08': 999 }),
        { today, lookbackMonths: 3, basis: 'net-cash-flow' },
      );

      expect(velocity.months.map((point) => point.bucketKey)).toEqual(['2026-06', '2026-07']);
      expect(velocity.months.map((point) => point.amount)).toEqual([100, 200]);
    },
  );

  it('reads no clock: the same fixture at two different "todays" measures two different windows', () => {
    const transactions = monthlyIncome({
      '2026-01': 100,
      '2026-02': 200,
      '2026-03': 300,
      '2026-04': 400,
    });
    const options = { lookbackMonths: 2, basis: 'net-cash-flow' } as const;

    const inMarch = computeSavingVelocity(transactions, { ...options, today: '2026-03-15' });
    const inMay = computeSavingVelocity(transactions, { ...options, today: '2026-05-15' });

    expect(inMarch.months.map((point) => point.bucketKey)).toEqual(['2026-01', '2026-02']);
    expect(inMay.months.map((point) => point.bucketKey)).toEqual(['2026-03', '2026-04']);
    expect(inMarch.perMonth).toBe(150);
    expect(inMay.perMonth).toBe(350);
  });

  it('emits a month with no transactions at all as amount 0 rather than dropping it', () => {
    const velocity = computeSavingVelocity(monthlyIncome({ '2026-01': 400, '2026-04': 800 }), {
      today: '2026-05-10',
      lookbackMonths: 4,
      basis: 'net-cash-flow',
    });

    expect(velocity.months.map((point) => point.amount)).toEqual([400, 0, 0, 800]);
    expect(velocity.monthsCovered).toBe(4);
    expect(velocity.perMonth).toBe(300);
  });
});

describe('computeSavingVelocity: bases agree with computePeriodStats', () => {
  // Salary in, groceries out, and a deliberate move to an own savings account — so `net` and
  // `savings` are genuinely different numbers for the same month.
  const transactions = [
    transaction({ id: 1, bookingDate: '2026-01-05', amount: 2000 }),
    transaction({ id: 2, bookingDate: '2026-01-20', amount: -700 }),
    transaction({ id: 3, bookingDate: '2026-01-28', amount: -300, counterpartyIban: SAVINGS_IBAN }),
    transaction({ id: 4, bookingDate: '2026-02-05', amount: 2000 }),
    transaction({ id: 5, bookingDate: '2026-02-18', amount: -1100 }),
    transaction({ id: 6, bookingDate: '2026-02-27', amount: -150, counterpartyIban: SAVINGS_IBAN }),
  ];

  it('net-cash-flow reproduces computePeriodStats(...).net for every month', () => {
    const velocity = computeSavingVelocity(transactions, {
      today: '2026-03-09',
      lookbackMonths: 2,
      basis: 'net-cash-flow',
      ownSavingsIbans,
    });

    for (const point of velocity.months) {
      expect(point.amount).toBe(
        computePeriodStats(transactions, point.from, point.to, ownSavingsIbans).net,
      );
    }
  });

  it('savings-transfers reproduces computePeriodStats(...).savings for every month', () => {
    const velocity = computeSavingVelocity(transactions, {
      today: '2026-03-09',
      lookbackMonths: 2,
      basis: 'savings-transfers',
      ownSavingsIbans,
    });

    for (const point of velocity.months) {
      expect(point.amount).toBe(
        computePeriodStats(transactions, point.from, point.to, ownSavingsIbans).savings,
      );
    }
  });

  it('the two bases disagree on the same fixture — the parameter is real', () => {
    const options = { today: '2026-03-09', lookbackMonths: 2, ownSavingsIbans } as const;

    expect(
      computeSavingVelocity(transactions, { ...options, basis: 'net-cash-flow' }).perMonth,
    ).toBe(1100);
    expect(
      computeSavingVelocity(transactions, { ...options, basis: 'savings-transfers' }).perMonth,
    ).toBe(225);
  });
});

describe('computeSavingVelocity: the spread behind the number', () => {
  it('reports the mean, median, min and max of the same series', () => {
    const velocity = computeSavingVelocity(
      monthlyIncome({ '2026-01': 100, '2026-02': 500, '2026-03': 300, '2026-04': 200 }),
      { today: '2026-05-10', lookbackMonths: 4, basis: 'net-cash-flow' },
    );

    expect(velocity.perMonth).toBe(275);
    // Even count: the mean of the two middle values (200 and 300), not either of them.
    expect(velocity.median).toBe(250);
    expect(velocity.min).toBe(100);
    expect(velocity.max).toBe(500);
  });

  it('takes the single middle value as the median on an odd count', () => {
    const velocity = computeSavingVelocity(
      monthlyIncome({ '2026-01': 100, '2026-02': 900, '2026-03': 200 }),
      { today: '2026-04-10', lookbackMonths: 3, basis: 'net-cash-flow' },
    );

    expect(velocity.median).toBe(200);
    expect(velocity.perMonth).toBe(400);
  });
});

describe('computeSavingVelocity: short and absent history', () => {
  it('clamps to the months actually available and divides the mean by those, not by the request', () => {
    const velocity = computeSavingVelocity(monthlyIncome({ '2026-03': 300, '2026-04': 500 }), {
      today: '2026-05-10',
      lookbackMonths: 12,
      basis: 'net-cash-flow',
    });

    expect(velocity.monthsCovered).toBe(2);
    expect(velocity.months.map((point) => point.bucketKey)).toEqual(['2026-03', '2026-04']);
    // 800 / 2, not 800 / 12.
    expect(velocity.perMonth).toBe(400);
    expect(velocity.hasEnoughHistory).toBe(true);
  });

  it('reports no history at all as hasEnoughHistory: false with a zero rate', () => {
    expect(
      computeSavingVelocity([], { today: '2026-05-10', lookbackMonths: 6, basis: 'net-cash-flow' }),
    ).toEqual({
      basis: 'net-cash-flow',
      monthsCovered: 0,
      months: [],
      perMonth: 0,
      median: 0,
      min: 0,
      max: 0,
      hasEnoughHistory: false,
    });
  });

  it('reports history that only reaches into the current partial month as no complete months', () => {
    const velocity = computeSavingVelocity(monthlyIncome({ '2026-05': 400 }), {
      today: '2026-05-10',
      lookbackMonths: 6,
      basis: 'net-cash-flow',
    });

    expect(velocity.hasEnoughHistory).toBe(false);
    expect(velocity.monthsCovered).toBe(0);
    expect(velocity.perMonth).toBe(0);
  });
});

describe('computeSavingVelocity: a negative rate is a real answer', () => {
  it('returns a negative perMonth unclamped when expenses exceed income', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-01-05', amount: 1000 }),
      transaction({ id: 2, bookingDate: '2026-01-20', amount: -1300 }),
      transaction({ id: 3, bookingDate: '2026-02-05', amount: 1000 }),
      transaction({ id: 4, bookingDate: '2026-02-20', amount: -1100 }),
    ];

    const velocity = computeSavingVelocity(transactions, {
      today: '2026-03-09',
      lookbackMonths: 2,
      basis: 'net-cash-flow',
    });

    expect(velocity.months.map((point) => point.amount)).toEqual([-300, -100]);
    expect(velocity.perMonth).toBe(-200);
    expect(velocity.min).toBe(-300);
    expect(velocity.max).toBe(-100);
  });
});

describe('computeSavingVelocity: account scope (TICKET-FUT-08)', () => {
  const CHECKING = 1;
  const SAVINGS = 2;
  const OTHER = 3;

  const accountsById = new Map<number, Account>([
    [CHECKING, accountOf(CHECKING, 'Checking', 'checking', 'BE00CHECKING')],
    [SAVINGS, accountOf(SAVINGS, 'Savings', 'savings', SAVINGS_IBAN)],
    [OTHER, accountOf(OTHER, 'Other', 'checking', 'BE00OTHER')],
  ]);
  const options = {
    today: '2026-03-09',
    lookbackMonths: 2,
    ownSavingsIbans,
    accountsById,
  } as const;

  /** Salary into checking, every month of the window, so there is always a baseline rate. */
  const salary = [
    transaction({ id: 1, accountId: CHECKING, bookingDate: '2026-01-05', amount: 1000 }),
    transaction({ id: 2, accountId: CHECKING, bookingDate: '2026-02-05', amount: 1000 }),
  ];

  const rateOf = (transactions: Transaction[], basis: SavingBasis, scope?: number[]): number =>
    computeSavingVelocity(transactions, {
      ...options,
      basis,
      scopeAccountIds: scope ? new Set(scope) : undefined,
    }).perMonth;

  it('measures only the scoped accounts’ transactions', () => {
    const withOther = [
      ...salary,
      transaction({ id: 3, accountId: OTHER, bookingDate: '2026-01-20', amount: -400 }),
    ];

    expect(rateOf(withOther, 'net-cash-flow')).toBe(800);
    expect(rateOf(withOther, 'net-cash-flow', [CHECKING])).toBe(1000);
  });

  it('is identical to no scope when every account is selected explicitly', () => {
    const transactions = [
      ...salary,
      transaction({ id: 3, accountId: OTHER, bookingDate: '2026-01-20', amount: -400 }),
    ];

    expect(rateOf(transactions, 'net-cash-flow', [CHECKING, SAVINGS, OTHER])).toBe(
      rateOf(transactions, 'net-cash-flow'),
    );
  });

  it.each<[SavingBasis]>([['net-cash-flow'], ['savings-transfers']])(
    'nets a transfer between two in-scope accounts to zero on the %s basis',
    (basis) => {
      const both = [
        ...salary,
        transaction({
          id: 3,
          accountId: CHECKING,
          bookingDate: '2026-01-20',
          amount: -300,
          transferId: 9,
          counterpartyIban: SAVINGS_IBAN,
        }),
        transaction({
          id: 4,
          accountId: SAVINGS,
          bookingDate: '2026-01-20',
          amount: 300,
          transferId: 9,
          counterpartyIban: 'BE00CHECKING',
        }),
      ];

      // Both accounts in scope: the movement is internal, exactly as with no scope at all.
      expect(rateOf(both, basis, [CHECKING, SAVINGS])).toBe(rateOf(both, basis));
    },
  );

  it.each<[SavingBasis]>([['net-cash-flow'], ['savings-transfers']])(
    'treats money leaving the scope as spent on the %s basis',
    (basis) => {
      const leaving = [
        ...salary,
        transaction({
          id: 3,
          accountId: CHECKING,
          bookingDate: '2026-01-20',
          amount: -300,
          transferId: 9,
          counterpartyIban: SAVINGS_IBAN,
        }),
        transaction({
          id: 4,
          accountId: SAVINGS,
          bookingDate: '2026-01-20',
          amount: 300,
          transferId: 9,
          counterpartyIban: 'BE00CHECKING',
        }),
      ];

      // Scoped to checking alone, the 300 has genuinely left — so the rate must fall by 150/month
      // over the two-month window, not keep counting money that is no longer there.
      expect(rateOf(leaving, basis, [CHECKING])).toBeLessThan(
        rateOf(leaving, basis, [CHECKING, SAVINGS]),
      );
    },
  );

  it.each<[SavingBasis]>([['net-cash-flow'], ['savings-transfers']])(
    'treats money arriving from outside the scope as income on the %s basis',
    (basis) => {
      // A withdrawal out of the savings account into checking. Whole-universe, that nets savings
      // *down* by 300 and leaves net cash flow untouched; scoped to checking alone the 300 has
      // genuinely arrived, so both bases have to move up.
      const arriving = [
        ...salary,
        transaction({
          id: 3,
          accountId: CHECKING,
          bookingDate: '2026-01-20',
          amount: 300,
          counterpartyIban: SAVINGS_IBAN,
        }),
      ];

      expect(rateOf(arriving, basis, [CHECKING])).toBeGreaterThan(
        rateOf(arriving, basis, [CHECKING, SAVINGS]),
      );
    },
  );

  it('counts a one-sided movement to an out-of-scope savings account as an outflow', () => {
    const toSavings = [
      ...salary,
      transaction({
        id: 3,
        accountId: CHECKING,
        bookingDate: '2026-01-20',
        amount: -300,
        counterpartyIban: SAVINGS_IBAN,
      }),
    ];

    // Unscoped it is `savings`, so net-cash-flow ignores it entirely: 1000/month.
    expect(rateOf(toSavings, 'net-cash-flow')).toBe(1000);
    // Scoped to checking the money has left: 300 out over two months.
    expect(rateOf(toSavings, 'net-cash-flow', [CHECKING])).toBe(850);
  });

  it('is unchanged from FUT-01 when the parameter is absent or the scope is empty', () => {
    const transactions = [
      ...salary,
      transaction({
        id: 3,
        accountId: CHECKING,
        bookingDate: '2026-01-20',
        amount: -300,
        counterpartyIban: SAVINGS_IBAN,
      }),
    ];
    const withoutParameter = computeSavingVelocity(transactions, {
      ...options,
      basis: 'net-cash-flow',
    });

    expect(
      computeSavingVelocity(transactions, {
        ...options,
        basis: 'net-cash-flow',
        scopeAccountIds: new Set<number>(),
      }),
    ).toEqual(withoutParameter);
  });
});
