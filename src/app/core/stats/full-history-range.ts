import type { Account, Transaction } from '@/core/data-access';

/**
 * Earliest-to-today [from, to] span across the given accounts (TICKET-STAT-02): `from` is the
 * earliest of each account's opening-balance date or its first transaction's booking date, so an
 * account back-imported with older transactions than its recorded opening date still gets its
 * true full history. Generic over whichever accounts are passed in — callers decide whether that's
 * a single account (detail chart) or every active account (overview chart).
 */
export const computeFullHistoryRange = (
  accounts: Account[],
  transactions: Transaction[],
  todayIso: string,
): { from: string; to: string } => {
  if (accounts.length === 0) {
    return { from: todayIso, to: todayIso };
  }

  const accountIds = new Set(accounts.map((account) => account.id));
  const relevantTransactions = transactions.filter((t) => accountIds.has(t.accountId));

  let earliest = accounts[0].openingBalanceDate;
  for (const account of accounts) {
    if (account.openingBalanceDate < earliest) earliest = account.openingBalanceDate;
  }
  for (const transaction of relevantTransactions) {
    if (transaction.bookingDate < earliest) earliest = transaction.bookingDate;
  }

  return { from: earliest, to: todayIso };
};
