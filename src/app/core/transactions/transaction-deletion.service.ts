import { Injectable, inject } from '@angular/core';
import { appDb, type Transaction } from '@/core/data-access';
import { TransferCleanupService, type RemoveTransactionsWithCleanupResult } from '@/core/transfers';

export type RemoveTransactionsResult = RemoveTransactionsWithCleanupResult;

@Injectable({ providedIn: 'root' })
export class TransactionDeletionService {
  private readonly transferCleanupService = inject(TransferCleanupService);

  /**
   * Deletes the given transactions and any transfer links touching them, in one atomic write
   * (mirrors {@link AccountDeletionService}'s cascade) so a failure leaves nothing half-deleted.
   * Powers user-initiated deletion from the bulk-action bar and the transaction edit popup.
   */
  removeMany = async (transactions: Transaction[]): Promise<RemoveTransactionsResult> =>
    appDb.transaction('rw', [appDb.transactions, appDb.transfers], () =>
      this.transferCleanupService.removeTransactionsWithTransferCleanup(transactions),
    );
}
