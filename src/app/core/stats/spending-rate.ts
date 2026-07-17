import type { Account, Category, Transaction } from '@/core/data-access';
import { bucketKeysInRange } from '@/shared/utils';
import { computePeriodStats } from './period-stats';

export type SpendingRate = {
  avgPerDay: number;
  avgPerWeek: number | null;
  avgPerMonth: number | null;
};

/** A unit only earns a place in the result once the range spans at least this many of its buckets — averaging a single bucket just restates the total. */
const MIN_BUCKETS_FOR_AVERAGE = 2;

/**
 * Normalised spending rate for `[from, to]` — average expense per day/week/month, so ranges of
 * different lengths become comparable (FR-STAT-9). Reuses `computePeriodStats().expense` so the
 * "spending" figure here can never diverge from the dashboard's headline Expense stat, and reuses
 * `bucketKeysInRange` (already gap-fill-aware) to count the buckets touched by the range rather
 * than re-deriving day/week/month arithmetic. `avgPerWeek`/`avgPerMonth` are `null` when the range
 * doesn't span at least 2 buckets of that granularity; `avgPerDay` always reports since day is the
 * finest granularity and effectively always applicable.
 */
export const computeSpendingRate = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  categoriesById: ReadonlyMap<number, Category> = new Map(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): SpendingRate => {
  const { expense } = computePeriodStats(
    transactions,
    from,
    to,
    ownSavingsIbans,
    categoriesById,
    accountsById,
  );

  const dayCount = bucketKeysInRange(from, to, 'day').length;
  const weekCount = bucketKeysInRange(from, to, 'week').length;
  const monthCount = bucketKeysInRange(from, to, 'month').length;

  return {
    avgPerDay: expense / dayCount,
    avgPerWeek: weekCount >= MIN_BUCKETS_FOR_AVERAGE ? expense / weekCount : null,
    avgPerMonth: monthCount >= MIN_BUCKETS_FOR_AVERAGE ? expense / monthCount : null,
  };
};
