import type { Account, Transaction } from '@/core/data-access';
import { bucketDateBoundaries, bucketKeysInRange, type Granularity } from '@/shared/utils';

export type AccountBalancePoint = {
  bucketKey: string;
  bucketEnd: string;
  balance: number;
};

/**
 * One account's real bank balance as of each bucket's end date, across [from, to] (FR-ACC-3) —
 * `openingBalance + Σ amount`, i.e. `AccountsStore.balancesById` extended over time.
 *
 * Deliberately *not* net worth (TICKET-ACC-07): it takes no `JointLegContext` and never calls
 * `resolveContribution`, so a joint account's `ownershipShare`, a `neutral`-category partner
 * inflow, a `nullified` flag and a manual `attributionOverride` are all irrelevant here. Those
 * reweight what an account contributes to *net worth* — the Dashboard's concept, still served by
 * `computeNetWorthTrend` — never what the bank actually holds. `transactions` may be the full
 * universe; legs on other accounts are ignored.
 *
 * Single O(n log n) pass: sort this account's transactions once (balance is cumulative from account
 * inception, so pre-filtering to [from, to] would drop history), then walk a running total forward,
 * snapshotting it whenever the running date crosses a bucket boundary — avoids re-summing history
 * per bucket.
 */
export const computeAccountBalanceHistory = (
  transactions: Transaction[],
  account: Account,
  from: string,
  to: string,
  granularity: Granularity,
): AccountBalancePoint[] => {
  const sorted = transactions
    .filter((transaction) => transaction.accountId === account.id)
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));

  let runningTotal = account.openingBalance;
  let index = 0;

  return bucketKeysInRange(from, to, granularity).map((bucketKey) => {
    const { end } = bucketDateBoundaries(bucketKey, granularity);

    while (index < sorted.length && sorted[index].bookingDate <= end) {
      runningTotal += sorted[index].amount;
      index++;
    }

    return { bucketKey, bucketEnd: end, balance: runningTotal };
  });
};
