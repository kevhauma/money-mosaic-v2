import type { Account, Category, Transaction } from '@/core/data-access';
import { computeCategoryCycleHeatmap } from './category-cycle-heatmap';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-06', // Monday
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-06T00:00:00.000Z',
  ...overrides,
});

const category = (id: number, name: string, overrides: Partial<Category> = {}): Category => ({
  id,
  name,
  kind: 'expense',
  color: `#00000${id}`,
  icon: 'tablerTag',
  archived: false,
  isSystem: false,
  ...overrides,
});

const categoriesById = (...categories: Category[]): Map<number, Category> =>
  new Map(categories.map((entry) => [entry.id as number, entry]));

// 2026-07-06..2026-07-26: three whole Mon-Sun weeks.
const FROM = '2026-07-06';
const TO = '2026-07-26';

const GROCERIES = category(1, 'Groceries');
const RENT = category(2, 'Rent');

const cellAt = (
  heatmap: ReturnType<typeof computeCategoryCycleHeatmap>,
  rowIndex: number,
  columnIndex: number,
): number =>
  heatmap.cells.find((cell) => cell.rowIndex === rowIndex && cell.columnIndex === columnIndex)
    ?.amount ?? Number.NaN;

describe('computeCategoryCycleHeatmap', () => {
  it('folds every Monday of the range into one column, and keeps all seven columns', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-06', amount: -10, categoryId: 1 }), // Mon
      transaction({ id: 2, bookingDate: '2026-07-13', amount: -20, categoryId: 1 }), // Mon
      transaction({ id: 3, bookingDate: '2026-07-20', amount: -30, categoryId: 1 }), // Mon
      transaction({ id: 4, bookingDate: '2026-07-11', amount: -5, categoryId: 1 }), // Sat
    ];

    const heatmap = computeCategoryCycleHeatmap(transactions, categoriesById(GROCERIES), FROM, TO);

    expect(heatmap.columnKeys).toHaveLength(7);
    expect(heatmap.cells).toHaveLength(7); // one row x seven columns, gaps included
    expect(cellAt(heatmap, 0, 0)).toBe(60); // Monday: 10 + 20 + 30
    expect(cellAt(heatmap, 0, 5)).toBe(5); // Saturday
    expect(cellAt(heatmap, 0, 1)).toBe(0); // Tuesday: nothing, still a cell
    expect(heatmap.maxAmount).toBe(60);
    expect(heatmap.rows[0].total).toBe(65);
  });

  it('keeps the top N categories as their own rows and folds the rest into "Other"', () => {
    const categories = categoriesById(
      GROCERIES,
      RENT,
      category(3, 'Transport'),
      category(4, 'Fun'),
      category(5, 'Pets'),
    );
    const transactions = [
      transaction({ id: 1, amount: -500, categoryId: 2 }),
      transaction({ id: 2, amount: -400, categoryId: 1 }),
      transaction({ id: 3, amount: -300, categoryId: 3 }),
      transaction({ id: 4, amount: -200, categoryId: 4 }),
      transaction({ id: 5, amount: -100, categoryId: 5 }), // 5th -> Other
    ];

    const heatmap = computeCategoryCycleHeatmap(transactions, categories, FROM, TO);

    expect(heatmap.rows.map((row) => row.name)).toEqual([
      'Rent',
      'Groceries',
      'Transport',
      'Fun',
      'Other',
    ]);
    expect(heatmap.rows[4].categoryId).toBeNull();
    expect(heatmap.rows[4].total).toBe(100);
  });

  it('folds uncategorised spend into "Other" rather than giving it a top-N row of its own', () => {
    const transactions = [
      transaction({ id: 1, amount: -900 }), // uncategorised, and the biggest spend in range
      transaction({ id: 2, amount: -100, categoryId: 1 }),
    ];

    const heatmap = computeCategoryCycleHeatmap(transactions, categoriesById(GROCERIES), FROM, TO);

    expect(heatmap.rows.map((row) => row.name)).toEqual(['Groceries', 'Other']);
    expect(heatmap.rows[1].total).toBe(900);
  });

  it('omits the "Other" row entirely when nothing falls into it', () => {
    const transactions = [transaction({ id: 1, amount: -100, categoryId: 1 })];

    const heatmap = computeCategoryCycleHeatmap(transactions, categoriesById(GROCERIES), FROM, TO);

    expect(heatmap.rows).toHaveLength(1);
    expect(heatmap.rows[0].name).toBe('Groceries');
  });

  it('ignores income and savings movements, counting only expense', () => {
    const salary = category(9, 'Salary', { kind: 'income' });
    const transactions = [
      transaction({ id: 1, amount: 2000, categoryId: 9 }), // income
      transaction({ id: 2, amount: -300, counterpartyIban: 'BE10 0000 0000 0002' }), // into own savings
      transaction({ id: 3, amount: -100, categoryId: 1 }), // the only expense
    ];

    const heatmap = computeCategoryCycleHeatmap(
      transactions,
      categoriesById(GROCERIES, salary),
      FROM,
      TO,
      'day-of-week',
      new Set(['BE10000000000002']),
    );

    expect(heatmap.rows.map((row) => row.name)).toEqual(['Groceries']);
    expect(heatmap.rows[0].total).toBe(100);
  });

  it('ignores a linked transfer leg', () => {
    const transactions = [
      transaction({ id: 1, amount: -100, categoryId: 1 }),
      transaction({ id: 2, amount: -400, categoryId: 1, transferId: 7 }),
    ];

    const heatmap = computeCategoryCycleHeatmap(transactions, categoriesById(GROCERIES), FROM, TO);

    expect(heatmap.rows[0].total).toBe(100);
  });

  it('weights a joint account leg by its ownership share, via classifyForStats', () => {
    const jointAccount: Account = {
      id: 2,
      name: 'Joint',
      type: 'joint',
      currency: 'EUR',
      openingBalance: 0,
      openingBalanceDate: FROM,
      color: '#111111',
      icon: 'tablerUsers',
      archived: false,
      ownershipShare: 0.5,
    };
    const transactions = [transaction({ id: 1, accountId: 2, amount: -100, categoryId: 1 })];

    const heatmap = computeCategoryCycleHeatmap(
      transactions,
      categoriesById(GROCERIES),
      FROM,
      TO,
      'day-of-week',
      new Set(),
      new Map([[2, jointAccount]]),
    );

    expect(heatmap.rows[0].total).toBe(50);
  });

  it('clamps a cell whose refunds outweigh its spend to zero instead of inverting the scale', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-06', amount: -40, categoryId: 1 }), // Mon
      transaction({ id: 2, bookingDate: '2026-07-13', amount: 60, categoryId: 1 }), // Mon, refund
      transaction({ id: 3, bookingDate: '2026-07-07', amount: -30, categoryId: 1 }), // Tue
    ];

    const heatmap = computeCategoryCycleHeatmap(transactions, categoriesById(GROCERIES), FROM, TO);

    expect(cellAt(heatmap, 0, 0)).toBe(0); // -40 + 60 nets positive -> clamped, not negative
    expect(cellAt(heatmap, 0, 1)).toBe(30);
    expect(heatmap.rows[0].total).toBe(30); // the row states what its cells add up to
  });

  it('returns no rows and no cells for a range with no expense', () => {
    const heatmap = computeCategoryCycleHeatmap([], categoriesById(GROCERIES), FROM, TO);

    expect(heatmap.rows).toEqual([]);
    expect(heatmap.cells).toEqual([]);
    expect(heatmap.maxAmount).toBe(0);
    expect(heatmap.columnKeys).toHaveLength(7); // the axis exists even when nothing plots on it
  });

  it('buckets by day of the month, keeping every one of the 31 columns (TICKET-STAT-30)', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-06', amount: -10, categoryId: 1 }), // 6th
      transaction({ id: 2, bookingDate: '2026-07-26', amount: -20, categoryId: 1 }), // 26th
    ];

    const heatmap = computeCategoryCycleHeatmap(
      transactions,
      categoriesById(GROCERIES),
      FROM,
      TO,
      'day-of-month',
    );

    expect(heatmap.columnKeys).toHaveLength(31);
    expect(cellAt(heatmap, 0, 5)).toBe(10); // the 6th is column index 5
    expect(cellAt(heatmap, 0, 25)).toBe(20);
    expect(cellAt(heatmap, 0, 30)).toBe(0); // the 31st: reachable by seven months a year, empty here
  });

  it('puts a February 29th in the 29th column rather than dropping it (TICKET-STAT-30)', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2028-02-29', amount: -60, categoryId: 1 }),
    ];

    const heatmap = computeCategoryCycleHeatmap(
      transactions,
      categoriesById(GROCERIES),
      '2028-01-01',
      '2028-12-31',
      'day-of-month',
    );

    expect(cellAt(heatmap, 0, 28)).toBe(60);
  });

  it('folds the same month of two different years into one column (TICKET-STAT-30)', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2025-01-15', amount: -100, categoryId: 1 }),
      transaction({ id: 2, bookingDate: '2026-01-15', amount: -150, categoryId: 1 }),
      transaction({ id: 3, bookingDate: '2026-04-15', amount: -50, categoryId: 1 }),
    ];

    const heatmap = computeCategoryCycleHeatmap(
      transactions,
      categoriesById(GROCERIES),
      '2025-01-01',
      '2026-12-31',
      'month-of-year',
    );

    expect(cellAt(heatmap, 0, 0)).toBe(250); // both Januaries
    expect(cellAt(heatmap, 0, 3)).toBe(50); // April
  });

  it('buckets by quarter (TICKET-STAT-30)', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-02-01', amount: -10, categoryId: 1 }), // Q1
      transaction({ id: 2, bookingDate: '2026-03-31', amount: -20, categoryId: 1 }), // Q1
      transaction({ id: 3, bookingDate: '2026-11-01', amount: -30, categoryId: 1 }), // Q4
    ];

    const heatmap = computeCategoryCycleHeatmap(
      transactions,
      categoriesById(GROCERIES),
      '2026-01-01',
      '2026-12-31',
      'quarter-of-year',
    );

    expect(heatmap.columnKeys).toHaveLength(4);
    expect(cellAt(heatmap, 0, 0)).toBe(30);
    expect(cellAt(heatmap, 0, 3)).toBe(30);
    expect(cellAt(heatmap, 0, 1)).toBe(0);
  });

  it('reports how many of the cycle’s columns the range can reach at all (TICKET-STAT-30)', () => {
    const transactions = [transaction({ id: 1, amount: -10, categoryId: 1 })];
    const categories = categoriesById(GROCERIES);

    // Three weeks: every weekday, but only 3 of 12 months and 1 of 4 quarters.
    expect(
      computeCategoryCycleHeatmap(transactions, categories, FROM, TO, 'day-of-week')
        .coveredColumnCount,
    ).toBe(7);
    expect(
      computeCategoryCycleHeatmap(transactions, categories, FROM, TO, 'month-of-year')
        .coveredColumnCount,
    ).toBe(1);
    expect(
      computeCategoryCycleHeatmap(transactions, categories, FROM, TO, 'quarter-of-year')
        .coveredColumnCount,
    ).toBe(1);
    expect(
      computeCategoryCycleHeatmap(transactions, categories, FROM, TO, 'day-of-month')
        .coveredColumnCount,
    ).toBe(21); // the 6th through the 26th
    expect(
      computeCategoryCycleHeatmap(
        transactions,
        categories,
        '2026-01-01',
        '2026-12-31',
        'month-of-year',
      ).coveredColumnCount,
    ).toBe(12);
  });

  it('excludes transactions outside the range', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-05', amount: -100, categoryId: 1 }), // day before
      transaction({ id: 2, bookingDate: '2026-07-27', amount: -100, categoryId: 1 }), // day after
      transaction({ id: 3, bookingDate: '2026-07-06', amount: -25, categoryId: 1 }),
    ];

    const heatmap = computeCategoryCycleHeatmap(transactions, categoriesById(GROCERIES), FROM, TO);

    expect(heatmap.rows[0].total).toBe(25);
  });
});
