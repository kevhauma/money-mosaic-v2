import type { Account, Category, Transaction } from '@/core/data-access';
import { classifyForStats, type StatsMode } from './classify-for-stats';

export type PeriodStats = {
  income: number;
  expense: number;
  /**
   * Net money moved into own savings accounts in the period — deposits count positively, withdrawals
   * negatively, so a round-trip nets to zero. Excluded from `income`/`expense` on both legs (TICKET-TRF-02).
   */
  savings: number;
  net: number;
  /** savings/income — the share of income deliberately moved into savings; null when income is zero (render as "—" rather than divide by zero). */
  savingsRate: number | null;
};

/**
 * Income/expense/savings/net for [from, to]. Every per-transaction exclusion/routing/bucketing
 * decision is delegated to the shared `classifyForStats` pipeline (CR3-2.1) — this aggregation only
 * accumulates the three running totals and derives `net`/`savingsRate` from them.
 *
 * `mode` is passed straight through to that pipeline (TICKET-REC-09's dial). `'share'` is every
 * whole-household caller; account detail asks `'cashflow'` (TICKET-ACC-14), because one account's
 * page reads as a statement — money in, money out, the whole pot — not as my categorised budget.
 */
export const computePeriodStats = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  categoriesById: ReadonlyMap<number, Category> = new Map(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
  mode: StatsMode = 'share',
): PeriodStats => {
  let income = 0;
  let expense = 0;
  let savings = 0;

  for (const transaction of transactions) {
    const result = classifyForStats(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
      mode,
    );
    if (result.kind === 'savings') savings += result.amount;
    else if (result.kind === 'income') income += result.amount;
    else if (result.kind === 'expense') expense += result.amount;
  }

  return {
    income,
    expense,
    savings,
    net: income - expense,
    savingsRate: income === 0 ? null : savings / income,
  };
};
