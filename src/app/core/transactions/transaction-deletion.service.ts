import { Injectable, inject } from '@angular/core';
import { appDb, TransactionsRepository, type Transaction } from '@/core/data-access';
import { TransferCleanupService, type TransferCleanupResult } from '@/core/transfers';

export type RemoveTransactionsResult = TransferCleanupResult & {
  removedTransactionIds: number[];
};

@Injectable({ providedIn: 'root' })
export class TransactionDeletionService {
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly transferCleanupService = inject(TransferCleanupService);

  /**
   * Deletes the given transactions and any transfer links touching them, in one atomic write
   * (mirrors {@link AccountDeletionService}'s cascade) so a failure leaves nothing half-deleted.
   * Powers user-initiated deletion from the bulk-action bar and the transaction edit popup.
   */
  removeMany = async (transactions: Transaction[]): Promise<RemoveTransactionsResult> =>
    appDb.transaction('rw', [appDb.transactions, appDb.transfers], async () => {
      const removedIds = transactions.map((transaction) => transaction.id!);

      const { unlinkedTransferIds, clearedTransferTransactionIds } =
        await this.transferCleanupService.cleanupTransfersForRemovedTransactions(transactions);

      await this.transactionsRepository.bulkRemove(removedIds);

      return {
        removedTransactionIds: removedIds,
        unlinkedTransferIds,
        clearedTransferTransactionIds,
      };
    });
}
