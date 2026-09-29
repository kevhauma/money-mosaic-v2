import { Injectable, inject } from '@angular/core';
import { ApiClient } from '@/core/data-access';

export type ClearTransactionsResult = {
  /** Transactions removed because they belonged to the cleared account. */
  removedTransactionIds: number[];
  /** Transfer records removed because one side belonged to the cleared account. */
  unlinkedTransferIds: number[];
  /** Surviving (not-removed) transactions whose transferId was cleared as a result. */
  clearedTransferTransactionIds: number[];
};

@Injectable({ providedIn: 'root' })
export class AccountDeletionService {
  private readonly api = inject(ApiClient);

  /**
   * Removes all of an account's transactions and any transfer links touching them, in one
   * transaction (CR-1.1) so a failure leaves the account's data untouched — no half-cleared state —
   * and no orphaned rows skew stats or net worth. The account row itself is left intact so the user
   * can re-import a corrected export onto a clean slate (TICKET-ACC-01) while keeping the account's
   * settings and mapping profiles. Transfer cleanup mirrors {@link ImportService.undoImport}: a
   * removed transaction may have been auto-linked to one from a *different* account (FR-TRF-2 links
   * across the whole dataset), so the surviving side is un-linked rather than left with a dangling
   * transferId.
   */
  clearTransactions = (accountId: number): Promise<ClearTransactionsResult> =>
    this.api.post<ClearTransactionsResult>(`/accounts/${accountId}/transactions/delete`, {});

  /**
   * Deletes an account together with its transactions and any transfer links touching them, in one
   * transaction (CR-1.1) so the delete keeps the confirmation's promise and leaves no orphaned rows.
   * The endpoint runs the same cascade as {@link clearTransactions} — delete is "clear transactions
   * + remove the account row" — so the two paths cannot drift, and it answers **200 with the cascade
   * report** rather than a bare 204 because `AccountsStore.removeAccount` mirrors all three lists
   * into their stores and has no other way to learn them.
   */
  deleteAccount = (accountId: number): Promise<ClearTransactionsResult> =>
    this.api.delete<ClearTransactionsResult>(`/accounts/${accountId}`);
}
