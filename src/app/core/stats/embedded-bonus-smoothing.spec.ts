import type { SalaryMetadata } from '@/core/data-access';
import type { CategorySeriesEntry } from './category-composition-trend';
import { smoothEmbeddedBonuses } from './embedded-bonus-smoothing';
import type { IncomeCategorySeries } from './income-category-series';

const monthsOf = (year: string): string[] =>
  Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);

const series = (categoryId: number, values: number[]): CategorySeriesEntry => ({
  categoryId,
  name: `Category ${categoryId}`,
  color: '#34d399',
  values,
});

const metadata = (rows: Partial<SalaryMetadata>[]): Map<string, SalaryMetadata> =>
  new Map(rows.map((row) => [row.yearMonth!, row as SalaryMetadata]));

/** Salary flat at 2000/month, except June's deposit of 4000 — 2000 of which the user marked a bonus. */
const salaryWithJuneBonus = (): IncomeCategorySeries => ({
  bucketKeys: monthsOf('2025'),
  series: [series(1, [2000, 2000, 2000, 2000, 2000, 4000, 2000, 2000, 2000, 2000, 2000, 2000])],
});

const JUNE_BONUS = metadata([{ yearMonth: '2025-06', grossWage: 3400, bonus: 2000 }]);

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

describe('smoothEmbeddedBonuses: spreading a bonus baked into the deposit (TICKET-INC-13)', () => {
  it("preserves the year's total exactly", () => {
    const raw = salaryWithJuneBonus();

    const result = smoothEmbeddedBonuses(raw, JUNE_BONUS, 'month');

    expect(sum(result.series[0].values)).toBeCloseTo(sum(raw.series[0].values));
    expect(sum(result.series[0].values)).toBeCloseTo(26_000);
  });

  it("drops June to the flat monthly figure and lifts every month of the year by the bonus's twelfth", () => {
    const { values } = smoothEmbeddedBonuses(salaryWithJuneBonus(), JUNE_BONUS, 'month').series[0];

    const share = 2000 / 12;
    expect(values[5]).toBeCloseTo(2000 + share);
    expect(values[0]).toBeCloseTo(2000 + share);
    expect(values[11]).toBeCloseTo(2000 + share);
    // The whole year goes flat: the deposit month is no longer distinguishable from the rest.
    expect(new Set(values.map((value) => value.toFixed(6))).size).toBe(1);
  });

  it("preserves each series' own annual total, not just the year's", () => {
    const twoStreams: IncomeCategorySeries = {
      bucketKeys: monthsOf('2025'),
      series: [
        series(1, [2000, 2000, 2000, 2000, 2000, 4000, 2000, 2000, 2000, 2000, 2000, 2000]),
        series(2, [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500]),
      ],
    };

    const result = smoothEmbeddedBonuses(twoStreams, JUNE_BONUS, 'month');

    expect(sum(result.series[0].values)).toBeCloseTo(sum(twoStreams.series[0].values));
    expect(sum(result.series[1].values)).toBeCloseTo(sum(twoStreams.series[1].values));
  });

  it('removes the bonus pro rata across the series that were non-zero that month', () => {
    // June totals 5000 (salary 4000 + side income 1000), so a 1000 bonus comes off 4/5 : 1/5 —
    // 800 from salary, 200 from side income — then each series gets its own share back evenly.
    const twoStreams: IncomeCategorySeries = {
      bucketKeys: ['2025-06', '2025-07'],
      series: [series(1, [4000, 2000]), series(2, [1000, 1000])],
    };

    const result = smoothEmbeddedBonuses(
      twoStreams,
      metadata([{ yearMonth: '2025-06', bonus: 1000 }]),
      'month',
    );

    expect(result.series[0].values).toEqual([3600, 2400]); // 3200 + 400, 2000 + 400
    expect(result.series[1].values).toEqual([900, 1100]); //   800 + 100, 1000 + 100
  });

  it("keeps each year's bonus inside its own year rather than averaging across history", () => {
    const twoYears: IncomeCategorySeries = {
      bucketKeys: [...monthsOf('2024'), ...monthsOf('2025')],
      series: [
        series(1, [
          ...[2000, 2000, 2000, 2000, 2000, 3200, 2000, 2000, 2000, 2000, 2000, 2000],
          ...[2000, 2000, 2000, 2000, 2000, 4000, 2000, 2000, 2000, 2000, 2000, 2000],
        ]),
      ],
    };

    const { values } = smoothEmbeddedBonuses(
      twoYears,
      metadata([
        { yearMonth: '2024-06', bonus: 1200 },
        { yearMonth: '2025-06', bonus: 2000 },
      ]),
      'month',
    ).series[0];

    expect(values[0]).toBeCloseTo(2000 + 1200 / 12);
    expect(values[12]).toBeCloseTo(2000 + 2000 / 12);
    expect(sum(values.slice(0, 12))).toBeCloseTo(25_200);
    expect(sum(values.slice(12))).toBeCloseTo(26_000);
  });

  it('spreads a partly-covered year across the buckets it actually has, inventing no months', () => {
    const partialYear: IncomeCategorySeries = {
      bucketKeys: ['2025-10', '2025-11', '2025-12'],
      series: [series(1, [2900, 2000, 2000])],
    };

    const { values } = smoothEmbeddedBonuses(
      partialYear,
      metadata([{ yearMonth: '2025-10', bonus: 900 }]),
      'month',
    ).series[0];

    expect(values).toEqual([2300, 2300, 2300]);
    expect(sum(values)).toBeCloseTo(6900);
  });
});

describe('smoothEmbeddedBonuses: nothing to smooth', () => {
  it('returns the input object by reference when no month in range carries a bonus', () => {
    const raw = salaryWithJuneBonus();

    expect(smoothEmbeddedBonuses(raw, new Map(), 'month')).toBe(raw);
  });

  it('returns the input object by reference for a month with salary details but no bonus', () => {
    const raw = salaryWithJuneBonus();

    expect(
      smoothEmbeddedBonuses(raw, metadata([{ yearMonth: '2025-06', grossWage: 3400 }]), 'month'),
    ).toBe(raw);
  });

  it('ignores a bonus recorded for a month outside the series', () => {
    const raw = salaryWithJuneBonus();

    expect(
      smoothEmbeddedBonuses(raw, metadata([{ yearMonth: '2019-06', bonus: 2000 }]), 'month'),
    ).toBe(raw);
  });

  it('still smooths a bonus-only row with no grossWage — the bonus is a fact of its own', () => {
    const result = smoothEmbeddedBonuses(
      salaryWithJuneBonus(),
      metadata([{ yearMonth: '2025-06', bonus: 2000 }]),
      'month',
    );

    expect(result.series[0].values[5]).toBeCloseTo(2000 + 2000 / 12);
  });

  it('keeps the bucket keys as given', () => {
    const raw = salaryWithJuneBonus();

    expect(smoothEmbeddedBonuses(raw, JUNE_BONUS, 'month').bucketKeys).toBe(raw.bucketKeys);
  });
});

describe('smoothEmbeddedBonuses: a bonus larger than the month it landed in', () => {
  it("caps the removal at that month's counted income rather than driving a series negative", () => {
    // Reachable in practice: the bonus is entered against the whole deposit, but the series only
    // counts the categories selected under FR-INC-3 — deselect salary and the counted income shrinks.
    const sideIncomeOnly: IncomeCategorySeries = {
      bucketKeys: monthsOf('2025'),
      series: [series(2, [0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 0, 0])],
    };

    const { values } = smoothEmbeddedBonuses(sideIncomeOnly, JUNE_BONUS, 'month').series[0];

    expect(values.every((value) => value >= 0)).toBe(true);
    expect(sum(values)).toBeCloseTo(300);
    expect(values[5]).toBeCloseTo(25);
  });

  it('leaves a month with no counted income at zero, not NaN', () => {
    const nothing: IncomeCategorySeries = {
      bucketKeys: ['2025-06'],
      series: [series(1, [0])],
    };

    expect(smoothEmbeddedBonuses(nothing, JUNE_BONUS, 'month').series[0].values).toEqual([0]);
  });
});

describe('smoothEmbeddedBonuses: monthly granularity only', () => {
  const nonMonthly = ['day', 'week', 'quarter', 'year'] as const;

  it.each(nonMonthly)('returns the input series unchanged at %s granularity', (granularity) => {
    const raw = salaryWithJuneBonus();

    expect(smoothEmbeddedBonuses(raw, JUNE_BONUS, granularity)).toBe(raw);
  });
});
