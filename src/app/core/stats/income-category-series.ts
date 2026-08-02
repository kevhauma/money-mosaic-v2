import type { Account, Category, Transaction } from '@/core/data-access';
import {
  buildCategorySeries,
  computePerBucketBreakdowns,
  type CategorySeriesEntry,
} from './category-composition-trend';
import { bucketKeysInRange, type Granularity } from '@/shared/utils';

export type IncomeCategorySeries = {
  bucketKeys: string[];
  series: CategorySeriesEntry[];
};

/**
 * Per-bucket totals for each income category the user counts toward growth (FR-INC-2,
 * TICKET-INC-02) — the raw, unsmoothed base series every later FR-INC ticket builds on
 * (FR-INC-04's annual-lump-sum smoothing wraps this output rather than replacing it).
 *
 * Shares `computePerBucketBreakdowns`/`buildCategorySeries` with the dashboard's
 * `computeCategoryCompositionTrend()` — so per-transaction behaviour can't drift between the two
 * pages — and differs from it on exactly two axes, both of which are the caller's choice of
 * category ids rather than different logic:
 * - **No top-N cap.** Every selected income category gets its own series; the dashboard caps at
 *   the top 5 because it's a summary, whereas this page is *about* income by source.
 * - **Selection-parameterised** (`selectedCategoryIds`, FR-INC-3) instead of ranked by size, so a
 *   category the user has excluded contributes nothing anywhere on the page.
 *
 * The caller is also expected to pass a full-history `[from, to]` (`computeFullHistoryRange`) and
 * let the page's range drive the chart's zoom window instead, so scrolling out never hits missing
 * data — but that's the caller's range, not a rule enforced here.
 *
 * Series come back in `selectedCategoryIds` order; an id with no matching `Category` still gets a
 * zero-filled series (named `'Unknown'`) rather than silently disappearing.
 */
export const computeIncomeCategorySeries = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  selectedCategoryIds: ReadonlySet<number>,
  from: string,
  to: string,
  granularity: Granularity,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): IncomeCategorySeries => {
  const bucketKeys = bucketKeysInRange(from, to, granularity);
  const perBucketBreakdowns = computePerBucketBreakdowns(
    bucketKeys,
    transactions,
    categoriesById,
    granularity,
    ownSavingsIbans,
    accountsById,
  );

  return {
    bucketKeys,
    series: buildCategorySeries(
      'incomeBySource',
      [...selectedCategoryIds],
      perBucketBreakdowns,
      categoriesById,
    ),
  };
};
