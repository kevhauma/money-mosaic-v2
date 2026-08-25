import type { Account, Category, Transaction } from '@/core/data-access';
import { detectRecurringPayments, mergeRecurringSeries } from './recurring-payments';

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
    // The envelope gained `concludedSeriesCount` with TICKET-REC-05; the series half is unchanged.
    expect(detectRecurringPayments([], NO_CATEGORIES, NO_ACCOUNTS, TODAY)).toEqual({
      series: [],
      concludedSeriesCount: 0,
    });
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

  it('forgives a skipped week rather than un-detecting the whole series (TICKET-REC-07)', () => {
    // Gaps of 7, 14, 7, 7: the median still says weekly, and the 14 is one missed beat, not a
    // different rhythm — which is the case that made the panel read as "monthly and quarterly only".
    const { series } = detect(
      occurrencesOf([
        ['2026-05-04', -8],
        ['2026-05-11', -8],
        ['2026-05-25', -8],
        ['2026-06-01', -8],
        ['2026-06-08', -8],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('weekly');
    expect(series[0].intervalDays).toBe(7);
    expect(series[0].monthlyEquivalent).toBeCloseTo(34.79, 2); // 8 × 365.25 / 7 / 12
    // The skipped week is forgiven, never invented: no occurrence appears where none was paid.
    expect(series[0].occurrences.map((occurrence) => occurrence.date)).toEqual([
      '2026-05-04',
      '2026-05-11',
      '2026-05-25',
      '2026-06-01',
      '2026-06-08',
    ]);
  });

  it('produces no series once a gap skips more beats than the allowance permits (TICKET-REC-07)', () => {
    // 28 days is four whole weekly periods — three skipped beats, one past `MAX_SKIPPED_INTERVALS`.
    const { series } = detect(
      occurrencesOf([
        ['2026-05-04', -8],
        ['2026-05-11', -8],
        ['2026-06-08', -8],
        ['2026-06-15', -8],
      ]),
    );

    expect(series).toEqual([]);
  });

  it('detects a fortnightly rhythm and its monthly equivalent (TICKET-REC-07)', () => {
    const { series } = detect(
      occurrencesOf([
        ['2026-05-01', -20],
        ['2026-05-15', -20],
        ['2026-05-29', -20],
        ['2026-06-12', -20],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('fortnightly');
    expect(series[0].nextExpectedDate).toBe('2026-06-26');
    expect(series[0].monthlyEquivalent).toBeCloseTo(43.48, 2); // 20 × 365.25 / 14 / 12
  });

  it('reads a jittery fortnightly rhythm as fortnightly, not as weekly with skips (TICKET-REC-07)', () => {
    // Gaps of 13, 15 and 14 days: the median picks the band, so skip-forgiveness can never promote a
    // series out of the rhythm its own dates keep.
    const { series } = detect(
      occurrencesOf([
        ['2026-05-01', -20],
        ['2026-05-14', -20],
        ['2026-05-29', -20],
        ['2026-06-12', -20],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('fortnightly');
    expect(series[0].intervalDays).toBe(14);
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

  it('produces no series for three payments in one week and one a year later', () => {
    // The rejection skip-forgiveness had to keep (TICKET-REC-07): the median gap of 2 days matches no
    // band at all, so nothing here is ever averaged into a plausible-looking cadence.
    const { series } = detect(
      occurrencesOf([
        ['2025-01-06', -20],
        ['2025-01-08', -20],
        ['2025-01-10', -20],
        ['2026-01-10', -20],
      ]),
    );

    expect(series).toEqual([]);
  });

  it('produces no series for a four-monthly rhythm, which is still no cadence at all', () => {
    // Gaps of 123, 122 and 120 days sit in the hole between quarterly and yearly. TICKET-REC-07
    // narrowed that hole by giving fortnightly its own band; it did not remove it.
    const { series } = detect(
      occurrencesOf([
        ['2025-05-15', -60],
        ['2025-09-15', -60],
        ['2026-01-15', -60],
        ['2026-05-15', -60],
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

describe('detectRecurringPayments: fuzzy description clustering (TICKET-REC-08)', () => {
  /** Neither IBAN nor counterparty name, so the fuzzy `desc:` tier is the only thing clustering these. */
  const descriptionKeyed = (
    entries: readonly (readonly [string, string, number])[],
    firstId = 1,
  ): Transaction[] =>
    entries.map(([bookingDate, rawDescription, amount], index) =>
      transaction({
        id: firstId + index,
        bookingDate,
        amount,
        rawDescription,
        counterpartyName: undefined,
      }),
    );

  /** The reporter's case: one supermarket, a different terminal ID, city and date on every payment. */
  const supermarketCardPayments = (): Transaction[] =>
    descriptionKeyed([
      ['2026-05-12', 'CARD PMT 4429 ALBERT HEIJN 1183 AMSTERDAM 12/05', -45],
      ['2026-06-11', 'CARD PMT 7781 ALBERT HEIJN 2094 UTRECHT 11/06', -46.2],
      ['2026-07-12', 'CARD PMT 3310 ALBERT HEIJN 1183 ROTTERDAM 12/07', -44.1],
    ]);

  it('clusters card payments that differ only in a terminal ID, a city and a date', () => {
    // Five tokens each once the numerics are dropped, four shared — Dice 0.80, exactly the threshold.
    const { series } = detect(supermarketCardPayments());

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('monthly');
    expect(series[0].occurrences).toHaveLength(3);
    expect(series[0].typicalAmount).toBe(45);
    // The cluster is named by the first transaction to open it, in input order.
    expect(series[0].label).toBe('CARD PMT 4429 ALBERT HEIJN 1183 AMSTERDAM 12/05');
  });

  it('keeps two payees apart when all they share is bank boilerplate', () => {
    // Both carry `SEPA DD <iban>`; only the payee token differs, so Dice is 2 × 3 / (5 + 5) = 0.60.
    // A false merge here would read as one fortnightly rhythm instead of two monthly ones.
    const { series } = detect(
      descriptionKeyed([
        ['2026-05-04', 'SEPA DD NL92ABNA0417164300 ACME INSURANCE', -30],
        ['2026-06-04', 'SEPA DD NL92ABNA0417164300 ACME INSURANCE', -30],
        ['2026-07-04', 'SEPA DD NL92ABNA0417164300 ACME INSURANCE', -30],
        ['2026-05-18', 'SEPA DD NL92ABNA0417164300 ZETA TELECOM', -30],
        ['2026-06-18', 'SEPA DD NL92ABNA0417164300 ZETA TELECOM', -30],
        ['2026-07-18', 'SEPA DD NL92ABNA0417164300 ZETA TELECOM', -30],
      ]),
    );

    expect(series).toHaveLength(2);
    expect(series.every((entry) => entry.cadence === 'monthly')).toBe(true);
    expect(series.map((entry) => entry.label).sort()).toEqual([
      'SEPA DD NL92ABNA0417164300 ACME INSURANCE',
      'SEPA DD NL92ABNA0417164300 ZETA TELECOM',
    ]);
  });

  it('does not let a description that tokenises to nothing swallow unrelated payments', () => {
    // Pure reference numbers: every token is numeric, so both token sets are empty and would score
    // 0 against everything. Exact equality holds each reference together and neither absorbs the
    // other — merged, these six dates would read as one fortnightly series.
    const { series } = detect([
      ...descriptionKeyed([
        ['2026-05-05', '0001 12/07', -20],
        ['2026-06-05', '0001 12/07', -20],
        ['2026-07-05', '0001 12/07', -20],
      ]),
      ...descriptionKeyed(
        [
          ['2026-05-19', '9999 26/07', -20],
          ['2026-06-19', '9999 26/07', -20],
          ['2026-07-19', '9999 26/07', -20],
        ],
        10,
      ),
    ]);

    expect(series).toHaveLength(2);
    expect(series.every((entry) => entry.occurrences.length === 3)).toBe(true);
    expect(series.map((entry) => entry.label).sort()).toEqual(['0001 12/07', '9999 26/07']);
  });

  it('merges at the threshold and leaves the descriptions just below it alone', () => {
    // Five tokens each, four shared: 2 × 4 / (5 + 5) = 0.80 — at `DESCRIPTION_MATCH_THRESHOLD`.
    const atThreshold = detect(
      descriptionKeyed([
        ['2026-05-06', 'alpha beta gamma delta epsilon', -25],
        ['2026-06-06', 'alpha beta gamma delta zeta', -25],
        ['2026-07-06', 'alpha beta gamma delta eta', -25],
      ]),
    ).series;

    expect(atThreshold).toHaveLength(1);
    expect(atThreshold[0].occurrences).toHaveLength(3);

    // Four tokens each, three shared: 2 × 3 / (4 + 4) = 0.75 — three clusters of one, no series.
    const belowThreshold = detect(
      descriptionKeyed([
        ['2026-05-06', 'alpha beta gamma delta', -25],
        ['2026-06-06', 'alpha beta gamma zeta', -25],
        ['2026-07-06', 'alpha beta gamma eta', -25],
      ]),
    ).series;

    expect(belowThreshold).toEqual([]);
  });

  it('returns the same series keys on every run, so `key` stays safe as a render key', () => {
    const first = detect(supermarketCardPayments()).series;
    const second = detect(supermarketCardPayments()).series;

    expect(first.map((entry) => entry.key)).toEqual(second.map((entry) => entry.key));
    // Named after the cluster's opener, not after whichever member happened to sort first.
    expect(first[0].key).toBe('desc:card pmt 4429 albert heijn 1183 amsterdam 12/05|45.00');
  });

  it('leaves the name and IBAN tiers on exact equality, however alike they look', () => {
    const monthlyOn = (day: string): readonly string[] => [
      `2026-05-${day}`,
      `2026-06-${day}`,
      `2026-07-${day}`,
    ];

    // Token-wise these two names score 2 × 3 / (3 + 4) ≈ 0.86 — above the threshold — but the
    // `name:` tier never asks: a fuzzy merge on a name is the surprise REC-08 refused to risk.
    const byName = detect([
      ...monthlyOn('07').map((bookingDate, index) =>
        transaction({
          id: index + 1,
          bookingDate,
          amount: -22,
          counterpartyName: 'Albert Heijn 1183 Amsterdam',
        }),
      ),
      ...monthlyOn('21').map((bookingDate, index) =>
        transaction({
          id: 10 + index,
          bookingDate,
          amount: -22,
          counterpartyName: 'Albert Heijn 1183 Amsterdam BV',
        }),
      ),
    ]).series;

    expect(byName).toHaveLength(2);

    // Identical descriptions, two IBANs: the strongest tier wins and the description is never read.
    const byIban = detect([
      ...monthlyOn('07').map((bookingDate, index) =>
        transaction({
          id: index + 1,
          bookingDate,
          amount: -22,
          counterpartyName: undefined,
          counterpartyIban: 'NL01BANK0000000001',
          rawDescription: 'MONTHLY BILL',
        }),
      ),
      ...monthlyOn('21').map((bookingDate, index) =>
        transaction({
          id: 10 + index,
          bookingDate,
          amount: -22,
          counterpartyName: undefined,
          counterpartyIban: 'NL02BANK0000000002',
          rawDescription: 'MONTHLY BILL',
        }),
      ),
    ]).series;

    expect(byIban).toHaveLength(2);
  });
});

describe('detectRecurringPayments: joint accounts, read raw (TICKET-REC-09)', () => {
  const account = (overrides: Partial<Account> = {}): Account => ({
    id: 1,
    name: 'Main account',
    type: 'checking',
    iban: 'NL01BANK0000000001',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2024-01-01',
    color: '#111111',
    icon: 'wallet',
    archived: false,
    ...overrides,
  });

  /** Half mine, so a scaled reading would band and report every bill at half its real size. */
  const household = account({
    id: 2,
    name: 'Household',
    type: 'joint',
    iban: 'NL55BANK0000000055',
    ownershipShare: 0.5,
  });

  const ACCOUNTS = new Map<number, Account>([
    [1, account()],
    [2, household],
  ]);
  const CATEGORIES = new Map<number, Category>([
    [1, category()],
    [2, category({ id: 2, name: 'Settling up', kind: 'neutral' })],
    [3, category({ id: 3, name: 'Salary', kind: 'income' })],
  ]);

  const detectJoint = (
    transactions: Transaction[],
    ownSavingsIbans: ReadonlySet<string> = new Set(),
  ) => detectRecurringPayments(transactions, CATEGORIES, ACCOUNTS, TODAY, ownSavingsIbans);

  /** A €90 monthly household bill, paid from the half-owned joint account. */
  const householdBill = (overrides: Partial<Transaction> = {}): Transaction[] =>
    ['2026-05-08', '2026-06-08', '2026-07-08'].map((bookingDate, index) =>
      transaction({
        id: index + 1,
        accountId: 2,
        bookingDate,
        amount: -90,
        counterpartyName: 'Energy Co',
        categoryId: 1,
        ...overrides,
      }),
    );

  it('detects a half-owned joint bill at the full amount that left the account', () => {
    const { series } = detectJoint(householdBill());

    expect(series).toHaveLength(1);
    expect(series[0].cadence).toBe('monthly');
    // 90, not the 45 `ownershipShare` weighting would have produced — and the occurrences carry the
    // whole bill too, so the expanded detail agrees with the column above it.
    expect(series[0].typicalAmount).toBe(90);
    expect(series[0].monthlyEquivalent).toBeCloseTo(90, 2);
    expect(series[0].occurrences.map((occurrence) => occurrence.amount)).toEqual([90, 90, 90]);
  });

  it('keeps a leg attribution would have excluded — a co-owner’s bill still arrives every month', () => {
    // `notMine` resolves as `excluded` under the default mode, so this series did not exist at all.
    const { series } = detectJoint(householdBill({ attributionOverride: { mode: 'notMine' } }));

    expect(series).toHaveLength(1);
    expect(series[0].occurrences).toHaveLength(3);
    expect(series[0].typicalAmount).toBe(90);
  });

  it('reads a transaction carrying an attributionOverride raw too', () => {
    // A shared expense paid from my own account: the override weights it to 45 under the default
    // mode. The override changes attribution, and attribution is what this ticket disregards.
    const { series } = detectJoint(
      householdBill({
        accountId: 1,
        attributionOverride: { mode: 'shared', jointAccountId: 2 },
      }),
    );

    expect(series).toHaveLength(1);
    expect(series[0].typicalAmount).toBe(90);
  });

  it('still applies every guard that is not about attribution', () => {
    // The mode turns off the joint/override branch and nothing else: each of these is excluded by a
    // rule above or below it, on the same joint account that the case above detects.
    expect(detectJoint(householdBill({ nullified: true })).series).toEqual([]);
    expect(detectJoint(householdBill({ amount: 0 })).series).toEqual([]);
    expect(detectJoint(householdBill({ transferId: 7 })).series).toEqual([]);
    expect(detectJoint(householdBill({ categoryId: 2 })).series).toEqual([]); // neutral kind
    expect(detectJoint(householdBill({ categoryId: 3 })).series).toEqual([]); // income kind
    expect(detectJoint(householdBill({ amount: 90 })).series).toEqual([]); // a refund, not a cost
    expect(
      detectJoint(
        householdBill({ counterpartyIban: 'NL99SAVE0000000099' }),
        new Set(['NL99SAVE0000000099']),
      ).series,
    ).toEqual([]); // a savings movement
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

  it('does not spend the merge’s gap allowance on a skip forgiven inside a level (TICKET-REC-07)', () => {
    // The old level skips March, so its gaps are 31 and 59 days — forgiven, and `intervalDays` stays
    // the median 31 rather than stretching. The 30-day hand-over to the new level is therefore well
    // inside `PRICE_CHANGE_MAX_GAP_INTERVALS`, and the two levels still read as one repricing.
    const { series } = detect(
      occurrencesOf([
        ['2026-01-05', -9.99],
        ['2026-02-05', -9.99],
        ['2026-04-05', -9.99],
        ['2026-05-05', -12.99],
        ['2026-06-05', -12.99],
        ['2026-07-05', -12.99],
      ]),
    );

    expect(series).toHaveLength(1);
    expect(series[0].flags.priceChange).toEqual({ from: 9.99, to: 12.99, atDate: '2026-05-05' });
    expect(series[0].occurrences).toHaveLength(6);
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

describe('detectRecurringPayments: a category’s applicability window (TICKET-REC-05)', () => {
  const HOUSING_ID = 4;

  /** A rent-shaped series: monthly, same amount, four occurrences ending well before TODAY. */
  const rent = (): Transaction[] =>
    occurrencesOf(
      [
        ['2026-01-03', -950],
        ['2026-02-03', -950],
        ['2026-03-03', -950],
        ['2026-04-03', -950],
      ],
      { counterpartyName: 'Vesta Rentals', categoryId: HOUSING_ID },
    );

  const housing = (overrides: Partial<Category> = {}): Map<number, Category> =>
    new Map([[HOUSING_ID, category({ id: HOUSING_ID, name: 'Housing', ...overrides })]]);

  it('drops a series whose category window closed, with no flags and a conclusion count', () => {
    const withoutWindow = detect(rent(), housing());
    // Without a window this rent is exactly REC-04's "Stopped" case — which is what makes the
    // declared conclusion below a different answer rather than a coincidence.
    expect(withoutWindow.series).toHaveLength(1);
    expect(withoutWindow.series[0].flags.stopped).toBeDefined();
    expect(withoutWindow.concludedSeriesCount).toBe(0);

    const concluded = detect(rent(), housing({ activeUntil: '2026-04-30' }));

    expect(concluded.series).toEqual([]);
    expect(concluded.concludedSeriesCount).toBe(1);
  });

  it('leaves a series whose window closes in the future listed, clipped at activeUntil', () => {
    // Runs to 2026-08-03 so the next expected date (2026-09-02) sits past the window's end.
    const gym = occurrencesOf(
      [
        ['2026-05-03', -30],
        ['2026-06-03', -30],
        ['2026-07-03', -30],
        ['2026-08-03', -30],
      ],
      { counterpartyName: 'City Gym', categoryId: HOUSING_ID },
    );

    const { series, concludedSeriesCount } = detect(gym, housing({ activeUntil: '2026-08-31' }));

    expect(concludedSeriesCount).toBe(0);
    expect(series).toHaveLength(1);
    expect(series[0].nextExpectedDate).toBe('2026-08-31');
    expect(series[0].projectUntil).toBe('2026-08-31');
    expect(series[0].flags.stopped).toBeUndefined();
  });

  it('leaves a windowless category’s series byte-for-byte unchanged', () => {
    const withCategory = detect(rent(), housing());
    const withoutCategory = detect(rent(), NO_CATEGORIES);

    expect(withCategory.series[0]).toEqual({
      ...withoutCategory.series[0],
      categoryId: HOUSING_ID,
    });
    expect(withCategory.series[0].projectUntil).toBeUndefined();
  });

  it('leaves an uncategorised series alone — it has no window to honour', () => {
    const uncategorised = occurrencesOf(
      [
        ['2026-01-03', -950],
        ['2026-02-03', -950],
        ['2026-03-03', -950],
        ['2026-04-03', -950],
      ],
      { counterpartyName: 'Vesta Rentals' },
    );

    const { series, concludedSeriesCount } = detect(
      uncategorised,
      housing({ activeUntil: '2026-04-30' }),
    );

    expect(series).toHaveLength(1);
    expect(series[0].categoryId).toBeNull();
    expect(concludedSeriesCount).toBe(0);
  });

  it('treats the window’s final day as still applying, matching categoryHasEnded', () => {
    // TODAY is 2026-08-07 — a window ending exactly today has not ended yet.
    expect(detect(rent(), housing({ activeUntil: TODAY })).series).toHaveLength(1);
    expect(detect(rent(), housing({ activeUntil: '2026-08-06' })).series).toEqual([]);
  });
});

/**
 * TICKET-REC-11 — detection now says how sure it is, and can be told two rows are one payment.
 * Both read only signals detection already computed; neither changes what is detected.
 */
describe('detectRecurringPayments: confidence (TICKET-REC-11)', () => {
  const monthly = (dates: string[], amounts: number[]): Transaction[] =>
    dates.map((bookingDate, index) =>
      transaction({
        id: index + 1,
        bookingDate,
        amount: -amounts[index],
        counterpartyName: 'Streamly',
      }),
    );

  const confidenceOfFirst = (transactions: Transaction[]) =>
    detectRecurringPayments(transactions, NO_CATEGORIES, NO_ACCOUNTS, TODAY).series[0].confidence;

  it('is high for a long, steady, same-priced rhythm', () => {
    const dates = [
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
      '2026-04-05',
      '2026-05-05',
      '2026-06-05',
    ];

    const confidence = confidenceOfFirst(
      monthly(
        dates,
        dates.map(() => 12.99),
      ),
    );

    expect(confidence).toEqual({ level: 'high', reason: '' });
  });

  it('drops a level for a rhythm that has only just started, and says so', () => {
    const dates = ['2026-04-05', '2026-05-05', '2026-06-05'];

    const confidence = confidenceOfFirst(
      monthly(
        dates,
        dates.map(() => 12.99),
      ),
    );

    expect(confidence.level).toBe('medium');
    expect(confidence.reason).toBe('seen 3 times so far');
  });

  it('drops two levels when the amount wanders as well', () => {
    // Four payments (so the count doubt stands) whose amounts sit out near the edges of the band
    // the detector held them in — 10.50 and 13.50 around a €12 median.
    const dates = ['2026-03-05', '2026-04-05', '2026-05-05', '2026-06-05'];

    const confidence = confidenceOfFirst(monthly(dates, [10.5, 12, 12, 13.5]));

    expect(confidence.level).toBe('low');
    expect(confidence.reason).toBe('seen 4 times so far');
  });

  it('names the drifting dates on a long series whose rhythm is ragged', () => {
    // Six payments — past the count doubt — alternating 26 and 35 days apart. Both gaps sit inside
    // the monthly band (24–38), so this is still detected as monthly; it is just not steady.
    const dates = [
      '2026-01-05',
      '2026-01-31',
      '2026-03-07',
      '2026-04-02',
      '2026-05-07',
      '2026-06-02',
    ];

    const confidence = confidenceOfFirst(
      monthly(
        dates,
        dates.map(() => 12.99),
      ),
    );

    expect(confidence.reason).toBe('the dates drift from one to the next');
  });
});

describe('mergeRecurringSeries (TICKET-REC-11)', () => {
  const seriesOf = (transactions: Transaction[], index = 0) =>
    detectRecurringPayments(transactions, NO_CATEGORIES, NO_ACCOUNTS, TODAY).series[index];

  const freshMarket = (dates: string[], amount: number, startId: number): Transaction[] =>
    dates.map((bookingDate, index) =>
      transaction({
        id: startId + index,
        bookingDate,
        amount: -amount,
        counterpartyName: 'FreshMarket',
      }),
    );

  const cheap = freshMarket(['2026-02-06', '2026-03-06', '2026-04-06'], 58.4, 400);
  const dear = freshMarket(['2026-02-20', '2026-03-20', '2026-04-20'], 73.15, 500);

  it('keeps every occurrence, once each, in date order', () => {
    const detected = detectRecurringPayments(
      [...cheap, ...dear],
      NO_CATEGORIES,
      NO_ACCOUNTS,
      TODAY,
    ).series;

    const merged = mergeRecurringSeries(detected[0], detected[1]);

    expect(merged.occurrences).toHaveLength(6);
    expect(merged.occurrences.map((occurrence) => occurrence.date)).toEqual([
      '2026-02-06',
      '2026-02-20',
      '2026-03-06',
      '2026-03-20',
      '2026-04-06',
      '2026-04-20',
    ]);
  });

  it('states what the merged payments actually cost per month, not a median times a rate', () => {
    const detected = detectRecurringPayments(
      [...cheap, ...dear],
      NO_CATEGORIES,
      NO_ACCOUNTS,
      TODAY,
    ).series;

    const merged = mergeRecurringSeries(detected[0], detected[1]);

    // €394.65 spread over the 73 days these six payments span plus one 14-day interval, at ~30.4
    // days to the month — i.e. what was actually spent, per month.
    //
    // How much that matters depends on the cadence the merge lands on: here it is fortnightly and
    // the old `median × rate` would have said about the same. On the dev seed, whose FreshMarket
    // payments merge into a *weekly* rhythm, the same formula claimed €253.94/month for a pair of
    // grocery bills that had never come to more than about €130 — which is what this replaces.
    expect(merged.monthlyEquivalent).toBeCloseTo(138.07, 1);
  });

  it('re-scores confidence over the merged whole', () => {
    const detected = detectRecurringPayments(
      [...cheap, ...dear],
      NO_CATEGORIES,
      NO_ACCOUNTS,
      TODAY,
    ).series;

    const merged = mergeRecurringSeries(detected[0], detected[1]);

    // Six payments now, but at two different prices — the amount doubt is real and is stated.
    expect(merged.confidence.level).not.toBe('high');
  });

  it('never counts a shared occurrence twice', () => {
    const one = seriesOf(cheap);

    const merged = mergeRecurringSeries(one, one);

    expect(merged.occurrences).toHaveLength(one.occurrences.length);
    // Within a few percent of the detector's own figure, not identical: this measures the interval
    // the payments actually kept, where the detector uses the nominal 30.44-day month.
    expect(merged.monthlyEquivalent).toBeGreaterThan(one.monthlyEquivalent * 0.9);
    expect(merged.monthlyEquivalent).toBeLessThan(one.monthlyEquivalent * 1.1);
  });
});
