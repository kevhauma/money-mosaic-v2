import type { SalaryMetadata } from '@/core/data-access';
import type { CategorySeriesEntry } from './category-composition-trend';
import { smoothEmbeddedBonuses, SMOOTHED_BONUS_CATEGORY_ID } from './embedded-bonus-smoothing';
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

/** Every series' value in one bucket, summed — the figure the chart's stack, the growth panel and the yearly view all read. */
const bucketTotal = ({ series: entries }: IncomeCategorySeries, index: number): number =>
  entries.reduce((total, entry) => total + entry.values[index], 0);

/** The synthetic band TICKET-INC-20 appends, by its sentinel id rather than by position. */
const bonusSeries = (result: IncomeCategorySeries): CategorySeriesEntry =>
  result.series.find((entry) => entry.categoryId === SMOOTHED_BONUS_CATEGORY_ID)!;

describe('smoothEmbeddedBonuses: spreading a bonus baked into the deposit (TICKET-INC-13)', () => {
  it("preserves the year's total exactly, summed across every series", () => {
    const raw = salaryWithJuneBonus();

    const result = smoothEmbeddedBonuses(raw, JUNE_BONUS, 'month');

    const total = sum(result.series.map((entry) => sum(entry.values)));
    expect(total).toBeCloseTo(sum(raw.series[0].values));
    expect(total).toBeCloseTo(26_000);
  });

  it("drops June to the flat monthly figure, with the bonus's twelfth on its own band", () => {
    const result = smoothEmbeddedBonuses(salaryWithJuneBonus(), JUNE_BONUS, 'month');

    // The salary series keeps only what wasn't bonus — flat 2000, June included.
    expect(new Set(result.series[0].values.map((value) => value.toFixed(6))).size).toBe(1);
    expect(result.series[0].values[5]).toBeCloseTo(2000);
    // ...and the twelfth lands on the bonus band instead of back on salary (TICKET-INC-20).
    expect(bonusSeries(result).values.every((value) => Math.abs(value - 2000 / 12) < 1e-9)).toBe(
      true,
    );
    // Stacked, the month still draws the same height it did before smoothing changed anything.
    expect(bucketTotal(result, 5)).toBeCloseTo(2000 + 2000 / 12);
  });

  it('removes the bonus pro rata across the series that were non-zero that month', () => {
    // June totals 5000 (salary 4000 + side income 1000), so a 1000 bonus comes off 4/5 : 1/5 —
    // 800 from salary, 200 from side income — and the whole 1000 is handed to the bonus band.
    const twoStreams: IncomeCategorySeries = {
      bucketKeys: ['2025-06', '2025-07'],
      series: [series(1, [4000, 2000]), series(2, [1000, 1000])],
    };

    const result = smoothEmbeddedBonuses(
      twoStreams,
      metadata([{ yearMonth: '2025-06', bonus: 1000 }]),
      'month',
    );

    expect(result.series[0].values).toEqual([3200, 2000]);
    expect(result.series[1].values).toEqual([800, 1000]);
    expect(bonusSeries(result).values).toEqual([500, 500]);
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

    const result = smoothEmbeddedBonuses(
      twoYears,
      metadata([
        { yearMonth: '2024-06', bonus: 1200 },
        { yearMonth: '2025-06', bonus: 2000 },
      ]),
      'month',
    );

    // No cross-year bleed: each year's band carries only its own removed total.
    expect(bonusSeries(result).values[0]).toBeCloseTo(1200 / 12);
    expect(bonusSeries(result).values[12]).toBeCloseTo(2000 / 12);
    expect(sum(bonusSeries(result).values.slice(0, 12))).toBeCloseTo(1200);
    expect(sum(bonusSeries(result).values.slice(12))).toBeCloseTo(2000);
    // Each year's stacked total is what it was.
    const totalOver = (from: number, to: number): number =>
      sum(Array.from({ length: to - from }, (_, offset) => bucketTotal(result, from + offset)));
    expect(totalOver(0, 12)).toBeCloseTo(25_200);
    expect(totalOver(12, 24)).toBeCloseTo(26_000);
  });

  it('spreads a partly-covered year across the buckets it actually has, inventing no months', () => {
    const partialYear: IncomeCategorySeries = {
      bucketKeys: ['2025-10', '2025-11', '2025-12'],
      series: [series(1, [2900, 2000, 2000])],
    };

    const result = smoothEmbeddedBonuses(
      partialYear,
      metadata([{ yearMonth: '2025-10', bonus: 900 }]),
      'month',
    );

    expect(result.series[0].values).toEqual([2000, 2000, 2000]);
    expect(bonusSeries(result).values).toEqual([300, 300, 300]);
    expect(sum(result.series.flatMap((entry) => entry.values))).toBeCloseTo(6900);
  });
});

describe('smoothEmbeddedBonuses: the bonus gets its own series (TICKET-INC-20)', () => {
  it('appends exactly one extra series, identified by the exported sentinel rather than null', () => {
    const result = smoothEmbeddedBonuses(salaryWithJuneBonus(), JUNE_BONUS, 'month');

    expect(result.series).toHaveLength(2);
    expect(SMOOTHED_BONUS_CATEGORY_ID).toBeLessThan(0);
    // `null` already means "Uncategorised" to `computeGrossNetRatio`'s counted-series filter.
    expect(result.series.some((entry) => entry.categoryId === null)).toBe(false);
    expect(result.series[1].categoryId).toBe(SMOOTHED_BONUS_CATEGORY_ID);
  });

  it('gives the band its own legend name and its own colour, distinct from the categories', () => {
    const result = smoothEmbeddedBonuses(salaryWithJuneBonus(), JUNE_BONUS, 'month');

    expect(bonusSeries(result).name).toBe('Bonus (spread over the year)');
    expect(bonusSeries(result).color).not.toBe(result.series[0].color);
    expect(bonusSeries(result).color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('preserves the per-bucket total across all series, not just the per-year one', () => {
    const raw = salaryWithJuneBonus();

    const result = smoothEmbeddedBonuses(raw, JUNE_BONUS, 'month');

    // Every month except June is unchanged; June loses the spike, and every month gains a twelfth.
    raw.bucketKeys.forEach((_, index) => {
      const spike = index === 5 ? 2000 : 0;
      expect(bucketTotal(result, index)).toBeCloseTo(
        raw.series[0].values[index] + 2000 / 12 - spike,
      );
    });
  });

  it('leaves the real categories carrying only their non-bonus remainder', () => {
    const result = smoothEmbeddedBonuses(salaryWithJuneBonus(), JUNE_BONUS, 'month');

    // TICKET-INC-13's "each series keeps its own annual total" is deliberately superseded here:
    // the bonus moves off salary onto the band, so salary comes out 2000 lighter over the year.
    expect(sum(result.series[0].values)).toBeCloseTo(24_000);
    expect(sum(bonusSeries(result).values)).toBeCloseTo(2000);
  });
});

describe('smoothEmbeddedBonuses: taking the bonus off the main income category (TICKET-INC-19)', () => {
  /** June pays Salary 3000 and Freelance 1000, and the user recorded a 2000 bonus on that deposit. */
  const salaryAndFreelance = (): IncomeCategorySeries => ({
    bucketKeys: monthsOf('2025'),
    series: [
      series(1, [3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]),
      series(2, [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]),
    ],
  });

  const JUNE_2000 = metadata([{ yearMonth: '2025-06', bonus: 2000 }]);

  it('takes the whole bonus off that category and nothing off any other series', () => {
    const result = smoothEmbeddedBonuses(salaryAndFreelance(), JUNE_2000, 'month', 1);

    expect(result.series[0].values[5]).toBeCloseTo(1000); // 3000 − the whole 2000
    // The stream that never paid a bonus is untouched — the bug TICKET-INC-19 exists to fix.
    expect(result.series[1].values).toEqual(salaryAndFreelance().series[1].values);
  });

  it("leaves the year's total unchanged from the raw series, per bucket and per year", () => {
    const raw = salaryAndFreelance();

    const result = smoothEmbeddedBonuses(raw, JUNE_2000, 'month', 1);

    raw.bucketKeys.forEach((_, index) => {
      const rawTotal = raw.series.reduce((total, entry) => total + entry.values[index], 0);
      const spike = index === 5 ? 2000 : 0;
      expect(bucketTotal(result, index)).toBeCloseTo(rawTotal + 2000 / 12 - spike);
    });
    expect(sum(result.series.flatMap((entry) => entry.values))).toBeCloseTo(48_000);
  });

  it("caps the removal at the main category's own value, taking the rest pro rata from the others", () => {
    // Salary 1000 + Freelance 1000 with a 1500 bonus: 1000 off Salary, 500 off Freelance.
    const evenSplit: IncomeCategorySeries = {
      bucketKeys: ['2025-06', '2025-07'],
      series: [series(1, [1000, 1000]), series(2, [1000, 1000])],
    };

    const result = smoothEmbeddedBonuses(
      evenSplit,
      metadata([{ yearMonth: '2025-06', bonus: 1500 }]),
      'month',
      1,
    );

    expect(result.series[0].values[0]).toBeCloseTo(0);
    expect(result.series[1].values[0]).toBeCloseTo(500);
    expect(sum(bonusSeries(result).values)).toBeCloseTo(1500);
  });

  it("drives the month to zero — not below it, and not to NaN — for a bonus past the month's total", () => {
    const evenSplit: IncomeCategorySeries = {
      bucketKeys: ['2025-06', '2025-07'],
      series: [series(1, [1000, 1000]), series(2, [1000, 1000])],
    };

    const result = smoothEmbeddedBonuses(
      evenSplit,
      metadata([{ yearMonth: '2025-06', bonus: 5000 }]),
      'month',
      1,
    );

    const values = result.series.flatMap((entry) => entry.values);
    expect(values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
    expect(result.series[0].values[0]).toBeCloseTo(0);
    expect(result.series[1].values[0]).toBeCloseTo(0);
    // Capped at the month's own total, so only 2000 was ever removable.
    expect(sum(bonusSeries(result).values)).toBeCloseTo(2000);
    expect(sum(values)).toBeCloseTo(4000);
  });

  describe('falling back to the pro-rata split', () => {
    const proRata = (): IncomeCategorySeries =>
      smoothEmbeddedBonuses(salaryAndFreelance(), JUNE_2000, 'month');

    it('with no main category set', () => {
      expect(smoothEmbeddedBonuses(salaryAndFreelance(), JUNE_2000, 'month', undefined)).toEqual(
        proRata(),
      );
    });

    it('with an id naming a category outside the current selection', () => {
      // Excluded under FR-INC-3, archived or deleted all look the same here: no series to act on.
      expect(smoothEmbeddedBonuses(salaryAndFreelance(), JUNE_2000, 'month', 99)).toEqual(
        proRata(),
      );
    });

    it('with an id matching no category at all', () => {
      expect(smoothEmbeddedBonuses(salaryAndFreelance(), JUNE_2000, 'month', 0)).toEqual(proRata());
    });

    it('and the pro-rata split really is the shaving-off-everything behaviour', () => {
      // June totals 4000, so a 2000 bonus comes off half of each — including 500 of freelance
      // income that never was a bonus. This is what naming a main category prevents.
      expect(proRata().series[0].values[5]).toBeCloseTo(1500);
      expect(proRata().series[1].values[5]).toBeCloseTo(500);
    });
  });
});

describe('smoothEmbeddedBonuses: nothing to smooth', () => {
  it('returns the input object by reference when no month in range carries a bonus', () => {
    const raw = salaryWithJuneBonus();

    expect(smoothEmbeddedBonuses(raw, new Map(), 'month')).toBe(raw);
    expect(smoothEmbeddedBonuses(raw, new Map(), 'month', 1)).toBe(raw);
  });

  it('returns the input object by reference for a month with salary details but no bonus', () => {
    const raw = salaryWithJuneBonus();

    expect(
      smoothEmbeddedBonuses(raw, metadata([{ yearMonth: '2025-06', grossWage: 3400 }]), 'month', 1),
    ).toBe(raw);
  });

  it('ignores a bonus recorded for a month outside the series', () => {
    const raw = salaryWithJuneBonus();

    expect(
      smoothEmbeddedBonuses(raw, metadata([{ yearMonth: '2019-06', bonus: 2000 }]), 'month', 1),
    ).toBe(raw);
  });

  it('adds no empty extra series when there was nothing to remove', () => {
    const raw = salaryWithJuneBonus();

    expect(smoothEmbeddedBonuses(raw, new Map(), 'month').series).toHaveLength(1);
  });

  it('still smooths a bonus-only row with no grossWage — the bonus is a fact of its own', () => {
    const result = smoothEmbeddedBonuses(
      salaryWithJuneBonus(),
      metadata([{ yearMonth: '2025-06', bonus: 2000 }]),
      'month',
    );

    expect(bucketTotal(result, 5)).toBeCloseTo(2000 + 2000 / 12);
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

    const result = smoothEmbeddedBonuses(sideIncomeOnly, JUNE_BONUS, 'month');

    const values = result.series.flatMap((entry) => entry.values);
    expect(values.every((value) => value >= 0)).toBe(true);
    expect(sum(values)).toBeCloseTo(300);
    expect(bonusSeries(result).values[5]).toBeCloseTo(25);
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
    expect(smoothEmbeddedBonuses(raw, JUNE_BONUS, granularity, 1)).toBe(raw);
  });
});
