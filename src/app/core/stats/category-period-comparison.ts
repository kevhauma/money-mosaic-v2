import type { Account, Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown } from './category-breakdown';
import type { ComparisonWindowPeriod } from './period-window';

const UNCATEGORISED_NAME = 'Uncategorised';
const UNCATEGORISED_COLOR = '#9ca3af';
const TOP_CATEGORY_COUNT = 4;
/** Below this many window periods with any transaction activity, there's nothing meaningful to compare. */
const MIN_PERIODS_WITH_DATA = 2;

export type CategoryPeriodComparisonEntry = {
  categoryId: number | null;
  name: string;
  color: string;
  /** One total per window period, in window order (0 for a period with no activity in this category — including periods with no activity at all, kept for chart-axis continuity). */
  perPeriod: number[];
  average: number;
  highest: number;
  lowest: number;
  selectedTotal: number;
  /** % delta of `selectedTotal` vs. `average`; `null` when `average` is exactly zero. */
  deltaVsAveragePct: number | null;
};

export type CategoryPeriodComparison = {
  window: ComparisonWindowPeriod[];
  entries: CategoryPeriodComparisonEntry[];
  biggestIncreaseCategoryId: number | null;
  biggestDecreaseCategoryId: number | null;
  hasEnoughData: boolean;
};

const percentDelta = (current: number, base: number): number | null =>
  base === 0 ? null : (current - base) / Math.abs(base);

/**
 * Top expense categories for the *selected* window period, compared across every period in
 * `window` (FR-STAT-8/TICKET-STAT-04). The categories are chosen from the selected period alone
 * (not the window average) so the set shown doesn't shift just because a neighbouring period
 * happened to spend more elsewhere. `computeCategoryBreakdown()` is reused once per window period
 * — never reimplemented — so this can't disagree with the dashboard's own category totals.
 *
 * `excludedCategoryIds` (optional, user-configurable — TICKET-STAT-04 follow-up) removes those
 * categories from consideration *before* picking the top `TOP_CATEGORY_COUNT`, so an excluded
 * category never displaces one the user actually wants to compare. The uncategorised bucket
 * (`categoryId === null`) can't be excluded this way — it isn't a real, user-selectable category.
 *
 * A window period counts towards `average`/`highest`/`lowest` only when it has *any* transaction
 * activity at all (its breakdown is non-empty) — a period before the account existed contributes
 * nothing rather than a misleading `0`, while a period with activity but zero spend in this
 * category still counts as a genuine `0`. `hasEnoughData` folds in the "fewer than 2 periods with
 * data" empty-state rule so the UI never has to re-derive it.
 */
export const computeCategoryPeriodComparison = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  window: ComparisonWindowPeriod[],
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
  excludedCategoryIds: ReadonlySet<number> = new Set(),
): CategoryPeriodComparison => {
  const selectedPeriod = window.find((period) => period.isSelected) ?? window[window.length - 1];
  const selectedIndex = window.indexOf(selectedPeriod);

  const selectedBreakdown = computeCategoryBreakdown(
    transactions,
    categoriesById,
    selectedPeriod.from,
    selectedPeriod.to,
    ownSavingsIbans,
    accountsById,
  );
  const topCategoryIds = selectedBreakdown.expenseByCategory
    .filter((entry) => entry.categoryId == null || !excludedCategoryIds.has(entry.categoryId))
    .slice(0, TOP_CATEGORY_COUNT)
    .map((entry) => entry.categoryId);

  const periodBreakdowns = window.map((period) =>
    computeCategoryBreakdown(
      transactions,
      categoriesById,
      period.from,
      period.to,
      ownSavingsIbans,
      accountsById,
    ),
  );
  const periodHasData = periodBreakdowns.map(
    (breakdown) => breakdown.expenseByCategory.length > 0 || breakdown.incomeBySource.length > 0,
  );
  const periodsWithData = periodHasData.filter(Boolean).length;

  const entries: CategoryPeriodComparisonEntry[] = topCategoryIds.map((categoryId) => {
    const category = categoryId != null ? categoriesById.get(categoryId) : undefined;

    const perPeriod = periodBreakdowns.map(
      (breakdown) =>
        breakdown.expenseByCategory.find((entry) => entry.categoryId === categoryId)?.total ?? 0,
    );
    const totalsWithData = perPeriod.filter((_, index) => periodHasData[index]);

    const average =
      totalsWithData.length > 0
        ? totalsWithData.reduce((sum, total) => sum + total, 0) / totalsWithData.length
        : 0;
    const highest = totalsWithData.length > 0 ? Math.max(...totalsWithData) : 0;
    const lowest = totalsWithData.length > 0 ? Math.min(...totalsWithData) : 0;
    const selectedTotal = perPeriod[selectedIndex] ?? 0;

    return {
      categoryId,
      name: categoryId != null ? (category?.name ?? 'Unknown') : UNCATEGORISED_NAME,
      color: categoryId != null ? (category?.color ?? UNCATEGORISED_COLOR) : UNCATEGORISED_COLOR,
      perPeriod,
      average,
      highest,
      lowest,
      selectedTotal,
      deltaVsAveragePct: percentDelta(selectedTotal, average),
    };
  });

  const entriesWithDelta = entries.filter(
    (entry): entry is CategoryPeriodComparisonEntry & { deltaVsAveragePct: number } =>
      entry.deltaVsAveragePct != null,
  );
  const biggestIncreaseCategoryId =
    entriesWithDelta.length > 0
      ? entriesWithDelta.reduce((max, entry) =>
          entry.deltaVsAveragePct > max.deltaVsAveragePct ? entry : max,
        ).categoryId
      : null;
  const biggestDecreaseCategoryId =
    entriesWithDelta.length > 0
      ? entriesWithDelta.reduce((min, entry) =>
          entry.deltaVsAveragePct < min.deltaVsAveragePct ? entry : min,
        ).categoryId
      : null;

  return {
    window,
    entries,
    biggestIncreaseCategoryId,
    biggestDecreaseCategoryId,
    hasEnoughData: periodsWithData >= MIN_PERIODS_WITH_DATA,
  };
};
