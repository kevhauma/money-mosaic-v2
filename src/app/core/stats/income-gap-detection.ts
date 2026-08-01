import type { Granularity } from '@/shared/utils';
import type { CategorySeriesEntry } from './category-composition-trend';
import type { IncomeCategorySeries } from './income-category-series';

export type IncomeGap = {
  categoryId: number;
  /** The last month this category actually paid anything. */
  lastSeenBucketKey: string;
  /** Complete months since `lastSeenBucketKey` with nothing at all. */
  monthsMissing: number;
};

/** Share of months a category must have paid in to count as "recurring" — below this it's irregular by nature, and one quiet month means nothing. */
const RECURRING_CADENCE = 0.75;

/** Months of the category's own history required before its cadence is worth believing. */
const MIN_HISTORY_MONTHS = 6;

/** Consecutive silent months that count as a gap rather than a late payment. */
const GAP_MONTHS = 2;

/**
 * Trailing months left out of the cadence calculation — otherwise the very silence being detected
 * would drag the cadence below the bar and hide itself.
 */
const CADENCE_EXCLUSION_MONTHS = 3;

/** The first bucket this category ever paid into — leading zeros are "before it existed", not a gap. */
const firstActiveIndex = (values: number[]): number => values.findIndex((value) => value !== 0);

const lastActiveIndex = (values: number[], throughIndex: number): number => {
  for (let index = throughIndex; index >= 0; index--) if (values[index] !== 0) return index;
  return -1;
};

const countNonZero = (values: number[], startIndex: number, endIndex: number): number => {
  let count = 0;
  for (let index = startIndex; index <= endIndex; index++) if (values[index] !== 0) count++;
  return count;
};

const detectForCategory = (
  { categoryId, values }: CategorySeriesEntry,
  bucketKeys: string[],
  throughIndex: number,
): IncomeGap | null => {
  if (categoryId === null) return null;

  const start = firstActiveIndex(values);
  if (start === -1 || throughIndex - start + 1 < MIN_HISTORY_MONTHS) return null;

  // Is it recurring? Measured over its own history minus the trailing exclusion window.
  const cadenceEnd = throughIndex - CADENCE_EXCLUSION_MONTHS;
  if (cadenceEnd < start) return null;
  const cadence = countNonZero(values, start, cadenceEnd) / (cadenceEnd - start + 1);
  if (cadence < RECURRING_CADENCE) return null;

  // Has it gone quiet? Every one of the most recent complete months must be empty.
  for (let index = throughIndex; index > throughIndex - GAP_MONTHS; index--) {
    if (index < 0 || values[index] !== 0) return null;
  }

  const lastSeen = lastActiveIndex(values, throughIndex);
  return {
    categoryId,
    lastSeenBucketKey: bucketKeys[lastSeen],
    monthsMissing: throughIndex - lastSeen,
  };
};

/**
 * Income categories that used to arrive like clockwork and have since gone quiet (FR-INC-9,
 * TICKET-INC-09) — a job change, an ended contract, a lapsed side income, surfaced instead of
 * silently thinning the growth trend.
 *
 * Expects the **raw** `computeIncomeCategorySeries()` output, never FR-INC-4's smoothed one:
 * smoothing spreads a real deposit across its year for display, which would paint a non-zero
 * amount over exactly the silence this looks for.
 *
 * `throughBucketKey` is the newest bucket whose data is final — `lastCompleteBucketKey()`'s answer.
 * Buckets after it are ignored entirely, because the current month is in progress: a salary paid on
 * the 25th is "missing" for the first three weeks of every month, and without this the warning
 * would fire every month and be worth nothing. Returns an empty result when that key isn't in the
 * series, and at any granularity other than `'month'` (cadence in weeks or quarters is a different
 * question with different constants).
 *
 * A category is judged only against its own history: at least 6 months of it, paying in at least
 * 75% of the months up to a 3-month trailing exclusion window — without that exclusion the silence
 * being detected would count against the cadence and hide itself.
 */
export const detectIncomeGaps = (
  trend: IncomeCategorySeries,
  granularity: Granularity,
  throughBucketKey: string | undefined,
): IncomeGap[] => {
  if (granularity !== 'month' || throughBucketKey === undefined) return [];
  const throughIndex = trend.bucketKeys.indexOf(throughBucketKey);
  if (throughIndex < GAP_MONTHS - 1) return [];

  return trend.series
    .map((entry) => detectForCategory(entry, trend.bucketKeys, throughIndex))
    .filter((gap): gap is IncomeGap => gap !== null);
};
