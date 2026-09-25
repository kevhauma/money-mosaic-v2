import { and, eq, inArray, type SQL } from 'drizzle-orm';

import type { DbOrTx } from '../db.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';

/**
 * The shared body of every path that deletes transactions (TICKET-SRV-04) — undoing an import,
 * clearing or deleting an account, deleting a hand-picked selection. Ported from the client's
 * `core/transfers/transfer-cleanup.service.ts`, whose behaviour is the specification: same rules,
 * same reported shape, and the cases its spec covers are ported alongside it.
 *
 * **It opens no transaction of its own and must run inside the caller's.** The client's doc
 * comments said exactly this about `appDb.transaction('rw', [transactions, transfers])`, and the
 * reason is unchanged by the move to SQLite: removing a transaction, deleting the `Transfer` that
 * pointed at it and clearing the surviving leg's `transferId` are three statements expressing one
 * fact. A failure between any two of them leaves a transaction linked to a transfer that is gone —
 * which is the state the whole ticket exists to make impossible.
 *
 * `transfers` cascades when either leg is deleted, so SQLite would drop the link on its own. It
 * cannot clear the *surviving* leg's `transferId`, which is a plain column by schema decision (a
 * real foreign key there would close a reference cycle with `transfers`). That half is what this
 * function is for, and it deletes the link explicitly rather than leaning on the cascade so the
 * ids it reports are the ids it removed.
 *
 * Every statement is `where userId = ?` as well: the cleanup is reached from endpoints that have
 * already established ownership, and keeping the clause anyway means a future caller that has not
 * cannot widen the blast radius past its own rows.
 */

/** All the cleanup reads of a row on its way out. */
export type DoomedTransaction = {
  readonly id: number;
  readonly transferId?: number | null;
};

export type TransferCleanupResult = {
  /** Transfer records removed because one side belonged to the removed transactions. */
  readonly unlinkedTransferIds: number[];
  /** Surviving (not-removed) transactions whose `transferId` was cleared as a result. */
  readonly clearedTransferTransactionIds: number[];
};

export type RemoveTransactionsWithCleanupResult = TransferCleanupResult & {
  /** Transactions actually removed (the ids passed in). */
  readonly removedTransactionIds: number[];
};

/**
 * The `{ id, transferId }` pairs the cleanup needs, for the user's transactions matching `filter` —
 * the one query every caller reads its doomed set through, so "how many rows would this remove" and
 * "how many rows did it remove" cannot be answered differently (TICKET-IMP-13's `previewUndo`
 * contract).
 */
export const doomedTransactions = (tx: DbOrTx, userId: number, filter: SQL): DoomedTransaction[] =>
  tx
    .select({ id: transactions.id, transferId: transactions.transferId })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), filter))
    .all();

/**
 * Removes any `Transfer` link touching the doomed transactions and clears the surviving side's
 * `transferId` — unless the surviving side is itself doomed, in which case it is left alone since
 * it is about to be removed too.
 */
export const cleanupTransfersForRemovedTransactions = (
  tx: DbOrTx,
  doomed: readonly DoomedTransaction[],
  userId: number,
): TransferCleanupResult => {
  const removedIds = new Set(doomed.map((row) => row.id));
  const transferIds = [
    ...new Set(doomed.map((row) => row.transferId).filter((id): id is number => id != null)),
  ];
  // `inArray` with no values is not a question SQL can be asked, and the answer is known anyway.
  if (transferIds.length === 0)
    return { unlinkedTransferIds: [], clearedTransferTransactionIds: [] };

  const linked = tx
    .select({
      id: transfers.id,
      fromTransactionId: transfers.fromTransactionId,
      toTransactionId: transfers.toTransactionId,
    })
    .from(transfers)
    .where(and(eq(transfers.userId, userId), inArray(transfers.id, transferIds)))
    .all();

  const clearedTransferTransactionIds: number[] = [];
  for (const transfer of linked) {
    tx.delete(transfers)
      .where(and(eq(transfers.id, transfer.id), eq(transfers.userId, userId)))
      .run();

    const survivingId = removedIds.has(transfer.fromTransactionId)
      ? transfer.toTransactionId
      : transfer.fromTransactionId;
    if (removedIds.has(survivingId)) continue;

    tx.update(transactions)
      .set({ transferId: null })
      .where(and(eq(transactions.id, survivingId), eq(transactions.userId, userId)))
      .run();
    clearedTransferTransactionIds.push(survivingId);
  }

  return {
    unlinkedTransferIds: linked.map((transfer) => transfer.id),
    clearedTransferTransactionIds,
  };
};

/**
 * The cleanup above plus removing the doomed transactions themselves — the glue every call site
 * that deletes a batch of transactions repeated (account clear/delete, transaction delete, import
 * undo): collect ids, clean up transfers, delete the rows (CR3-2.5).
 *
 * Same caller-scope contract as {@link cleanupTransfersForRemovedTransactions}: it opens no
 * transaction of its own. The cleanup runs *before* the delete, so the surviving leg is repaired
 * while the row that named it still exists.
 */
export const removeTransactionsWithTransferCleanup = (
  tx: DbOrTx,
  doomed: readonly DoomedTransaction[],
  userId: number,
): RemoveTransactionsWithCleanupResult => {
  const removedTransactionIds = doomed.map((row) => row.id);
  const cleanup = cleanupTransfersForRemovedTransactions(tx, doomed, userId);

  if (removedTransactionIds.length > 0) {
    tx.delete(transactions)
      .where(and(eq(transactions.userId, userId), inArray(transactions.id, removedTransactionIds)))
      .run();
  }

  return { removedTransactionIds, ...cleanup };
};
