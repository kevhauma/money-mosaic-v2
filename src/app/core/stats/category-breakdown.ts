import type { Account, Category, Transaction } from '@/core/data-access';
import { classifyForStats } from './classify-for-stats';

export type CategoryBreakdownEntry = {
  /** null = uncategorised entry (no category assigned, bucketed by amount sign). */
  categoryId: number | null;
  total: number;
  /** Share of the total within its own kind (expense or income), 0..1. */
  share: number;
  transactionCount: number;
};

export type CategoryBreakdown = {
  expenseByCategory: CategoryBreakdownEntry[];
  incomeBySource: CategoryBreakdownEntry[];
};

const finalizeEntries = (
  totalsByCategoryId: Map<number | null, { total: number; count: number }>,
): CategoryBreakdownEntry[] => {
  // Netted totals can go negative when refunds/paybacks exceed spend in the range — clamp to 0
  // rather than letting a category go negative or flip into the other bucket (TICKET-STAT-11).
  const clampedEntries = [...totalsByCategoryId.entries()].map(
    ([categoryId, { total, count }]) => [categoryId, { total: Math.max(0, total), count }] as const,
  );
  const grandTotal = clampedEntries.reduce((sum, [, entry]) => sum + entry.total, 0);

  return clampedEntries
    .map(([categoryId, { total, count }]) => ({
      categoryId,
      total,
      share: grandTotal === 0 ? 0 : total / grandTotal,
      transactionCount: count,
    }))
    .sort((a, b) => b.total - a.total);
};

const addTotal = (
  totals: Map<number | null, { total: number; count: number }>,
  key: number | null,
  amount: number,
): void => {
  const existing = totals.get(key) ?? { total: 0, count: 0 };
  totals.set(key, { total: existing.total + amount, count: existing.count + 1 });
};

/**
 * Splits [from, to] transactions into expense-by-category and income-by-source totals with
 * share-of-total (FR-STAT-3), each entry clamped to 0 if refunds/paybacks exceed spend in the range
 * (TICKET-STAT-11). Every per-transaction exclusion/routing/bucketing decision is delegated to the
 * shared `classifyForStats` pipeline (CR3-2.1) — this aggregation only groups the classified amount
 * by `categoryId` and finalises shares.
 */
export const computeCategoryBreakdown = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): CategoryBreakdown => {
  const expenseTotals = new Map<number | null, { total: number; count: number }>();
  const incomeTotals = new Map<number | null, { total: number; count: number }>();

  for (const transaction of transactions) {
    const result = classifyForStats(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
    );
    if (result.kind === 'income') addTotal(incomeTotals, result.categoryId, result.amount);
    else if (result.kind === 'expense') addTotal(expenseTotals, result.categoryId, result.amount);
  }

  return {
    expenseByCategory: finalizeEntries(expenseTotals),
    incomeBySource: finalizeEntries(incomeTotals),
  };
};
