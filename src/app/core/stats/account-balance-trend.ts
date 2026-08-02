import type { Account, Transaction } from '@/core/data-access';
import { computeAccountBalanceHistory, type AccountBalancePoint } from './account-balance-history';
import type { Granularity } from '@/shared/utils';

export type AccountBalanceSeries = {
  accountId: number;
  points: AccountBalancePoint[];
};

/**
 * Per-account real-balance-over-time series (TICKET-STAT-02) — a single account passed here is the
 * detail-chart series, the full active-account list is the overview's stacked series.
 *
 * Backed by `computeAccountBalanceHistory` per account, i.e. the plain `openingBalance + Σ amount`
 * ledger, *not* a contribution-weighted net-worth stake (TICKET-ACC-07): the Accounts
 * page shows what each account actually holds, matching its card's headline balance, so joint
 * ownership shares and per-transaction attribution never reach these series. Net worth as a concept
 * stays on the Dashboard. `transactions` may be the full universe; each series filters to its own
 * account, so no cross-account lookup context is needed any more.
 */
export const computeAccountBalanceTrends = (
  transactions: Transaction[],
  accounts: Account[],
  from: string,
  to: string,
  granularity: Granularity,
): AccountBalanceSeries[] =>
  accounts.map((account) => ({
    accountId: account.id!,
    points: computeAccountBalanceHistory(transactions, account, from, to, granularity),
  }));
