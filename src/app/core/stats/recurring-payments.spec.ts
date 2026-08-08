import type { Account, Category, Transaction } from '@/core/data-access';
import { detectRecurringPayments } from './recurring-payments';

const TODAY = '2026-08-07';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-01-11',
  amount: -12.99,
  currency: 'EUR',
  rawDescription: 'Card payment',
  counterpartyName: 'Streamly',
  fingerprint: 'fp',
  createdAt: '2026-01-11T00:00:00.000Z',
  ...overrides,
});

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Subscriptions',
  kind: 'expense',
  color: '#000000',
  icon: 'tag',
  archived: false,
  isSystem: false,
  ...overrides,
});

const NO_CATEGORIES = new Map<number, Category>();
const NO_ACCOUNTS = new Map<number, Account>();

/** Builds one occurrence per (date, amount) pair, with sequential ids so each is distinguishable. */
const occurrencesOf = (
  entries: readonly (readonly [string, number])[],
  overrides: Partial<Transaction> = {},
  firstId = 1,
): Transaction[] =>
  entries.map(([bookingDate, amount], index) =>
    transaction({ ...overrides, id: firstId + index, bookingDate, amount }),
  );

const detect = (transactions: Transaction[], categories: Map<number, Category> = NO_CATEGORIES) =>
  detectRecurringPayments(transactions, categories, NO_ACCOUNTS, TODAY);

/** For the timing flags, whose whole subject is where "now" sits relative to the rhythm. */
const detectAt = (todayIso: string, transactions: Transaction[]) =>
  detectRecurringPayments(transactions, NO_CATEGORIES, NO_ACCOUNTS, todayIso);

describe('detectRecurringPayments', () => {
  it('returns no series for an empty history', () => {
    expect(detectRecurringPayments([], NO_CATEGORIES, NO_ACCOUNTS, TODAY)).toEqual({ series: [] });
  });

  it('detects a monthly subscription whose dates jitter around the 11th', () => {
    // Gaps of 33, 27 and 30 days — all inside the monthly window, median 30.
    const transactions = occurrencesOf([
      ['2026-01-11', -12.99],
      ['2026-02-13', -12.99],
      ['2026-03-12', -13.49],
      ['2026-04-11', -12.99],
    ]);

    const { series } = detect(transactions);

    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({
      label: 'Streamly',
      cadence: 'monthly',
      typicalAmount: 12.99,
      lastDate: '2026-04-11',
      nextExpectedDate: '2026-05-11',
      monthlyEquivalent: 12.99,
    });
    expect(series[0].occurrences.map((occurrence) => occurrence.date)).toEqual([
      '2026-01-11',
      '2026-02-13',
      '2026-03-12',
      '2026-04-11',
    ]);
  });

  it('detects a weekly rhythm and its monthly equivalent', () => {
    const { series } = detect(
      occurrencesOf([
        ['2026-05-04', -8],
        ['2026-05-11', -8],
        ['2026-05-18', -8],
        ['2026-05-25', -8],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('weekly');
    expect(series[0].nextExpectedDate).toBe('2026-06-01');
    expect(series[0].monthlyEquivalent).toBeCloseTo(34.79, 2); // 8 × 365.25 / 7 / 12
  });

  it('detects a quarterly rhythm and its monthly equivalent', () => {
    const { series } = detect(
      occurrencesOf([
        ['2026-01-15', -60],
        ['2026-04-15', -60],
        ['2026-07-15', -60],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('quarterly');
    expect(series[0].monthlyEquivalent).toBeCloseTo(20, 10);
  });

  it('detects a yearly rhythm, so a €120/year series reads as €10/month', () => {
    const { series } = detect(
      occurrencesOf([
        ['2024-03-01', -120],
        ['2025-03-01', -120],
        ['2026-03-01', -120],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('yearly');
    expect(series[0].monthlyEquivalent).toBeCloseTo(10, 10);
    expect(series[0].nextExpectedDate).toBe('2027-03-01');
  });

  it('splits two price points at the same counterparty instead of blending them into one average', () => {
    const transactions = [
      ...occurrencesOf([
        ['2026-01-05', -9.99],
        ['2026-02-05', -9.99],
        ['2026-03-05', -9.99],
        ['2026-04-05', -9.99],
      ]),
      ...occurrencesOf(
        [
          ['2026-01-18', -41.2],
          ['2026-02-22', -58.75],
          ['2026-03-09', -24.3],
        ],
        {},
        100,
      ),
    ];

    const { series } = detect(transactions);

    // The variable spending forms no band of its own big enough to be a rhythm, and — crucially —
    // never drags the subscription's typical amount away from its real price.
    expect(series).toHaveLength(1);
    expect(series[0].typicalAmount).toBe(9.99);
    expect(series[0].occurrences).toHaveLength(4);
  });

  it('stops the history at todayIso, so a future-booked row is not yet evidence of a rhythm', () => {
    const { series } = detect(
      occurrencesOf([
        ['2026-06-03', -25],
        ['2026-07-03', -25],
        ['2026-08-03', -25],
        ['2026-09-03', -25], // after TODAY
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].occurrences).toHaveLength(3);
    expect(series[0].lastDate).toBe('2026-08-03');
    expect(series[0].nextExpectedDate).toBe('2026-09-02'); // last + the 30-day median gap
  });

  it('produces no series below the minimum occurrence count', () => {
    const { series } = detect(
      occurrencesOf([
        ['2026-01-11', -12.99],
        ['2026-02-11', -12.99],
      ]),
    );

    expect(series).toEqual([]);
  });

  it('produces no series when a regular counterparty pays on irregular intervals', () => {
    // Gaps of 15, 72 and 28 days: the median is monthly-shaped, but the members are not.
    const { series } = detect(
      occurrencesOf([
        ['2026-01-05', -20],
        ['2026-01-20', -20],
        ['2026-04-02', -20],
        ['2026-04-30', -20],
      ]),
    );

    expect(series).toEqual([]);
  });

  it('ignores a refund at a recurring counterparty without breaking the rhythm', () => {
    const categories = new Map([[1, category()]]);
    const transactions = [
      ...occurrencesOf(
        [
          ['2026-01-10', -15],
          ['2026-02-10', -15],
          ['2026-03-10', -15],
          ['2026-04-10', -15],
        ],
        { categoryId: 1 },
      ),
      // A refund on an expense category is a negative expense delta, never an occurrence.
      transaction({ id: 99, bookingDate: '2026-02-20', amount: 15, categoryId: 1 }),
    ];

    const { series } = detect(transactions, categories);

    expect(series).toHaveLength(1);
    expect(series[0].categoryId).toBe(1);
    expect(series[0].cadence).toBe('monthly');
    expect(series[0].occurrences).toHaveLength(4);
    expect(series[0].occurrences.every((occurrence) => occurrence.amount === 15)).toBe(true);
  });

  it('produces no series from linked transfers, nullified rows or savings movements', () => {
    const monthly = [
      ['2026-01-10', -300],
      ['2026-02-10', -300],
      ['2026-03-10', -300],
    ] as const;
    const SAVINGS_IBAN = 'BE00SAVINGS';

    expect(detect(occurrencesOf(monthly, { transferId: 7 })).series).toEqual([]);
    expect(detect(occurrencesOf(monthly, { nullified: true })).series).toEqual([]);
    expect(
      detectRecurringPayments(
        occurrencesOf(monthly, { counterpartyIban: SAVINGS_IBAN }),
        NO_CATEGORIES,
        NO_ACCOUNTS,
        TODAY,
        new Set([SAVINGS_IBAN]),
      ).series,
    ).toEqual([]);
  });

  it('clusters on the normalized IBAN even when the counterparty name is spelled differently', () => {
    const transactions = [
      transaction({
        id: 1,
        bookingDate: '2026-01-06',
        amount: -45,
        counterpartyName: 'ACME UTILITIES',
        counterpartyIban: 'BE68 5390 0754 7034',
      }),
      transaction({
        id: 2,
        bookingDate: '2026-02-06',
        amount: -45,
        counterpartyName: 'Acme Utilities NV',
        counterpartyIban: 'be6853900754 7034',
      }),
      transaction({
        id: 3,
        bookingDate: '2026-03-06',
        amount: -45,
        counterpartyName: 'ACME UTILITIES',
        counterpartyIban: 'BE6853900754 7034',
      }),
    ];

    const { series } = detect(transactions);

    expect(series).toHaveLength(1);
    expect(series[0].counterpartyIban).toBe('BE68539007547034');
    expect(series[0].label).toBe('ACME UTILITIES');
    expect(series[0].occurrences).toHaveLength(3);
  });

  it('falls back to the counterparty name, then the raw description, when no IBAN is present', () => {
    const monthly = [
      ['2026-01-08', -30],
      ['2026-02-08', -30],
      ['2026-03-08', -30],
    ] as const;

    // Same name, different descriptions — the name holds the cluster together.
    const byName = detect(
      occurrencesOf(monthly).map((entry, index) => ({
        ...entry,
        counterpartyName: 'Gym  Membership',
        rawDescription: `POS ${index}`,
      })),
    ).series;
    expect(byName).toHaveLength(1);
    expect(byName[0].occurrences).toHaveLength(3);

    // Neither IBAN nor name — the description is all that is left to cluster on.
    const byDescription = detect(
      occurrencesOf(monthly).map((entry) => ({
        ...entry,
        counterpartyName: undefined,
        rawDescription: 'DIRECT DEBIT WATER BOARD',
      })),
    ).series;
    expect(byDescription).toHaveLength(1);
    expect(byDescription[0].label).toBe('DIRECT DEBIT WATER BOARD');
  });
});

describe('detectRecurringPayments: change flags (TICKET-REC-04)', () => {
  /** Monthly on the 5th, three payments at one price then three at another. */
  const repriced = (before: number, after: number): Transaction[] =>
    occurrencesOf([
      ['2026-01-05', -before],
      ['2026-02-05', -before],
      ['2026-03-05', -before],
      ['2026-04-05', -after],
      ['2026-05-05', -after],
      ['2026-06-05', -after],
    ]);

  /** A monthly series whose last payment is 2026-06-05, so `nextExpectedDate` is 2026-07-05. */
  const monthlyThroughJune = (): Transaction[] =>
    occurrencesOf([
      ['2026-04-05', -20],
      ['2026-05-05', -20],
      ['2026-06-05', -20],
    ]);

  it('folds a sustained price rise back into one series carrying the step', () => {
    const { series } = detect(repriced(9.99, 12.99));

    expect(series).toHaveLength(1);
    expect(series[0].flags.priceChange).toEqual({
      from: 9.99,
      to: 12.99,
      atDate: '2026-04-05',
    });
    // The new level owns the forward-looking figures; the old one survives only as history.
    expect(series[0].typicalAmount).toBe(12.99);
    expect(series[0].occurrences).toHaveLength(6);
  });

  it('flags a price cut the same way — a decrease is news too', () => {
    const { series } = detect(repriced(12.99, 9.99));

    expect(series).toHaveLength(1);
    expect(series[0].flags.priceChange).toMatchObject({ from: 12.99, to: 9.99 });
    expect(series[0].typicalAmount).toBe(9.99);
  });

  it('does not merge two commitments that are simply too far apart to be one repricing', () => {
    // €10 ending as €40 begins is not a subscription that got dearer, it is two subscriptions.
    const { series } = detect(repriced(10, 40));

    expect(series).toHaveLength(2);
    expect(series.every((entry) => entry.flags.priceChange === undefined)).toBe(true);
  });

  it('does not read a single within-tolerance outlier as a price change', () => {
    // €10.50 is ~5% off €9.99 — inside the band, so it never becomes a level of its own.
    const { series } = detect(
      occurrencesOf([
        ['2026-03-05', -9.99],
        ['2026-04-05', -9.99],
        ['2026-05-05', -10.5],
        ['2026-06-05', -9.99],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].flags.priceChange).toBeUndefined();
  });

  it('leaves a series unflagged inside the grace allowance, and overdue outside it', () => {
    // nextExpectedDate is 2026-07-05; the rhythm's median interval is 30 days.
    expect(detectAt('2026-07-10', monthlyThroughJune()).series[0].flags).toEqual({});

    const late = detectAt('2026-07-20', monthlyThroughJune()).series[0];
    expect(late.flags.overdue).toEqual({ expectedDate: '2026-07-05' });
    expect(late.flags.stopped).toBeUndefined();
  });

  it('calls a series stopped after two whole intervals of silence, and keeps it listed', () => {
    const { series } = detectAt('2026-09-01', monthlyThroughJune());

    expect(series).toHaveLength(1); // still there — vanishing is the opposite of announcing
    expect(series[0].flags.stopped).toEqual({ since: '2026-06-05' });
    // Never both: overdue is the early warning, stopped the conclusion.
    expect(series[0].flags.overdue).toBeUndefined();
  });

  it('measures lateness in the rhythm’s own intervals, not in days', () => {
    const weekly = occurrencesOf([
      ['2026-06-01', -8],
      ['2026-06-08', -8],
      ['2026-06-15', -8],
    ]);

    // 24 days of silence is three weekly intervals — long stopped...
    expect(detectAt('2026-07-09', weekly).series[0].flags.stopped).toBeDefined();
    // ...while the same 24 days is nothing at all to a monthly rhythm.
    expect(detectAt('2026-06-29', monthlyThroughJune()).series[0].flags).toEqual({});
  });

  it('reports a repriced series’ timing against its new level, not the old one', () => {
    const { series } = detectAt('2026-09-01', repriced(9.99, 12.99));

    expect(series).toHaveLength(1);
    expect(series[0].flags.priceChange).toBeDefined();
    expect(series[0].flags.stopped).toEqual({ since: '2026-06-05' });
  });
});
