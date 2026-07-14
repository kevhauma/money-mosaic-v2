import type { Account, Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown, type CategoryBreakdown } from './category-breakdown';
import { bucketDateBoundaries, bucketKeysInRange, type Granularity } from './date-buckets';

const UNCATEGORISED_NAME = 'Uncategorised';
const UNCATEGORISED_COLOR = '#9ca3af';
const TOP_CATEGORY_COUNT = 5;

export type CategorySeriesEntry = {
  categoryId: number | null;
  name: string;
  color: string;
  /** One total per bucket, in `bucketKeys` order (0 for a bucket with no activity in this category). */
  values: number[];
};

export type CategoryCompositionTrend = {
  bucketKeys: string[];
  expenseSeries: CategorySeriesEntry[];
  incomeSeries: CategorySeriesEntry[];
};

const buildSeries = (
  kind: 'expenseByCategory' | 'incomeBySource',
  wholeRangeBreakdown: CategoryBreakdown,
  perBucketBreakdowns: CategoryBreakdown[],
  categoriesById: Map<number, Category>,
): CategorySeriesEntry[] =>
  wholeRangeBreakdown[kind].slice(0, TOP_CATEGORY_COUNT).map((topEntry) => {
    const category =
      topEntry.categoryId != null ? categoriesById.get(topEntry.categoryId) : undefined;

    return {
      categoryId: topEntry.categoryId,
      name: topEntry.categoryId != null ? (category?.name ?? 'Unknown') : UNCATEGORISED_NAME,
      color:
        topEntry.categoryId != null
          ? (category?.color ?? UNCATEGORISED_COLOR)
          : UNCATEGORISED_COLOR,
      values: perBucketBreakdowns.map(
        (breakdown) =>
          breakdown[kind].find((entry) => entry.categoryId === topEntry.categoryId)?.total ?? 0,
      ),
    };
  });

/**
 * Per-bucket, per-category income/expense composition for the trend chart (TICKET-STAT-17,
 * FR-STAT-14). Top-N categories (expense and income independently) are selected once from a
 * single whole-range `computeCategoryBreakdown()` call, so the same set of categories/colours
 * stays stable across every bucket even when their rank order shifts bucket-to-bucket — a
 * category outside the top-N never appears in any bucket's series, no "Other" catch-all
 * (matches `category-period-comparison.ts`'s existing top-N convention). `computeCategoryBreakdown()`
 * is reused once per bucket (via `bucketKeysInRange`/`bucketDateBoundaries`) — never
 * reimplemented — so this can't drift from the app's transfer/nullified/savings-movement/joint-
 * ownership/signed-netting rules.
 */
export const computeCategoryCompositionTrend = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  from: string,
  to: string,
  granularity: Granularity,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): CategoryCompositionTrend => {
  const wholeRangeBreakdown = computeCategoryBreakdown(
    transactions,
    categoriesById,
    from,
    to,
    ownSavingsIbans,
    accountsById,
  );

  const bucketKeys = bucketKeysInRange(from, to, granularity);
  const perBucketBreakdowns = bucketKeys.map((bucketKey) => {
    const { start, end } = bucketDateBoundaries(bucketKey, granularity);
    return computeCategoryBreakdown(
      transactions,
      categoriesById,
      start,
      end,
      ownSavingsIbans,
      accountsById,
    );
  });

  return {
    bucketKeys,
    expenseSeries: buildSeries(
      'expenseByCategory',
      wholeRangeBreakdown,
      perBucketBreakdowns,
      categoriesById,
    ),
    incomeSeries: buildSeries(
      'incomeBySource',
      wholeRangeBreakdown,
      perBucketBreakdowns,
      categoriesById,
    ),
  };
};
