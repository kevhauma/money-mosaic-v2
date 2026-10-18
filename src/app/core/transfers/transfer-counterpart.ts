import type { Account, Transaction, Transfer } from '@/core/data-access';
import { normalizeIban } from '@/shared/utils';
import { isSavingsMovement } from './transfer-matching';

/**
 * The counterpart leg of a transfer — the other of its two transaction ids (TICKET-TRF-06).
 *
 * The transfer stores `from`/`to` and the row can be either one, so "the other one" is the whole
 * of the logic and is the part that would silently return the row itself if the comparison were
 * ever written the wrong way round.
 */
export const counterpartTransactionId = (
  transfer: Transfer,
  transactionId: number,
): number | undefined => {
  if (transfer.fromTransactionId === transactionId) return transfer.toTransactionId;
  if (transfer.toTransactionId === transactionId) return transfer.fromTransactionId;
  return undefined;
};

/** What `counterpartAccountId` resolves the other end against — all of it already memoized by the stores. */
export type CounterpartContext = {
  transfersById: ReadonlyMap<number, Transfer>;
  transactionsById: ReadonlyMap<number, Transaction>;
  accounts: readonly Account[];
  ownSavingsIbans: ReadonlySet<string>;
};

/**
 * Which of my own accounts sits at the other end of `transaction` — the same two kinds of row
 * `computeTransferFlows` counts as money moving between my accounts: a linked transfer leg (the
 * account of its counterpart leg) and an unlinked savings movement (the savings account its
 * counterparty IBAN names).
 *
 * `undefined` for any other row, and for a linked leg whose counterpart can't be resolved (a
 * half-deleted pair), so a caller never names an account that isn't there.
 */
export const counterpartAccountId = (
  transaction: Transaction,
  context: CounterpartContext,
): number | undefined => {
  if (transaction.transferId != null) {
    const transfer = context.transfersById.get(transaction.transferId);
    const counterpartId =
      transfer && transaction.id != null
        ? counterpartTransactionId(transfer, transaction.id)
        : undefined;
    return counterpartId == null
      ? undefined
      : context.transactionsById.get(counterpartId)?.accountId;
  }
  if (!isSavingsMovement(transaction, context.ownSavingsIbans)) return undefined;

  const counterpartyIban = normalizeIban(transaction.counterpartyIban);
  return context.accounts.find(
    (account) => account.type === 'savings' && normalizeIban(account.iban) === counterpartyIban,
  )?.id;
};
