import type { Account, Transaction, Transfer } from '@/core/data-access';
import { counterpartTransactionId } from '@/core/transfers';

/** What a linked row's Category cell says when the counterpart leg can't be resolved. */
const BARE_TRANSFER_LABEL = 'Transfer';

/**
 * What a linked transaction's Category cell reads instead of "Uncategorised" (TICKET-TRF-06).
 *
 * Linking clears the category by design (TICKET-TRF-01) and this does not change that rule — the
 * defect was that a correctly-linked transfer was *presented* as an uncategorised transaction, which
 * is exactly what the user is trained to go and fix. Naming the account at the other end is what
 * makes the row self-explaining without opening it: `Transfer · Savings`.
 *
 * Falls back to a bare `Transfer` when the counterpart leg or its account can't be resolved, so a
 * half-deleted pair still reads as linked rather than naming an account that isn't there.
 *
 * `undefined` for an unlinked transaction — that row keeps its category picker.
 */
export const transferLabelFor = (
  transaction: Transaction,
  transfer: Transfer | undefined,
  transactionsById: ReadonlyMap<number, Transaction>,
  accountsById: ReadonlyMap<number, Account>,
): string | undefined => {
  if (transaction.transferId == null || !transfer || transaction.id == null) return undefined;

  const counterpartId = counterpartTransactionId(transfer, transaction.id);
  const counterpart = counterpartId == null ? undefined : transactionsById.get(counterpartId);
  const accountName =
    counterpart == null ? undefined : accountsById.get(counterpart.accountId)?.name;

  return accountName ? `${BARE_TRANSFER_LABEL} · ${accountName}` : BARE_TRANSFER_LABEL;
};
