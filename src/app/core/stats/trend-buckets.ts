import type { Transaction } from '@/core/data-access';
import {
  bucketDateBoundaries,
  bucketKeyForDate,
  bucketKeysInRange,
  type Granularity,
} from './date-buckets';

export type TrendBucket = {
  bucketKey: string;
  bucketStart: string;
  bucketEnd: string;
  income: number;
  expense: number;
  net: number;
};

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

/**
 * Income/expense/net per bucket across [from, to] (FR-STAT-4). Groups every in-range,
 * transfer-excluded transaction into its bucket in a single O(n) pass, then maps the
 * gap-filled bucket-key list over that grouping so empty buckets render as zero rather
 * than being skipped — the shared pass NFR-PERF-1 asks for, rather than one filter per bucket.
 */
export const computeTrendBuckets = (
  transactions: Transaction[],
  from: string,
  to: string,
  granularity: Granularity,
): TrendBucket[] => {
  const totalsByBucketKey = new Map<string, { income: number; expense: number }>();

  for (const transaction of transactions) {
    if (transaction.transferId != null) continue;
    if (!inRange(transaction, from, to)) continue;

    const key = bucketKeyForDate(transaction.bookingDate, granularity);
    const existing = totalsByBucketKey.get(key) ?? { income: 0, expense: 0 };
    if (transaction.amount > 0) {
      existing.income += transaction.amount;
    } else if (transaction.amount < 0) {
      existing.expense += -transaction.amount;
    }
    totalsByBucketKey.set(key, existing);
  }

  return bucketKeysInRange(from, to, granularity).map((bucketKey) => {
    const { start, end } = bucketDateBoundaries(bucketKey, granularity);
    const totals = totalsByBucketKey.get(bucketKey) ?? { income: 0, expense: 0 };
    return {
      bucketKey,
      bucketStart: start,
      bucketEnd: end,
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense,
    };
  });
};
