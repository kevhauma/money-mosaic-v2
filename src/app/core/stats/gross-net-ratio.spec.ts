import type { SalaryMetadata } from '@/core/data-access';
import type { CategorySeriesEntry } from './category-composition-trend';
import { smoothEmbeddedBonuses, SMOOTHED_BONUS_CATEGORY_ID } from './embedded-bonus-smoothing';
import { computeGrossNetRatio } from './gross-net-ratio';
import type { IncomeCategorySeries } from './income-category-series';
import { smoothAnnualLumpSums } from './annual-lump-sum-smoothing';

const BUCKET_KEYS = Array.from(
  { length: 12 },
  (_, index) => `2026-${String(index + 1).padStart(2, '0')}`,
);

const series = (categoryId: number, values: number[]): CategorySeriesEntry => ({
  categoryId,
  name: `Category ${categoryId}`,
  color: '#34d399',
  values,
});

const trendOf = (...entries: CategorySeriesEntry[]): IncomeCategorySeries => ({
  bucketKeys: BUCKET_KEYS,
  series: entries,
});

const flat = (amount: number): number[] => BUCKET_KEYS.map(() => amount);

const metadata = (...entries: SalaryMetadata[]): Map<string, SalaryMetadata> =>
  new Map(entries.map((entry) => [entry.yearMonth, entry]));

describe('computeGrossNetRatio: the ratio (FR-INC-11)', () => {
  it('divides the month’s received income by its entered gross wage', () => {
    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2160))),
      metadata({ yearMonth: '2026-03', grossWage: 3000 }),
    );

    expect(points[2]).toEqual({ bucketKey: '2026-03', net: 2160, gross: 3000, ratio: 0.72 });
  });

  it('returns one point per bucket, in order', () => {
    const points = computeGrossNetRatio(trendOf(series(1, flat(2000))), metadata());

    expect(points.map((point) => point.bucketKey)).toEqual(BUCKET_KEYS);
  });

  it('sums every category in the series into net', () => {
    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2000)), series(2, flat(160))),
      metadata({ yearMonth: '2026-01', grossWage: 3000 }),
    );

    expect(points[0].net).toBe(2160);
  });

  it('counts only the selected categories, because the series it is given already excludes the rest', () => {
    // FR-INC-3 is applied upstream by `computeIncomeCategorySeries`; dropping the entry is what
    // deselecting does, and it must land on `net` before any bonus is subtracted.
    const salaryOnly = computeGrossNetRatio(
      trendOf(series(1, flat(2000))),
      metadata({ yearMonth: '2026-01', grossWage: 3000 }),
    );

    expect(salaryOnly[0].net).toBe(2000);
    expect(salaryOnly[0].ratio).toBeCloseTo(2000 / 3000);
  });
});

describe('computeGrossNetRatio: months with nothing entered', () => {
  it('reports gross and ratio as null, never 0 or Infinity', () => {
    const points = computeGrossNetRatio(trendOf(series(1, flat(2160))), metadata());

    expect(points[0]).toEqual({ bucketKey: '2026-01', net: 2160, gross: null, ratio: null });
  });

  it('still reports what was received, which is real data', () => {
    const points = computeGrossNetRatio(trendOf(series(1, flat(2160))), metadata());

    expect(points.every((point) => point.net === 2160)).toBe(true);
  });

  it('leaves a gap only for the months without an entry', () => {
    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2160))),
      metadata({ yearMonth: '2026-02', grossWage: 3000 }),
    );

    expect(points.filter((point) => point.ratio !== null).map((point) => point.bucketKey)).toEqual([
      '2026-02',
    ]);
  });

  it('never yields NaN or Infinity for a gross wage of zero', () => {
    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2160))),
      metadata({ yearMonth: '2026-01', grossWage: 0 }),
    );

    expect(points[0].ratio).toBeNull();
  });

  it('treats a bonus-only entry as having no gross to compare against', () => {
    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2160))),
      metadata({ yearMonth: '2026-01', bonus: 500 }),
    );

    expect(points[0]).toMatchObject({ net: 1660, gross: null, ratio: null });
  });
});

describe('computeGrossNetRatio: the embedded bonus (FR-INC-10)', () => {
  it('subtracts the bonus from net before dividing', () => {
    // June's deposit was 4160, of which 2000 was holiday pay: the regular wage was 2160.
    const values = flat(2160);
    values[5] = 4160;

    const points = computeGrossNetRatio(
      trendOf(series(1, values)),
      metadata({ yearMonth: '2026-06', grossWage: 3000, bonus: 2000 }),
    );

    expect(points[5].net).toBe(2160);
    expect(points[5].ratio).toBe(0.72);
  });

  it('would otherwise report a take-home rate the user never had', () => {
    const values = flat(2160);
    values[5] = 4160;

    const withoutBonus = computeGrossNetRatio(
      trendOf(series(1, values)),
      metadata({ yearMonth: '2026-06', grossWage: 3000 }),
    );

    // The negative control: unadjusted, June reads as a 139% take-home rate.
    expect(withoutBonus[5].ratio).toBeGreaterThan(1);
  });

  it('leaves a month with an entry but no bonus exactly as it was', () => {
    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2160))),
      metadata({ yearMonth: '2026-03', grossWage: 3000 }),
    );

    expect(points[2]).toEqual({ bucketKey: '2026-03', net: 2160, gross: 3000, ratio: 0.72 });
  });

  it('applies the bonus only to its own month', () => {
    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2160))),
      metadata(
        { yearMonth: '2026-06', grossWage: 3000, bonus: 500 },
        { yearMonth: '2026-07', grossWage: 3000 },
      ),
    );

    expect(points[5].net).toBe(1660);
    expect(points[6].net).toBe(2160);
  });
});

describe('computeGrossNetRatio: annual lump-sum categories (TICKET-INC-14)', () => {
  /** Flat 2,160 salary plus a 12,000 bonus category paid once, in June; gross 3,000 every month. */
  const withBonusCategory = (): IncomeCategorySeries =>
    trendOf(
      series(1, flat(2160)),
      series(
        2,
        BUCKET_KEYS.map((_, index) => (index === 5 ? 12000 : 0)),
      ),
    );
  const everyMonthGross = (): Map<string, SalaryMetadata> =>
    metadata(...BUCKET_KEYS.map((yearMonth) => ({ yearMonth, grossWage: 3000 })));

  it('drops a flagged category out of net, bringing June back to the regular rate', () => {
    const points = computeGrossNetRatio(withBonusCategory(), everyMonthGross(), new Set([2]));

    expect(points[5].net).toBe(2160);
    expect(points[5].ratio).toBe(0.72);
  });

  it('would otherwise report a rate well past 100% for that month', () => {
    // The negative control: unflagged, June's 14,160 against a 3,000 gross reads as 472%.
    const points = computeGrossNetRatio(withBonusCategory(), everyMonthGross());

    expect(points[5].ratio).toBeGreaterThan(1);
  });

  it('leaves every other month untouched', () => {
    const points = computeGrossNetRatio(withBonusCategory(), everyMonthGross(), new Set([2]));

    expect(points.filter((_, index) => index !== 5).every((point) => point.net === 2160)).toBe(
      true,
    );
  });

  it('reproduces the previous figures exactly for an empty exclusion set', () => {
    const withArgument = computeGrossNetRatio(withBonusCategory(), everyMonthGross(), new Set());
    const withoutArgument = computeGrossNetRatio(withBonusCategory(), everyMonthGross());

    expect(withArgument).toEqual(withoutArgument);
  });

  it('never excludes the uncategorised series, which has no id to flag', () => {
    const uncategorised: IncomeCategorySeries = {
      bucketKeys: BUCKET_KEYS,
      series: [{ ...series(2, flat(2160)), categoryId: null }],
    };

    const points = computeGrossNetRatio(
      uncategorised,
      metadata({ yearMonth: '2026-01', grossWage: 3000 }),
      new Set([2]),
    );

    expect(points[0].net).toBe(2160);
  });

  it('applies the category exclusion and the embedded bonus exactly once each, never twice', () => {
    // June: 2,160 salary + a 1,000 flagged-category deposit, of which the user also recorded 500 as
    // an embedded bonus against the *salary*. Correct net is 2,160 − 500 = 1,660.
    const values = flat(0);
    values[5] = 1000;

    const points = computeGrossNetRatio(
      trendOf(series(1, flat(2160)), series(2, values)),
      metadata({ yearMonth: '2026-06', grossWage: 3000, bonus: 500 }),
      new Set([2]),
    );

    expect(points[5].net).toBe(1660);
  });
});

describe('computeGrossNetRatio: raw series, never the smoothed one', () => {
  it('keeps a lump sum in the month it was actually deposited', () => {
    // A 12,000 bonus category paid once, in June, alongside a flat salary.
    const bonusValues = BUCKET_KEYS.map((_, index) => (index === 5 ? 12000 : 0));
    const raw = trendOf(series(1, flat(2000)), series(2, bonusValues));
    const gross = metadata(...BUCKET_KEYS.map((yearMonth) => ({ yearMonth, grossWage: 3000 })));

    const rawPoints = computeGrossNetRatio(raw, gross);

    expect(rawPoints[5].net).toBe(14000);
    expect(rawPoints[4].net).toBe(2000);
  });

  it('is what the smoothed series would have flattened away', () => {
    // The contrast the criterion asks for: passing FR-INC-4's output instead spreads the same
    // 12,000 across the year, so June looks like every other month and the real spike vanishes.
    const bonusValues = BUCKET_KEYS.map((_, index) => (index === 5 ? 12000 : 0));
    const raw = trendOf(series(1, flat(2000)), series(2, bonusValues));
    const smoothed = smoothAnnualLumpSums(raw, new Set([2]), 'month');
    const gross = metadata(...BUCKET_KEYS.map((yearMonth) => ({ yearMonth, grossWage: 3000 })));

    expect(computeGrossNetRatio(smoothed, gross)[5].net).toBe(3000);
    expect(computeGrossNetRatio(raw, gross)[5].net).toBe(14000);
  });

  it("leaves the counted-series filter's null branch untouched (TICKET-INC-20)", () => {
    // The embedded-bonus band carries `SMOOTHED_BONUS_CATEGORY_ID`, never `null` — which already
    // means "Uncategorised" to the filter below, and would therefore have made the band immune to
    // the FR-INC-4 exclusion every other series is subject to.
    const raw = trendOf(series(1, flat(2000)), series(2, flat(500)));
    const withBonus = metadata(
      ...BUCKET_KEYS.map((yearMonth) => ({
        yearMonth,
        grossWage: 3000,
        ...(yearMonth === '2026-06' ? { bonus: 1200 } : {}),
      })),
    );

    const smoothed = smoothEmbeddedBonuses(raw, withBonus, 'month');

    expect(smoothed.series.some((entry) => entry.categoryId === null)).toBe(false);
    expect(smoothed.series.at(-1)!.categoryId).toBe(SMOOTHED_BONUS_CATEGORY_ID);
    // Excluding a category still drops exactly that category, band present or not.
    expect(computeGrossNetRatio(smoothed, withBonus, new Set([2]))[0].net).toBe(
      computeGrossNetRatio(smoothed, withBonus)[0].net - 500,
    );
  });

  it('reads the raw series, so the bonus band never reaches the take-home figures', () => {
    const raw = trendOf(series(1, flat(2000)));
    const withBonus = metadata(
      ...BUCKET_KEYS.map((yearMonth) => ({
        yearMonth,
        grossWage: 3000,
        ...(yearMonth === '2026-06' ? { bonus: 1200 } : {}),
      })),
    );

    // The figures FR-INC-11 actually shows: June's real deposit in June, minus its recorded bonus.
    const points = computeGrossNetRatio(raw, withBonus);
    expect(points[5].net).toBe(800);
    expect(points[4].net).toBe(2000);
    // And the contrast that pins why: smoothing moves 1200 out of June, so passing the smoothed
    // trend here would compare a redistributed figure against a gross wage entered for one month.
    expect(
      computeGrossNetRatio(smoothEmbeddedBonuses(raw, withBonus, 'month'), withBonus)[5].net,
    ).not.toBe(800);
  });
});
