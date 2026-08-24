import type { Account, Transaction, Transfer } from '@/core/data-access';

/** What a linked row's Category cell says when the counterpart leg can't be resolved. */
const BARE_TRANSFER_LABEL = 'Transfer';

/**
 * The counterpart leg of a transfer — the other of its two transaction ids (TICKET-TRF-06).
 *
 * Exported for its own test: the transfer stores `from`/`to` and the row can be either one, so
 * "the other one" is the whole of the logic and is the part that would silently return the row
 * itself if the comparison were ever written the wrong way round.
 */
export const counterpartTransactionId = (
  transfer: Transfer,
  transactionId: number,
): number | undefined => {
  if (transfer.fromTransactionId === transactionId) return transfer.toTransactionId;
  if (transfer.toTransactionId === transactionId) return transfer.fromTransactionId;
  return undefined;
};

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
