import type { Transaction } from '@/core/data-access';

export type PeriodStats = {
  income: number;
  expense: number;
  net: number;
  /** (income-expense)/income; null when income is zero (render as "—" rather than divide by zero). */
  savingsRate: number | null;
};

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

/** Income/expense/net/savings-rate for [from, to], excluding linked transfers on both sides (FR-STAT-2). */
export const computePeriodStats = (
  transactions: Transaction[],
  from: string,
  to: string,
): PeriodStats => {
  let income = 0;
  let expense = 0;

  for (const transaction of transactions) {
    if (transaction.transferId != null) continue;
    if (!inRange(transaction, from, to)) continue;

    if (transaction.amount > 0) {
      income += transaction.amount;
    } else if (transaction.amount < 0) {
      expense += -transaction.amount;
    }
  }

  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income === 0 ? null : (income - expense) / income,
  };
};
