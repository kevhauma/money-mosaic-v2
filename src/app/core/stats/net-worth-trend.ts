import type { Account, Transaction } from '@/core/data-access';
import { bucketDateBoundaries, bucketKeysInRange, type Granularity } from './date-buckets';
import { classifyJointLeg, jointLegStakeDelta, type JointLegContext } from './classify-joint-leg';

export type NetWorthPoint = {
  bucketKey: string;
  bucketEnd: string;
  netWorth: number;
};

const emptyJointLegContext: JointLegContext = {
  transactionsById: new Map(),
  accountsById: new Map(),
  transfersById: new Map(),
  categoriesById: new Map(),
};

/**
 * Combined account balance as of each bucket's end date, across [from, to] (FR-STAT-4). A joint
 * account contributes only my stake (not its full balance), weighted via `classifyJointLeg`/
 * `jointLegStakeDelta` the same way as `AccountsStore.netWorth`, so the trend's last point agrees
 * with the point-in-time figure (TICKET-STAT-03); a non-joint account is unaffected. `transactions`
 * should be the full universe rather than pre-filtered to `accounts` — resolving a joint leg's
 * linked-transfer counterpart may need a transaction on an account outside `accounts` (this is
 * what lets `computeAccountBalanceTrends` build a single joint account's own series without
 * losing visibility into its transfer counterparts); transactions on untracked accounts are
 * otherwise ignored.
 *
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
  context: JointLegContext = emptyJointLegContext,
): NetWorthPoint[] => {
  const trackedAccountsById = new Map(accounts.map((account) => [account.id!, account]));
  const sorted = [...transactions].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));

  let runningTotal = accounts.reduce(
    (sum, account) =>
      sum + account.openingBalance * (account.type === 'joint' ? (account.ownershipShare ?? 1) : 1),
    0,
  );
  let index = 0;

  return bucketKeysInRange(from, to, granularity).map((bucketKey) => {
    const { end } = bucketDateBoundaries(bucketKey, granularity);

    while (index < sorted.length && sorted[index].bookingDate <= end) {
      const transaction = sorted[index];
      const account = trackedAccountsById.get(transaction.accountId);
      if (account) {
        if (account.type === 'joint') {
          const classification = classifyJointLeg(transaction, account, context);
          runningTotal += jointLegStakeDelta(transaction, account, classification);
        } else {
          runningTotal += transaction.amount;
        }
      }
      index++;
    }

    return { bucketKey, bucketEnd: end, netWorth: runningTotal };
  });
};
