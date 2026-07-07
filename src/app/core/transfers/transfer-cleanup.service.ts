import { Injectable, inject } from '@angular/core';
import { TransactionsRepository, TransfersRepository, type Transaction } from '@/core/data-access';

export type TransferCleanupResult = {
  /** Transfer records removed because one side belonged to the removed transactions. */
  unlinkedTransferIds: number[];
  /** Surviving (not-removed) transactions whose transferId was cleared as a result. */
  clearedTransferTransactionIds: number[];
};

@Injectable({ providedIn: 'root' })
export class TransferCleanupService {
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly transfersRepository = inject(TransfersRepository);

  /**
   * Given a set of transactions about to be removed (undoing an import, clearing/deleting an
   * account), removes any `Transfer` links touching them and clears the surviving side's
   * `transferId` — unless the surviving side is itself in the doomed set, in which case it's left
   * alone since it's about to be removed too.
   *
   * Must run inside the caller's own `appDb.transaction('rw', [...])` scope covering at least
   * `transactions` + `transfers` — this method opens no transaction of its own.
   */
  cleanupTransfersForRemovedTransactions = async (
    transactions: Transaction[],
  ): Promise<TransferCleanupResult> => {
    const removedIds = new Set(transactions.map((transaction) => transaction.id!));

    const transferIds = [
      ...new Set(
        transactions
          .map((transaction) => transaction.transferId)
          .filter((transferId): transferId is number => transferId != null),
      ),
    ];
    const transfers = await this.transfersRepository.getByIds(transferIds);
    const clearedTransferTransactionIds: number[] = [];
    for (const transfer of transfers) {
      await this.transfersRepository.remove(transfer.id!);
      const survivingId = removedIds.has(transfer.fromTransactionId)
        ? transfer.toTransactionId
        : transfer.fromTransactionId;
      if (!removedIds.has(survivingId)) {
        await this.transactionsRepository.update(survivingId, { transferId: undefined });
        clearedTransferTransactionIds.push(survivingId);
      }
    }

    return {
      unlinkedTransferIds: transfers.map((transfer) => transfer.id!),
      clearedTransferTransactionIds,
    };
  };
}
