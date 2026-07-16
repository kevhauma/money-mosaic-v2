import { Injectable, inject } from '@angular/core';
import { appDb, AccountsRepository, TransactionsRepository } from '@/core/data-access';
import { TransferCleanupService } from '@/core/transfers';

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
  private readonly accountsRepository = inject(AccountsRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly transferCleanupService = inject(TransferCleanupService);

  /**
   * Removes all of an account's transactions and any transfer links touching them, in one atomic
   * write (CR-1.1) so a failure leaves the account's data untouched — no half-cleared state — and no
   * orphaned rows skew stats or net worth. The account row itself is left intact so the user can
   * re-import a corrected export onto a clean slate (TICKET-ACC-01) while keeping the account's
   * settings and mapping profiles. Transfer cleanup mirrors {@link ImportService.undoImport}: a
   * removed transaction may have been auto-linked to one from a *different* account (FR-TRF-2 links
   * across the whole dataset), so the surviving side is un-linked rather than left with a dangling
   * transferId.
   */
  clearTransactions = async (accountId: number): Promise<ClearTransactionsResult> =>
    appDb.transaction('rw', [appDb.transactions, appDb.transfers], () =>
      this.cascadeTransactions(accountId),
    );

  /**
   * Deletes an account together with its transactions and any transfer links touching them, in one
   * atomic write (CR-1.1) so the delete keeps the confirmation's promise and leaves no orphaned rows.
   * Reuses the same {@link cascadeTransactions} cleanup as {@link clearTransactions} — delete is
   * "clear transactions + remove the account row" — so the two paths can't drift.
   */
  deleteAccount = async (accountId: number): Promise<ClearTransactionsResult> =>
    appDb.transaction('rw', [appDb.accounts, appDb.transactions, appDb.transfers], async () => {
      const result = await this.cascadeTransactions(accountId);
      await this.accountsRepository.remove(accountId);
      return result;
    });

  /**
   * Shared cascade for {@link clearTransactions} and {@link deleteAccount}. Must run inside an
   * existing `rw` transaction over at least `transactions` + `transfers`; it never touches the
   * `accounts` table, so the caller decides whether the account row survives.
   */
  private async cascadeTransactions(accountId: number): Promise<ClearTransactionsResult> {
    const transactions = await this.transactionsRepository.getByAccount(accountId);
    return this.transferCleanupService.removeTransactionsWithTransferCleanup(transactions);
  }
}
