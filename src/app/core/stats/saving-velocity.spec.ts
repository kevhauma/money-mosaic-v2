import type { Transaction } from '@/core/data-access';
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
