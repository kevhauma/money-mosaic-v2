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

describe('computeIncomeGrowth: vs. start of year (FR-INC-5, TICKET-INC-15)', () => {
  it('is 0% for a category that pays exactly the same every month', () => {
    const flat = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );

    expect(growthFor(flat, '2026-06').current).toBe(2000);
    expect(growthFor(flat, '2026-06').yearStart?.total).toBe(2000);
    expect(growthFor(flat, '2026-06').yearStart?.pct).toBe(0);
  });

  it('measures from January of the compared month’s own year, not the month before', () => {
    const rising = trendOf(
      series(
        1,
        BUCKET_KEYS.map((_, index) => 1000 + index * 100),
      ),
    );

    // June 2026 is index 17 (2700); January 2026 is index 12 (2200) — not May's 2600.
    const result = growthFor(rising, '2026-06');
    expect(result.current).toBe(2700);
    expect(result.yearStart?.total).toBe(2200);
    expect(result.yearStart?.pct).toBeCloseTo(500 / 2200);
  });

  it('is negative for a drop against the year’s opening month', () => {
    const values = BUCKET_KEYS.map(() => 2000);
    values[17] = 1500;
    const result = growthFor(trendOf(series(1, values)), '2026-06');

    expect(result.yearStart?.pct).toBeCloseTo(-0.25);
  });

  it('stays inside the compared month’s year rather than walking back into the previous one', () => {
    const values = BUCKET_KEYS.map(() => 2000);
    values.fill(9000, 0, 12); // All of 2025 pays far more — and must not be the baseline.
    const result = growthFor(trendOf(series(1, values)), '2026-06');

    expect(result.yearStart?.total).toBe(2000);
    expect(result.yearStart).toMatchObject({ from: '2026-01-01', to: '2026-01-31' });
  });

  it('names the window it compared against, so the figures can be checked', () => {
    const flat = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );
    const result = growthFor(flat, '2026-06');

    expect(result.yearStart).toMatchObject({ from: '2026-01-01', to: '2026-01-31' });
    expect(result.priorYear).toMatchObject({ from: '2025-06-01', to: '2025-06-30' });
  });

  it('uses the year’s first *available* bucket for a history that opens mid-year', () => {
    // A career start (FR-INC-12) of 2024-04: April *is* that year's opening month, and comparing
    // September against it is the intended reading — not a refusal because January is absent.
    const fromApril = monthsOf('2024').slice(3);
    const lateStart: IncomeCategorySeries = {
      bucketKeys: fromApril,
      series: [
        series(
          1,
          fromApril.map((_, index) => 2000 + index * 100),
        ),
      ],
    };

    const result = computeIncomeGrowth(lateStart, 'month', ...monthWindow('2024-09'));

    expect(result.yearStart).toMatchObject({ from: '2024-04-01', to: '2024-04-30', total: 2000 });
    expect(result.current).toBe(2500);
    expect(result.yearStart?.pct).toBeCloseTo(500 / 2000);
  });

  it('is null when the compared month is itself the year’s opening bucket', () => {
    const fromApril = monthsOf('2024').slice(3);
    const lateStart: IncomeCategorySeries = {
      bucketKeys: fromApril,
      series: [
        series(
          1,
          fromApril.map(() => 2000),
        ),
      ],
    };

    expect(computeIncomeGrowth(lateStart, 'month', ...monthWindow('2024-04')).yearStart).toBeNull();
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
    expect(growthFor(withOther, '2026-06').yearStart?.total).toBeGreaterThan(2000);
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
    expect(result.yearStart?.total).toBe(0);
    expect(result.yearStart?.pct).toBeNull();
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

    expect(result.yearStart?.pct).toBeNull();
    expect(result.priorYear?.pct).toBeNull();
  });

  it('has no prior period at the very first bucket of the series', () => {
    const flat = trendOf(
      series(
        1,
        BUCKET_KEYS.map(() => 2000),
      ),
    );

    expect(growthFor(flat, '2025-01').yearStart).toBeNull();
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
    expect(result.yearStart).toBeNull();
    expect(result.priorYear).toBeNull();
  });
});

describe('computeIncomeGrowth: multi-month windows', () => {
  it('compares a quarter to its year’s opening *month*, not to a same-length window', () => {
    // 2026 Q2 (indices 15–17) pays double. The baseline stays one bucket wide either way — the
    // panel only ever asks for a single month, and a quarter-vs-quarter reading would be a
    // different feature (TICKET-INC-15 replaced the same-length prior period outright).
    const values = BUCKET_KEYS.map((_, index) => (index >= 15 && index <= 17 ? 2000 : 1000));
    const result = computeIncomeGrowth(
      trendOf(series(1, values)),
      'month',
      '2026-04-01',
      '2026-06-30',
    );

    expect(result.current).toBe(6000);
    expect(result.yearStart).toMatchObject({ from: '2026-01-01', to: '2026-01-31', total: 1000 });
    expect(result.yearStart?.pct).toBeCloseTo(5);
  });
});
