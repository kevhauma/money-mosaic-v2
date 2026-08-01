import { smoothAnnualLumpSums } from './annual-lump-sum-smoothing';
import type { CategorySeriesEntry } from './category-composition-trend';
import type { IncomeCategorySeries } from './income-category-series';

const monthsOf = (year: string): string[] =>
  Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);

const series = (categoryId: number, values: number[]): CategorySeriesEntry => ({
  categoryId,
  name: `Category ${categoryId}`,
  color: '#34d399',
  values,
});

/** Salary flat at 2000/month all year, plus a 6000 holiday bonus landing in June alone. */
const salaryAndBonus = (): IncomeCategorySeries => ({
  bucketKeys: monthsOf('2025'),
  series: [
    series(
      1,
      Array.from({ length: 12 }, () => 2000),
    ),
    series(2, [0, 0, 0, 0, 0, 6000, 0, 0, 0, 0, 0, 0]),
  ],
});

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

describe('smoothAnnualLumpSums: spreading a flagged category (FR-INC-4)', () => {
  it('replaces the spike with the year’s average across every month', () => {
    const result = smoothAnnualLumpSums(salaryAndBonus(), new Set([2]), 'month');

    expect(result.series[1].values).toEqual(Array.from({ length: 12 }, () => 500));
  });

  it('preserves the flagged category’s annual total exactly', () => {
    const raw = salaryAndBonus();
    const result = smoothAnnualLumpSums(raw, new Set([2]), 'month');

    expect(sum(result.series[1].values)).toBeCloseTo(sum(raw.series[1].values));
    expect(sum(result.series[1].values)).toBeCloseTo(6000);
  });

  it('preserves each year’s total independently rather than averaging across the whole history', () => {
    const twoYears: IncomeCategorySeries = {
      bucketKeys: [...monthsOf('2024'), ...monthsOf('2025')],
      series: [
        series(2, [
          ...[0, 0, 0, 0, 0, 1200, 0, 0, 0, 0, 0, 0],
          ...[0, 0, 0, 0, 0, 6000, 0, 0, 0, 0, 0, 0],
        ]),
      ],
    };

    const { values } = smoothAnnualLumpSums(twoYears, new Set([2]), 'month').series[0];

    expect(sum(values.slice(0, 12))).toBeCloseTo(1200);
    expect(sum(values.slice(12))).toBeCloseTo(6000);
    expect(values[0]).toBe(100);
    expect(values[12]).toBe(500);
  });

  it('spreads a partly-covered year across the buckets it actually has, inventing no months', () => {
    // History starts in October: three buckets, so the year's 900 becomes 300 apiece.
    const partialYear: IncomeCategorySeries = {
      bucketKeys: ['2025-10', '2025-11', '2025-12'],
      series: [series(2, [900, 0, 0])],
    };

    const { values } = smoothAnnualLumpSums(partialYear, new Set([2]), 'month').series[0];

    expect(values).toEqual([300, 300, 300]);
    expect(sum(values)).toBe(900);
  });

  it('leaves a flagged category that never paid out at zero, not NaN', () => {
    const nothing: IncomeCategorySeries = {
      bucketKeys: monthsOf('2025'),
      series: [
        series(
          2,
          Array.from({ length: 12 }, () => 0),
        ),
      ],
    };

    expect(smoothAnnualLumpSums(nothing, new Set([2]), 'month').series[0].values).toEqual(
      Array.from({ length: 12 }, () => 0),
    );
  });
});

describe('smoothAnnualLumpSums: unflagged categories pass through', () => {
  it('returns the very same values array for a category that is not flagged', () => {
    const raw = salaryAndBonus();
    const result = smoothAnnualLumpSums(raw, new Set([2]), 'month');

    expect(result.series[0].values).toBe(raw.series[0].values);
  });

  it('returns the input object untouched when nothing is flagged at all', () => {
    const raw = salaryAndBonus();

    expect(smoothAnnualLumpSums(raw, new Set(), 'month')).toBe(raw);
  });

  it('never smooths an uncategorised series, which has no id to flag', () => {
    const uncategorised: IncomeCategorySeries = {
      bucketKeys: monthsOf('2025'),
      series: [{ ...series(2, [0, 0, 0, 0, 0, 6000, 0, 0, 0, 0, 0, 0]), categoryId: null }],
    };
    const result = smoothAnnualLumpSums(uncategorised, new Set([2]), 'month');

    expect(result.series[0].values).toBe(uncategorised.series[0].values);
  });

  it('keeps the bucket keys as given', () => {
    const raw = salaryAndBonus();

    expect(smoothAnnualLumpSums(raw, new Set([2]), 'month').bucketKeys).toBe(raw.bucketKeys);
  });
});

describe('smoothAnnualLumpSums: monthly granularity only', () => {
  const nonMonthly = ['day', 'week', 'quarter', 'year'] as const;

  it.each(nonMonthly)('returns the input series unchanged at %s granularity', (granularity) => {
    const raw = salaryAndBonus();

    expect(smoothAnnualLumpSums(raw, new Set([1, 2]), granularity)).toBe(raw);
  });
});
