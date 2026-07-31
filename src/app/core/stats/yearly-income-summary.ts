import type { Account, Category, Transaction } from '@/core/data-access';
import { computePerBucketBreakdowns } from './category-composition-trend';
import { bucketKeysInRange } from '@/shared/utils';

export type YearlyIncomeEntry = {
  /** Calendar year as a bucket key, `YYYY` (`bucketKeyForDate`'s `'year'` format). */
  year: string;
  total: number;
  /** Fractional change vs. the preceding entry (0.08 = +8%); `null` for the first year in the series or when the prior year's total is exactly zero. */
  pctVsPriorYear: number | null;
};

/** `null` rather than `±∞%` when there's nothing to divide by — same guard as `year-over-year.ts`'s `percentDelta`. */
const percentVsPrior = (total: number, priorTotal: number | undefined): number | null =>
  priorTotal === undefined || priorTotal === 0 ? null : (total - priorTotal) / Math.abs(priorTotal);

/**
 * One entry per calendar year in `[from, to]` with its %-change vs. the year before (FR-INC-6,
 * TICKET-INC-06) — the yearly counterpart of `computeIncomeCategorySeries`'s monthly view, and the
 * per-year output TICKET-INC-07's multi-year comparison builds on.
 *
 * Deliberately **range-independent** in intent: callers pass `computeFullHistoryRange`'s span, not
 * the topbar range, so the yearly trend always covers the user's whole history (the same
 * "full history, ignore the topbar" shape as `balance-trend-signals.ts`). That's the caller's
 * range, not a rule enforced here.
 *
 * Years come back ascending and gap-filled via `bucketKeysInRange(from, to, 'year')`, so a year
 * with no selected-category income renders as a zero bar rather than vanishing from the axis.
 * Per-transaction inclusion is delegated to `computePerBucketBreakdowns` (and through it
 * `computeCategoryBreakdown`/`classifyForStats`), so transfers, nullified rows, savings movements,
 * joint-leg attribution and signed netting can't drift from the rest of the app.
 *
 * Totals are **raw**, not smoothed: FR-INC-4's annual-lump-sum smoothing redistributes a lump sum
 * *within* a year, which by definition changes nothing once the bucket is the whole year.
 */
export const computeYearlyIncomeSummary = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  selectedCategoryIds: ReadonlySet<number>,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): YearlyIncomeEntry[] => {
  const years = bucketKeysInRange(from, to, 'year');
  const perYearBreakdowns = computePerBucketBreakdowns(
    years,
    transactions,
    categoriesById,
    'year',
    ownSavingsIbans,
    accountsById,
  );

  const totals = perYearBreakdowns.map((breakdown) =>
    breakdown.incomeBySource
      .filter((entry) => entry.categoryId != null && selectedCategoryIds.has(entry.categoryId))
      .reduce((sum, entry) => sum + entry.total, 0),
  );

  return years.map((year, index) => ({
    year,
    total: totals[index],
    pctVsPriorYear: percentVsPrior(totals[index], totals[index - 1]),
  }));
};
