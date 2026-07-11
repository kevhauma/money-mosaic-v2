import type { Account, Transaction, Transfer } from '@/core/data-access';

export type AttributionOverride = NonNullable<Transaction['attributionOverride']>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysBetween = (a: string, b: string): number =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / MS_PER_DAY;

/**
 * Validates a proposed `attributionOverride` before it's persisted (TICKET-TXN-03). Throws a
 * descriptive `Error` rather than silently accepting invalid input — the caller (a component or
 * store method) surfaces the message to the user. A `mode` of `'personal'`/`'notMine'` needs no
 * further checks; only `'shared'` references another account/transfer that can go stale or
 * ambiguous.
 */
export const validateAttributionOverride = (
  transaction: Transaction,
  override: AttributionOverride,
  context: {
    jointAccounts: Account[];
    transactionsById: ReadonlyMap<number, Transaction>;
    transfersById: ReadonlyMap<number, Transfer>;
  },
): void => {
  if (transaction.transferId != null) {
    throw new Error('A linked transfer leg cannot carry an attribution override.');
  }

  if (override.mode !== 'shared') {
    return;
  }

  let jointAccountId = override.jointAccountId;
  if (jointAccountId == null) {
    if (context.jointAccounts.length > 1) {
      throw new Error('Select which joint account this expense is shared with.');
    }
    jointAccountId = context.jointAccounts[0]?.id;
  } else if (!context.jointAccounts.some((account) => account.id === jointAccountId)) {
    throw new Error('The selected joint account no longer exists.');
  }

  if (override.reimbursementTransferId != null) {
    const transfer = context.transfersById.get(override.reimbursementTransferId);
    if (!transfer) {
      throw new Error('The selected reimbursement transfer no longer exists.');
    }
    const fromAccountId = context.transactionsById.get(transfer.fromTransactionId)?.accountId;
    const toAccountId = context.transactionsById.get(transfer.toTransactionId)?.accountId;
    if (fromAccountId !== jointAccountId && toAccountId !== jointAccountId) {
      throw new Error('The selected transfer does not touch the shared joint account.');
    }
  }
};

/**
 * Linked transfers touching `jointAccountId`, within `windowDays` of `transactionDate` — the
 * candidate list for the "reimbursed by a transfer" picker (TICKET-TXN-03), scoped the same way
 * transfer auto-matching windows candidates (`matchWindowDays`, see `core/transfers`).
 */
export const reimbursementCandidates = (
  transfers: Transfer[],
  transactionsById: ReadonlyMap<number, Transaction>,
  jointAccountId: number,
  transactionDate: string,
  windowDays: number,
): Transfer[] =>
  transfers.filter((transfer) => {
    const fromTransaction = transactionsById.get(transfer.fromTransactionId);
    const toTransaction = transactionsById.get(transfer.toTransactionId);
    const jointLeg =
      fromTransaction?.accountId === jointAccountId
        ? fromTransaction
        : toTransaction?.accountId === jointAccountId
          ? toTransaction
          : undefined;
    if (!jointLeg) return false;
    return daysBetween(jointLeg.bookingDate, transactionDate) <= windowDays;
  });
