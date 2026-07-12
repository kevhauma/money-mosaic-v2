import type { Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';

/** Default number of transactions surfaced by `computeTopTransactions` when the caller doesn't pass one. */
export const DEFAULT_TOP_TRANSACTIONS_LIMIT = 5;

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

/**
 * The `limit` largest individual expense transactions in `[from, to]` (FR-STAT-12) — a single big
 * outlier (e.g. one €800 appliance purchase) can otherwise hide inside an otherwise-modest category
 * total. Reuses the same transfer/savings-movement exclusion predicates as `computePeriodStats`/
 * `computeCategoryBreakdown` (`transferId` check + `isSavingsMovement`) rather than re-implementing
 * them. Deliberately expense-only (`amount < 0`) — a symmetric "biggest income" view is easy to add
 * later with the same shape if requested, but isn't part of this ticket. Returns raw `Transaction`s
 * rather than a resolved view model — category name/colour are joined at the UI layer via
 * `CategoriesStore`, same as `computeCategoryBreakdown`'s `categoryId`-only entries.
 *
 * Sorted strictly by `Math.abs(amount)` descending; two transactions of equal size are ordered by
 * `bookingDate` descending (most recent first) as a stable, documented tie-break.
 */
export const computeTopTransactions = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  limit: number = DEFAULT_TOP_TRANSACTIONS_LIMIT,
): Transaction[] => {
  const expenses = transactions.filter(
    (transaction) =>
      inRange(transaction, from, to) &&
      transaction.transferId == null &&
      !isSavingsMovement(transaction, ownSavingsIbans) &&
      transaction.amount < 0,
  );

  expenses.sort((a, b) => {
    const byAbsAmount = Math.abs(b.amount) - Math.abs(a.amount);
    if (byAbsAmount !== 0) return byAbsAmount;
    return b.bookingDate.localeCompare(a.bookingDate);
  });

  return expenses.slice(0, limit);
};
