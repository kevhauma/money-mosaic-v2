import type { Category, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';

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

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

const finalizeEntries = (
  totalsByCategoryId: Map<number | null, { total: number; count: number }>,
): CategoryBreakdownEntry[] => {
  const grandTotal = [...totalsByCategoryId.values()].reduce((sum, entry) => sum + entry.total, 0);

  return [...totalsByCategoryId.entries()]
    .map(([categoryId, { total, count }]) => ({
      categoryId,
      total,
      share: grandTotal === 0 ? 0 : total / grandTotal,
      transactionCount: count,
    }))
    .sort((a, b) => b.total - a.total);
};

/**
 * Splits [from, to] transactions into expense-by-category and income-by-source totals with
 * share-of-total (FR-STAT-3). Linked transfers and movements to/from an own savings account are
 * excluded, so a savings movement never surfaces as an (uncategorised) expense entry (TICKET-TRF-02).
 */
export const computeCategoryBreakdown = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
): CategoryBreakdown => {
  const expenseTotals = new Map<number | null, { total: number; count: number }>();
  const incomeTotals = new Map<number | null, { total: number; count: number }>();

  for (const transaction of transactions) {
    if (transaction.transferId != null) continue;
    if (isSavingsMovement(transaction, ownSavingsIbans)) continue;
    if (!inRange(transaction, from, to)) continue;
    if (transaction.amount === 0) continue;

    const category =
      transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;
    const isExpense = category ? category.kind === 'expense' : transaction.amount < 0;
    const totals = isExpense ? expenseTotals : incomeTotals;
    const key = category?.id ?? null;
    const existing = totals.get(key) ?? { total: 0, count: 0 };
    totals.set(key, {
      total: existing.total + Math.abs(transaction.amount),
      count: existing.count + 1,
    });
  }

  return {
    expenseByCategory: finalizeEntries(expenseTotals),
    incomeBySource: finalizeEntries(incomeTotals),
  };
};
