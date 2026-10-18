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
 * exact rows `classifyForStats` keeps *out* of income/expense under FR-TRF-1: linked transfer legs
 * (`transferId`) and savings movements (a counterparty that is one of my savings IBANs, linked or
 * not). On the whole-household Dashboard the two legs cancel and hiding them is right; on one
 * account they are half the story — a savings account would otherwise read €0 in and €0 out
 * forever — so account detail shows them as their own figure.
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
