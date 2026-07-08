import type { Account, Transaction } from '@/core/data-access';
import { computeNetWorthTrend, type NetWorthPoint } from './net-worth-trend';
import type { Granularity } from './date-buckets';

export type AccountBalanceSeries = {
  accountId: number;
  points: NetWorthPoint[];
};

/**
 * Per-account balance-over-time series (TICKET-STAT-02), reusing `computeNetWorthTrend` per
 * account (one account's own transactions + itself as the sole "account") rather than a parallel
 * implementation — a single account passed here is the detail-chart series, the full active-account
 * list is the overview's stacked series.
 */
export const computeAccountBalanceTrends = (
  transactions: Transaction[],
  accounts: Account[],
  from: string,
  to: string,
  granularity: Granularity,
): AccountBalanceSeries[] =>
  accounts.map((account) => {
    const ownTransactions = transactions.filter((t) => t.accountId === account.id);
    return {
      accountId: account.id!,
      points: computeNetWorthTrend(ownTransactions, [account], from, to, granularity),
    };
  });
