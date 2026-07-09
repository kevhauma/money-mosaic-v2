import type { Account, Transaction } from '@/core/data-access';
import type { JointLegContext } from './classify-joint-leg';
import { computeNetWorthTrend, type NetWorthPoint } from './net-worth-trend';
import type { Granularity } from './date-buckets';

export type AccountBalanceSeries = {
  accountId: number;
  points: NetWorthPoint[];
};

/**
 * Per-account balance-over-time series (TICKET-STAT-02), reusing `computeNetWorthTrend` per
 * account (itself as the sole tracked "account") rather than a parallel implementation — a single
 * account passed here is the detail-chart series, the full active-account list is the overview's
 * stacked series. `transactions` must be the full universe (not pre-filtered per account): a
 * joint account's stake needs visibility into a linked transfer's other leg, which may live on an
 * account outside this call's own `accounts` list (TICKET-STAT-03); `context` carries the
 * cross-account lookups (`accountsById`/`transfersById`/`categoriesById`) that classification needs.
 */
export const computeAccountBalanceTrends = (
  transactions: Transaction[],
  accounts: Account[],
  from: string,
  to: string,
  granularity: Granularity,
  context?: JointLegContext,
): AccountBalanceSeries[] =>
  accounts.map((account) => ({
    accountId: account.id!,
    points: computeNetWorthTrend(transactions, [account], from, to, granularity, context),
  }));
