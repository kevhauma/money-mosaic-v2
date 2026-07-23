import type { Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';

/** The full set of filter axes the overview table's search/filter bar exposes. */
export type TransactionFilters = {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  text: string;
  amountMin: string;
  amountMax: string;
  amountDirection: 'expense' | 'income';
};

/**
 * Pure predicate for whether a transaction survives every active filter axis — extracted from the
 * overview's `filteredTransactions` computed (previously the app's only critical-complexity finding,
 * cyclomatic 34 / cognitive 45) so it's testable without standing up the component/store world.
 */
export function matchesTransactionFilters(
  transaction: Transaction,
  filters: TransactionFilters,
  ownSavingsIbans: ReadonlySet<string>,
): boolean {
  const accountId = filters.accountId ? Number(filters.accountId) : null;
  if (accountId !== null && transaction.accountId !== accountId) return false;

  if (filters.dateFrom && transaction.bookingDate < filters.dateFrom) return false;
  if (filters.dateTo && transaction.bookingDate > filters.dateTo) return false;

  if (
    filters.categoryId === 'uncategorised' &&
    (transaction.categoryId != null ||
      transaction.transferId != null ||
      isSavingsMovement(transaction, ownSavingsIbans))
  ) {
    return false;
  }
  if (
    filters.categoryId &&
    filters.categoryId !== 'uncategorised' &&
    transaction.categoryId !== Number(filters.categoryId)
  ) {
    return false;
  }

  if (filters.text) {
    const haystack =
      `${transaction.rawDescription} ${transaction.counterpartyName ?? ''}`.toLowerCase();
    if (!haystack.includes(filters.text)) return false;
  }

  const amountMin = filters.amountMin !== '' ? Math.abs(Number(filters.amountMin)) : null;
  const amountMax = filters.amountMax !== '' ? Math.abs(Number(filters.amountMax)) : null;

  if (amountMin !== null || amountMax !== null) {
    const isExpense = filters.amountDirection !== 'income';
    if (isExpense ? transaction.amount >= 0 : transaction.amount < 0) return false;

    const magnitude = Math.abs(transaction.amount);
    if (amountMin !== null && magnitude < amountMin) return false;
    if (amountMax !== null && magnitude > amountMax) return false;
  }

  return true;
}
