import type { SalaryMetadata } from '@/core/data-access';
import type { Granularity } from '@/shared/utils';
import type { IncomeCategorySeries } from './income-category-series';

/** A bucket key's calendar year — at `'month'` granularity every key is `YYYY-MM`. */
const yearOf = (bucketKey: string): string => bucketKey.slice(0, 4);

/**
 * How much of each bucket's income the user has declared to be an embedded bonus, capped at what
 * that bucket actually received. The cap is reachable in practice, not defensive padding: the bonus
 * is entered against the whole deposit, but the series only counts the categories selected under
 * FR-INC-3, so deselecting the salary category leaves a month whose counted income is smaller than
 * the bonus recorded against it (see the ticket's Notes).
 */
const removableBonuses = (
  bucketKeys: string[],
  bucketTotals: number[],
  salaryMetadataByMonth: ReadonlyMap<string, SalaryMetadata>,
): number[] =>
  bucketKeys.map((bucketKey, index) =>
    Math.min(salaryMetadataByMonth.get(bucketKey)?.bonus ?? 0, bucketTotals[index]),
  );

const bucketsPerYearOf = (bucketKeys: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const bucketKey of bucketKeys) {
    const year = yearOf(bucketKey);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return counts;
};

/**
 * One series' values with each bucket's declared bonus taken off *pro rata* — by this series' share
 * of that bucket's total — and each year's removed total handed straight back to this same series,
 * spread evenly over that year's buckets. Per series rather than pooled and re-split, so a series'
 * annual total comes out exactly as it went in.
 */
const reshapeSeries = (
  values: number[],
  bucketKeys: string[],
  bonuses: number[],
  bucketTotals: number[],
  bucketsPerYear: ReadonlyMap<string, number>,
): number[] => {
  const removedPerYear = new Map<string, number>();
  const stripped = values.map((value, index) => {
    // A zero-total bucket has a zero bonus by the cap in `removableBonuses`, so this never
    // divides by zero.
    const removed = bonuses[index] === 0 ? 0 : (bonuses[index] * value) / bucketTotals[index];
    const year = yearOf(bucketKeys[index]);
    removedPerYear.set(year, (removedPerYear.get(year) ?? 0) + removed);
    return value - removed;
  });

  return stripped.map((value, index) => {
    const year = yearOf(bucketKeys[index]);
    return value + (removedPerYear.get(year) ?? 0) / bucketsPerYear.get(year)!;
  });
};

/**
 * Spreads bonuses recorded *inside* a salary deposit across their year (TICKET-INC-13), the
 * complement of `smoothAnnualLumpSums`: that one flattens a bonus that has its own category, this
 * one a bonus baked into the regular deposit, where there is no category id to flag and the
 * `SalaryMetadata.bonus` figure (FR-INC-10) is the only record that part of the month wasn't wage.
 *
 * Two passes, both per calendar year:
 * - **Removal** — each bucket's declared bonus comes off *pro rata* across the series that were
 *   non-zero there, by their share of that bucket's total. One income category is the overwhelmingly
 *   common case, where this is just "take it off the salary line"; pro rata keeps it well-defined
 *   when it isn't, without guessing which category the deposit landed in.
 * - **Redistribution** — each series gets its own removed total back, spread evenly over that year's
 *   buckets. Per series rather than pooled and re-split, so a series' *annual* total is preserved
 *   exactly and only its month-to-month shape changes.
 *
 * Even redistribution across all of the year's buckets (not just the ones after the deposit) matches
 * `smoothAnnualLumpSums` exactly — a user comparing the two mechanisms shouldn't find they smooth
 * differently.
 *
 * **Monthly granularity only**, and a documented pass-through otherwise: `salaryMetadata` is keyed
 * `YYYY-MM`, so any other bucket size has nothing to join on. Query-time like FR-INC-4 — no recorded
 * bonus is ever written back onto a transaction, so editing or clearing one re-shapes the chart
 * immediately. Entering the figure *is* the opt-in; there is no separate setting.
 */
export const smoothEmbeddedBonuses = (
  trend: IncomeCategorySeries,
  salaryMetadataByMonth: ReadonlyMap<string, SalaryMetadata>,
  granularity: Granularity,
): IncomeCategorySeries => {
  if (granularity !== 'month') return trend;

  const { bucketKeys, series } = trend;
  const bucketTotals = bucketKeys.map((_, index) =>
    series.reduce((total, entry) => total + entry.values[index], 0),
  );
  const bonuses = removableBonuses(bucketKeys, bucketTotals, salaryMetadataByMonth);
  if (bonuses.every((bonus) => bonus === 0)) return trend;

  const bucketsPerYear = bucketsPerYearOf(bucketKeys);
  return {
    bucketKeys,
    series: series.map((entry) => ({
      ...entry,
      values: reshapeSeries(entry.values, bucketKeys, bonuses, bucketTotals, bucketsPerYear),
    })),
  };
};
