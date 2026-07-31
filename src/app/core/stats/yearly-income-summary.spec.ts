import type { Category, Transaction } from '@/core/data-access';
import { computeYearlyIncomeSummary } from './yearly-income-summary';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Salary',
  kind: 'income',
  color: '#34d399',
  icon: 'cash',
  archived: false,
  isSystem: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2024-01-15',
  amount: 2000,
  currency: 'EUR',
  rawDescription: 'x',
  fingerprint: 'fp',
  createdAt: '2024-01-15T00:00:00.000Z',
  ...overrides,
});

const salaryAndOther = new Map<number, Category>([
  [1, category({ id: 1, name: 'Salary' })],
  [2, category({ id: 2, name: 'Other Income' })],
]);

describe('computeYearlyIncomeSummary: gap-filled calendar years (FR-INC-6)', () => {
  it('returns one entry per calendar year touched by the range, ascending', () => {
    const result = computeYearlyIncomeSummary(
      [
        transaction({ id: 1, bookingDate: '2024-03-01', amount: 1000, categoryId: 1 }),
        transaction({ id: 2, bookingDate: '2026-03-01', amount: 1000, categoryId: 1 }),
      ],
      salaryAndOther,
      new Set([1]),
      '2024-01-01',
      '2026-12-31',
    );

    expect(result.map((entry) => entry.year)).toEqual(['2024', '2025', '2026']);
  });

  it('renders a year with no selected-category income as a zero total, not a skipped year', () => {
    const result = computeYearlyIncomeSummary(
      [
        transaction({ id: 1, bookingDate: '2024-03-01', amount: 1000, categoryId: 1 }),
        transaction({ id: 2, bookingDate: '2026-03-01', amount: 1000, categoryId: 1 }),
      ],
      salaryAndOther,
      new Set([1]),
      '2024-01-01',
      '2026-12-31',
    );

    expect(result.map((entry) => entry.total)).toEqual([1000, 0, 1000]);
  });

  it('sums every month of a year into that year’s single total', () => {
    const result = computeYearlyIncomeSummary(
      [
        transaction({ id: 1, bookingDate: '2024-01-31', amount: 2000, categoryId: 1 }),
        transaction({ id: 2, bookingDate: '2024-07-15', amount: 2000, categoryId: 1 }),
        transaction({ id: 3, bookingDate: '2024-12-31', amount: 2000, categoryId: 1 }),
      ],
      salaryAndOther,
      new Set([1]),
      '2024-01-01',
      '2024-12-31',
    );

    expect(result).toEqual([
      { year: '2024', total: 6000, isPartialYear: false, pctVsPriorYear: null },
    ]);
  });
});

describe('computeYearlyIncomeSummary: pctVsPriorYear', () => {
  const overTwoYears = (firstYearAmount: number, secondYearAmount: number) =>
    computeYearlyIncomeSummary(
      [
        transaction({ id: 1, bookingDate: '2025-06-01', amount: firstYearAmount, categoryId: 1 }),
        transaction({ id: 2, bookingDate: '2026-06-01', amount: secondYearAmount, categoryId: 1 }),
      ],
      salaryAndOther,
      new Set([1]),
      '2025-01-01',
      '2026-12-31',
    );

  it('is null for the first year — there is no prior year to compare against', () => {
    expect(overTwoYears(1000, 1100)[0].pctVsPriorYear).toBeNull();
  });

  it('is null (not ±∞%) when the prior year’s total is zero', () => {
    const result = overTwoYears(0, 1200);

    expect(result[0].total).toBe(0);
    expect(result[1].pctVsPriorYear).toBeNull();
  });

  it('reports a rise as a positive fraction of the prior year', () => {
    expect(overTwoYears(1000, 1100)[1].pctVsPriorYear).toBeCloseTo(0.1);
  });

  it('reports a drop as a negative fraction of the prior year', () => {
    expect(overTwoYears(1000, 750)[1].pctVsPriorYear).toBeCloseTo(-0.25);
  });

  it('is 0 for a year that exactly matches the year before it', () => {
    expect(overTwoYears(1000, 1000)[1].pctVsPriorYear).toBe(0);
  });
});

describe('computeYearlyIncomeSummary: partial years take no percentage', () => {
  const twoYears = (from: string, to: string) =>
    computeYearlyIncomeSummary(
      [
        transaction({ id: 1, bookingDate: '2025-06-01', amount: 12000, categoryId: 1 }),
        transaction({ id: 2, bookingDate: '2026-06-01', amount: 6000, categoryId: 1 }),
      ],
      salaryAndOther,
      new Set([1]),
      from,
      to,
    );

  it('flags a year the range only partly covers, and a fully-covered one as complete', () => {
    // History starts mid-2025 and stops mid-2026: neither end year is a whole calendar year.
    const result = twoYears('2025-06-01', '2026-06-30');

    expect(result.map((entry) => entry.isPartialYear)).toEqual([true, true]);
    expect(twoYears('2025-01-01', '2026-12-31').map((entry) => entry.isPartialYear)).toEqual([
      false,
      false,
    ]);
  });

  it('suppresses the % on an in-progress year rather than reading half a year as a collapse', () => {
    const result = twoYears('2025-01-01', '2026-06-30');

    // 6000 against a full prior year of 12000 would render as -50% purely because June isn't December.
    expect(result[1].isPartialYear).toBe(true);
    expect(result[1].pctVsPriorYear).toBeNull();
  });

  it('suppresses the % on the year after a partial first year, whose basis is incomplete', () => {
    const result = twoYears('2025-06-01', '2026-12-31');

    expect(result[1].isPartialYear).toBe(false);
    expect(result[0].isPartialYear).toBe(true);
    expect(result[1].pctVsPriorYear).toBeNull();
  });

  it('still reports a partial year’s own total — incomplete data is real data', () => {
    const result = twoYears('2025-01-01', '2026-06-30');

    expect(result[1].total).toBe(6000);
  });

  it('keeps the % between two fully-covered years', () => {
    expect(twoYears('2025-01-01', '2026-12-31')[1].pctVsPriorYear).toBeCloseTo(-0.5);
  });
});

describe('computeYearlyIncomeSummary: classification is delegated to classifyForStats', () => {
  const withExtra = (extra: Partial<Transaction>, ownSavingsIbans?: ReadonlySet<string>) =>
    computeYearlyIncomeSummary(
      [
        transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
        transaction({ id: 2, bookingDate: '2026-02-15', amount: 500, categoryId: 1, ...extra }),
      ],
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-12-31',
      ownSavingsIbans,
    );

  it('ignores a linked transfer leg', () => {
    expect(withExtra({ transferId: 7 })[0].total).toBe(2000);
  });

  it('ignores a nullified transaction', () => {
    expect(withExtra({ nullified: true })[0].total).toBe(2000);
  });

  it('ignores a withdrawal from an own savings account rather than counting it as income', () => {
    const savingsIban = 'BE68539007547034';

    expect(withExtra({ counterpartyIban: savingsIban }, new Set([savingsIban]))[0].total).toBe(
      2000,
    );
  });

  it('nets a refund on an income category down rather than bucketing it as expense', () => {
    expect(withExtra({ amount: -200 })[0].total).toBe(1800);
  });
});

describe('computeYearlyIncomeSummary: selection (FR-INC-3)', () => {
  const bothCategories = [
    transaction({ id: 1, bookingDate: '2026-01-15', amount: 2000, categoryId: 1 }),
    transaction({ id: 2, bookingDate: '2026-01-20', amount: 150, categoryId: 2 }),
  ];

  it('counts only the selected income categories', () => {
    const result = computeYearlyIncomeSummary(
      bothCategories,
      salaryAndOther,
      new Set([1]),
      '2026-01-01',
      '2026-12-31',
    );

    expect(result[0].total).toBe(2000);
  });

  it('adds a category back into the same year’s total once it is selected', () => {
    const result = computeYearlyIncomeSummary(
      bothCategories,
      salaryAndOther,
      new Set([1, 2]),
      '2026-01-01',
      '2026-12-31',
    );

    expect(result[0].total).toBe(2150);
  });

  it('excludes uncategorised income, which belongs to no selectable category', () => {
    const result = computeYearlyIncomeSummary(
      [
        ...bothCategories,
        transaction({ id: 3, bookingDate: '2026-01-25', amount: 900, categoryId: undefined }),
      ],
      salaryAndOther,
      new Set([1, 2]),
      '2026-01-01',
      '2026-12-31',
    );

    expect(result[0].total).toBe(2150);
  });

  it('totals every year to zero when nothing is selected', () => {
    const result = computeYearlyIncomeSummary(
      bothCategories,
      salaryAndOther,
      new Set(),
      '2026-01-01',
      '2026-12-31',
    );

    expect(result).toEqual([
      { year: '2026', total: 0, isPartialYear: false, pctVsPriorYear: null },
    ]);
  });
});
