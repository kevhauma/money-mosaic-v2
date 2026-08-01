import type { Granularity } from '@/shared/utils';
import type { CategorySeriesEntry } from './category-composition-trend';
import type { IncomeCategorySeries } from './income-category-series';

/** A bucket key's calendar year — `'2026-07'`, `'2026-07-15'` and `'2026'` all start with `YYYY`. */
const yearOf = (bucketKey: string): string => bucketKey.slice(0, 4);

/**
 * One category's values with each year's total spread evenly across that year's buckets. Every
 * bucket of a year gets `yearTotal / bucketsInThatYear`, so the year's sum is preserved exactly
 * (bar floating-point rounding) while the shape inside it goes flat.
 *
 * A year the range only partly covers is spread across the buckets it *does* have, not across a
 * notional twelve — the alternative would invent income for months outside the range and make the
 * chart's visible total disagree with the yearly view's.
 */
const spreadYearsEvenly = (values: number[], bucketKeys: string[]): number[] => {
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  bucketKeys.forEach((bucketKey, index) => {
    const year = yearOf(bucketKey);
    totals.set(year, (totals.get(year) ?? 0) + values[index]);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  });

  return bucketKeys.map((bucketKey) => {
    const year = yearOf(bucketKey);
    return totals.get(year)! / counts.get(year)!;
  });
};

/**
 * Flattens the annual lump-sum categories in an income series (FR-INC-4, TICKET-INC-04): a 13th
 * month, vacation pay or a holiday bonus is real income the user earned all year, but it lands in
 * one deposit — so left raw it draws a spike on the by-category trend, a false spurt in the
 * growth-rate panel, and a phantom raise in step-change detection.
 *
 * Applied at **query time** over `computeIncomeCategorySeries()`'s output rather than written back
 * to transactions, so the setting stays freely toggleable and no real amount is ever mutated. The
 * consequence is that marking a category smooths its *whole* history retroactively — documented
 * behaviour (see the ticket), since the flag is a fact about the category, not about one deposit.
 *
 * **Monthly granularity only.** "One big bucket versus twelve small ones" is the problem this
 * solves; at `'year'` granularity there is nothing to spread, and at `'day'`/`'week'`/`'quarter'`
 * the page doesn't render an income trend at all (`INCOME_GRANULARITY` is fixed to `'month'`).
 * Every other granularity is a documented pass-through — the input object is returned as-is.
 *
 * Categories not in `smoothedCategoryIds` are passed through by reference, not copied: an unflagged
 * category's `values` array is the very same array the caller handed in.
 */
export const smoothAnnualLumpSums = (
  trend: IncomeCategorySeries,
  smoothedCategoryIds: ReadonlySet<number>,
  granularity: Granularity,
): IncomeCategorySeries => {
  if (granularity !== 'month' || smoothedCategoryIds.size === 0) return trend;

  const { bucketKeys, series } = trend;
  return {
    bucketKeys,
    series: series.map((entry: CategorySeriesEntry) =>
      entry.categoryId !== null && smoothedCategoryIds.has(entry.categoryId)
        ? { ...entry, values: spreadYearsEvenly(entry.values, bucketKeys) }
        : entry,
    ),
  };
};
