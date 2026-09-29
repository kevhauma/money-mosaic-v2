import { Injectable, inject } from '@angular/core';
import { ApiClient, type Transaction } from '@/core/data-access';
import type { RemoveTransactionsWithCleanupResult } from '@/core/transfers';

export type RemoveTransactionsResult = RemoveTransactionsWithCleanupResult;

@Injectable({ providedIn: 'root' })
export class TransactionDeletionService {
  private readonly api = inject(ApiClient);

  /**
   * Deletes the given transactions and any transfer links touching them, in one transaction
   * (TICKET-SRV-04) so a failure leaves nothing half-deleted. Powers user-initiated deletion from
   * the bulk-action bar and the transaction edit popup.
   *
   * Not `DELETE /api/transactions/bulk`, which removes rows and nothing else: this endpoint also
   * repairs every transfer that touched them, and reports what it removed so the stores can mirror
   * it. An id that matches no row of this user's is **skipped, not refused** — a stale selection (a
   * row deleted in another tab, or one whose import batch was just undone) is exactly the case the
   * bulk-action bar hits, and `bulkDelete` was a no-op on a missing key too.
   */
  removeMany = (transactions: Transaction[]): Promise<RemoveTransactionsResult> =>
    this.api.post<RemoveTransactionsResult>('/transactions/delete', {
      ids: transactions.map((transaction) => transaction.id!),
    });
}
