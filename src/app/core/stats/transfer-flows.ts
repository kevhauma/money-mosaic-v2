import type { Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';

export type TransferFlows = {
  /** Money that arrived from another of my accounts, as a positive total. */
  in: number;
  /** Money that left for another of my accounts, as a positive total. */
  out: number;
};

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

/**
 * The money `[from, to]` moved between my own accounts, split by direction (TICKET-ACC-14) — the
 * rows the Dashboard's readings keep *out* of income/expense under FR-TRF-1: linked transfer legs
 * (`transferId`) and savings movements (a counterparty that is one of my savings IBANs, linked or
 * not). Account detail reads `'cashflow'`, which counts them *in*, and shows this as the "of which"
 * breakdown — how much of an account's money in and out was only moving between my own accounts.
 *
 * Skips `nullified` and zero-amount rows for the same reason `classifyForStats` does. No joint-mode
 * dial: a transfer is attributed to nobody, so its full amount is the only reading there is.
 */
export const computeTransferFlows = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
): TransferFlows => {
  let transferIn = 0;
  let transferOut = 0;

  for (const transaction of transactions) {
    if (!inRange(transaction, from, to) || transaction.nullified) continue;
    const isOwnMovement =
      transaction.transferId != null || isSavingsMovement(transaction, ownSavingsIbans);
    if (!isOwnMovement) continue;

    if (transaction.amount > 0) transferIn += transaction.amount;
    else transferOut -= transaction.amount;
  }

  return { in: transferIn, out: transferOut };
};
