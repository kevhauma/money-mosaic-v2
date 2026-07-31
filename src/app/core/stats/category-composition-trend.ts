import type { Account, Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown, type CategoryBreakdown } from './category-breakdown';
import { bucketDateBoundaries, bucketKeysInRange, type Granularity } from '@/shared/utils';

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

export type CategoryBreakdownKind = 'expenseByCategory' | 'incomeBySource';

export type CategoryCompositionTrend = {
  bucketKeys: string[];
  expenseSeries: CategorySeriesEntry[];
  incomeSeries: CategorySeriesEntry[];
};

/**
 * One `computeCategoryBreakdown()` per gap-filled bucket in `[from, to]` — the shared, expensive
 * half of every per-bucket-per-category series in `core/stats/`. Reusing `computeCategoryBreakdown`
 * (rather than reimplementing the grouping) is what keeps these series from drifting from the app's
 * transfer/nullified/savings-movement/joint-ownership/signed-netting rules, since it routes every
 * transaction through `classifyForStats()`.
 */
export const computePerBucketBreakdowns = (
  bucketKeys: string[],
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  granularity: Granularity,
  ownSavingsIbans: ReadonlySet<string>,
  accountsById: ReadonlyMap<number, Account>,
): CategoryBreakdown[] =>
  bucketKeys.map((bucketKey) => {
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

/**
 * Projects an already-chosen list of category ids onto one gap-filled `CategorySeriesEntry` each,
 * in the order given — a bucket with no activity in that category contributes 0 rather than a hole,
 * so every series has exactly one value per bucket. Which ids get a series is the caller's
 * decision (`computeCategoryCompositionTrend` ranks them and caps at top-N;
 * `computeIncomeCategorySeries` takes the user's FR-INC-3 selection uncapped), and it's the only
 * thing those two callers differ on.
 */
export const buildCategorySeries = (
  kind: CategoryBreakdownKind,
  categoryIds: (number | null)[],
  perBucketBreakdowns: CategoryBreakdown[],
  categoriesById: Map<number, Category>,
): CategorySeriesEntry[] =>
  categoryIds.map((categoryId) => {
    const category = categoryId != null ? categoriesById.get(categoryId) : undefined;

    return {
      categoryId,
      name: categoryId != null ? (category?.name ?? 'Unknown') : UNCATEGORISED_NAME,
      color: categoryId != null ? (category?.color ?? UNCATEGORISED_COLOR) : UNCATEGORISED_COLOR,
      values: perBucketBreakdowns.map(
        (breakdown) => breakdown[kind].find((entry) => entry.categoryId === categoryId)?.total ?? 0,
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
  const perBucketBreakdowns = computePerBucketBreakdowns(
    bucketKeys,
    transactions,
    categoriesById,
    granularity,
    ownSavingsIbans,
    accountsById,
  );

  const topCategoryIds = (kind: CategoryBreakdownKind): (number | null)[] =>
    wholeRangeBreakdown[kind].slice(0, TOP_CATEGORY_COUNT).map((entry) => entry.categoryId);

  return {
    bucketKeys,
    expenseSeries: buildCategorySeries(
      'expenseByCategory',
      topCategoryIds('expenseByCategory'),
      perBucketBreakdowns,
      categoriesById,
    ),
    incomeSeries: buildCategorySeries(
      'incomeBySource',
      topCategoryIds('incomeBySource'),
      perBucketBreakdowns,
      categoriesById,
    ),
  };
};
