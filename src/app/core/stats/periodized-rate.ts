import { bucketKeysInRange } from '@/shared/utils';

export type PeriodizedRate = {
  avgPerDay: number;
  avgPerWeek: number | null;
  avgPerMonth: number | null;
};

/** A unit only earns a place in the result once the range spans at least this many of its buckets — averaging a single bucket just restates the total. */
const MIN_BUCKETS_FOR_AVERAGE = 2;

/**
 * Normalises any period figure (income/expense/savings/...) into an average per day/week/month, so
 * ranges of different lengths become comparable (FR-STAT-9, TICKET-STAT-21). Generic over the figure
 * so income/expense/savings sub-labels all share one bucket-counting implementation instead of each
 * deriving their own. Reuses `bucketKeysInRange` (already gap-fill-aware) to count the buckets
 * touched by the range rather than re-deriving day/week/month arithmetic. `avgPerWeek`/`avgPerMonth`
 * are `null` when the range doesn't span at least 2 buckets of that granularity; `avgPerDay` always
 * reports since day is the finest granularity and effectively always applicable.
 */
export const computePeriodizedRate = (figure: number, from: string, to: string): PeriodizedRate => {
  const dayCount = bucketKeysInRange(from, to, 'day').length;
  const weekCount = bucketKeysInRange(from, to, 'week').length;
  const monthCount = bucketKeysInRange(from, to, 'month').length;

  return {
    avgPerDay: figure / dayCount,
    avgPerWeek: weekCount >= MIN_BUCKETS_FOR_AVERAGE ? figure / weekCount : null,
    avgPerMonth: monthCount >= MIN_BUCKETS_FOR_AVERAGE ? figure / monthCount : null,
  };
};
