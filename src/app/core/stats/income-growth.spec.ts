import type { CategorySeriesEntry } from './category-composition-trend';
import { computeIncomeGrowth } from './income-growth';
import type { IncomeCategorySeries } from './income-category-series';

const monthsOf = (...years: string[]): string[] =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`),
  );

const series = (categoryId: number, values: number[]): CategorySeriesEntry => ({
  categoryId,
  name: `Category ${categoryId}`,
  color: '#34d399',
  values,
});

/** Two full years of monthly buckets, 2025–2026. */
const BUCKET_KEYS = monthsOf('2025', '2026');

const trendOf = (...entries: CategorySeriesEntry[]): IncomeCategorySeries => ({
  bucketKeys: BUCKET_KEYS,
  series: entries,
});

/** A single month's window, e.g. `march('2026')` → the whole of March 2026. */
const monthWindow = (yearMonth: string): [string, string] => {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [`${yearMonth}-01`, `${yearMonth}-${String(lastDay).padStart(2, '0')}`];
};

const growthFor = (trend: IncomeCategorySeries, yearMonth: string) =>
  computeIncomeGrowth(trend, 'month', ...monthWindow(yearMonth));

describe('computeIncomeGrowth: period-over-period (FR-INC-5)', () => {
  it('is 0% for a category that pays exactly the same every month', () => {
    const flat = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );

    expect(growthFor(flat, '2026-06').current).toBe(2000);
    expect(growthFor(flat, '2026-06').priorPeriod?.total).toBe(2000);
    expect(growthFor(flat, '2026-06').priorPeriod?.pct).toBe(0);
  });

  it('is positive for a category that rises every month', () => {
    const rising = trendOf(
      series(
        1,
        BUCKET_KEYS.map((_, index) => 1000 + index * 100),
      ),
    );

    // June 2026 is index 17 (1000 + 1700), May index 16 (1000 + 1600).
    const result = growthFor(rising, '2026-06');
    expect(result.current).toBe(2700);
    expect(result.priorPeriod?.total).toBe(2600);
    expect(result.priorPeriod?.pct).toBeCloseTo(100 / 2600);
  });

  it('is negative for a drop against the month before', () => {
    const values = BUCKET_KEYS.map(() => 2000);
    values[17] = 1500;
    const result = growthFor(trendOf(series(1, values)), '2026-06');

    expect(result.priorPeriod?.pct).toBeCloseTo(-0.25);
  });

  it('names the window it compared against, so the figures can be checked', () => {
    const flat = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );
    const result = growthFor(flat, '2026-06');

    expect(result.priorPeriod).toMatchObject({ from: '2026-05-01', to: '2026-05-31' });
    expect(result.priorYear).toMatchObject({ from: '2025-06-01', to: '2025-06-30' });
  });

  it('sums every selected category into one figure', () => {
    const twoCategories = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
      series(
        2,
        BUCKET_KEYS.map(() => 150),
      ),
    );

    expect(growthFor(twoCategories, '2026-06').current).toBe(2150);
  });

  it('counts only what the caller put in the series — a deselected category is simply absent', () => {
    // FR-INC-3 is applied upstream by `computeIncomeCategorySeries`, so dropping the entry is
    // exactly what deselecting does to both the current and the prior totals.
    const salaryOnly = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );
    const withOther = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
      series(
        2,
        BUCKET_KEYS.map((_, index) => index * 10),
      ),
    );

    expect(salaryOnly.series).toHaveLength(1);
    expect(growthFor(salaryOnly, '2026-06').current).toBe(2000);
    expect(growthFor(withOther, '2026-06').current).toBeGreaterThan(2000);
    expect(growthFor(withOther, '2026-06').priorPeriod?.total).toBeGreaterThan(2000);
  });
});

describe('computeIncomeGrowth: year-over-year (FR-INC-5)', () => {
  it('compares the same month one calendar year back, not the bucket before it', () => {
    const values = BUCKET_KEYS.map(() => 2000);
    values[5] = 1000; // June 2025
    values[17] = 2200; // June 2026
    const result = growthFor(trendOf(series(1, values)), '2026-06');

    expect(result.priorYear?.total).toBe(1000);
    expect(result.priorYear?.pct).toBeCloseTo(1.2);
  });

  it('is null when the series has no data that far back — hide, don’t lie', () => {
    const oneYearOnly: IncomeCategorySeries = {
      bucketKeys: monthsOf('2026'),
      series: [
        series(
          1,
          monthsOf('2026').map(() => 2000),
        ),
      ],
    };

    expect(
      computeIncomeGrowth(oneYearOnly, 'month', ...monthWindow('2026-06')).priorYear,
    ).toBeNull();
  });

  it('is null rather than partial when the year-back window is only half covered', () => {
    // Series starts in 2026-04, so a window over 2026-01..2026-03 shifted back a year is missing.
    const lateStart: IncomeCategorySeries = {
      bucketKeys: monthsOf('2026').slice(3),
      series: [
        series(
          1,
          monthsOf('2026')
            .slice(3)
            .map(() => 2000),
        ),
      ],
    };

    const result = computeIncomeGrowth(lateStart, 'month', '2026-06-01', '2026-08-31');
    expect(result.priorYear).toBeNull();
  });
});

describe('computeIncomeGrowth: no percentage to report', () => {
  it('is null (not ±∞%) for a category that did not exist in the prior period', () => {
    const values = BUCKET_KEYS.map(() => 0);
    values[17] = 2000; // First ever income, June 2026.
    const result = growthFor(trendOf(series(1, values)), '2026-06');

    expect(result.current).toBe(2000);
    expect(result.priorPeriod?.total).toBe(0);
    expect(result.priorPeriod?.pct).toBeNull();
    expect(result.priorYear?.pct).toBeNull();
  });

  it('never yields NaN or Infinity when both windows are zero', () => {
    const nothing = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 0),
      ),
    );
    const result = growthFor(nothing, '2026-06');

    expect(result.priorPeriod?.pct).toBeNull();
    expect(result.priorYear?.pct).toBeNull();
  });

  it('has no prior period at the very first bucket of the series', () => {
    const flat = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );

    expect(growthFor(flat, '2025-01').priorPeriod).toBeNull();
  });

  it('reports zero and no comparisons for a window outside the series entirely', () => {
    const flat = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );
    const result = computeIncomeGrowth(flat, 'month', '2030-01-01', '2030-01-31');

    expect(result.current).toBe(0);
    expect(result.priorPeriod).toBeNull();
    expect(result.priorYear).toBeNull();
  });
});

describe('computeIncomeGrowth: multi-month windows', () => {
  it('compares a quarter to the three months immediately before it', () => {
    // 2026 Q2 (indices 15–17) pays double.
    const values = BUCKET_KEYS.map((_, index) => (index >= 15 && index <= 17 ? 2000 : 1000));
    const result = computeIncomeGrowth(
      trendOf(series(1, values)),
      'month',
      '2026-04-01',
      '2026-06-30',
    );

    expect(result.current).toBe(6000);
    expect(result.priorPeriod).toMatchObject({ from: '2026-01-01', to: '2026-03-31', total: 3000 });
    expect(result.priorPeriod?.pct).toBeCloseTo(1);
  });
});
