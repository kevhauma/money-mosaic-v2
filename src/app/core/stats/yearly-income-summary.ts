import type { Account, Category, Transaction } from '@/core/data-access';
import { computePerBucketBreakdowns } from './category-composition-trend';
import { bucketDateBoundaries, bucketKeysInRange } from '@/shared/utils';

export type YearlyIncomeEntry = {
  /** Calendar year as a bucket key, `YYYY` (`bucketKeyForDate`'s `'year'` format). */
  year: string;
  total: number;
  /** True when `[from, to]` doesn't span the whole calendar year — the in-progress current year, and a first year the history starts partway into. Its `total` is a real but incomplete figure. */
  isPartialYear: boolean;
  /** Fractional change vs. the preceding entry (0.08 = +8%); `null` whenever the comparison would mislead — see `percentVsPrior`. */
  pctVsPriorYear: number | null;
};

type YearTotal = { total: number; isPartialYear: boolean };

/**
 * A year the data only half-covers is a smaller number for a reason that has nothing to do with
 * income, so neither side of the comparison may be partial: an in-progress year against a full one
 * reads as a collapse every year until December, and the year *after* a partial first year reads as
 * a surge. Both are artefacts of where the history starts and ends.
 */
const bothYearsComplete = (year: YearTotal, prior: YearTotal): boolean =>
  !year.isPartialYear && !prior.isPartialYear;

/** `null` rather than a misleading number — no prior year to compare against (`year-over-year.ts`'s `percentDelta` guard), a zero prior total that would read as `±∞%`, or a partial year on either side (see `bothYearsComplete`). */
const percentVsPrior = (year: YearTotal, prior: YearTotal | undefined): number | null =>
  prior === undefined || prior.total === 0 || !bothYearsComplete(year, prior)
    ? null
    : (year.total - prior.total) / Math.abs(prior.total);

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
 *
 * The first and last years of a history are usually only partly covered by `[from, to]`; those are
 * flagged `isPartialYear` and take no percentage (see `percentVsPrior`). Their `total` is still
 * reported — an incomplete year is real data worth a bar, it just isn't comparable to a full one.
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

  const totals: YearTotal[] = years.map((year, index) => {
    const { start, end } = bucketDateBoundaries(year, 'year');
    return {
      total: perYearBreakdowns[index].incomeBySource
        .filter((entry) => entry.categoryId != null && selectedCategoryIds.has(entry.categoryId))
        .reduce((sum, entry) => sum + entry.total, 0),
      isPartialYear: from > start || to < end,
    };
  });

  return years.map((year, index) => ({
    year,
    ...totals[index],
    pctVsPriorYear: percentVsPrior(totals[index], totals[index - 1]),
  }));
};
