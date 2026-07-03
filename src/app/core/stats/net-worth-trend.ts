import type { Account, Transaction } from '@/core/data-access';
import { bucketDateBoundaries, bucketKeysInRange, type Granularity } from './date-buckets';

export type NetWorthPoint = {
  bucketKey: string;
  bucketEnd: string;
  netWorth: number;
};

/**
 * Combined account balance as of each bucket's end date, across [from, to] (FR-STAT-4).
 * Single O(n log n) pass: sort all transactions once (not just those in-range, since net
 * worth is cumulative from account inception), then walk a running total forward, snapshotting
 * it whenever the running date crosses a bucket boundary — avoids re-summing history per bucket.
 */
export const computeNetWorthTrend = (
  transactions: Transaction[],
  accounts: Account[],
  from: string,
  to: string,
  granularity: Granularity,
): NetWorthPoint[] => {
  const sorted = [...transactions].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));

  let runningTotal = accounts.reduce((sum, account) => sum + account.openingBalance, 0);
  let index = 0;

  return bucketKeysInRange(from, to, granularity).map((bucketKey) => {
    const { end } = bucketDateBoundaries(bucketKey, granularity);

    while (index < sorted.length && sorted[index].bookingDate <= end) {
      runningTotal += sorted[index].amount;
      index++;
    }

    return { bucketKey, bucketEnd: end, netWorth: runningTotal };
  });
};
