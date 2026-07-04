import { Injectable, inject } from '@angular/core';
import {
  appDb,
  AccountsRepository,
  TransactionsRepository,
  TransfersRepository,
} from '@/core/data-access';

export type DeleteAccountResult = {
  /** Transactions removed because they belonged to the deleted account. */
  removedTransactionIds: number[];
  /** Transfer records removed because one side belonged to the deleted account. */
  unlinkedTransferIds: number[];
  /** Surviving (not-removed) transactions whose transferId was cleared as a result. */
  clearedTransferTransactionIds: number[];
};

@Injectable({ providedIn: 'root' })
export class AccountDeletionService {
  private readonly accountsRepository = inject(AccountsRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly transfersRepository = inject(TransfersRepository);

  /**
   * Deletes an account together with its transactions and any transfer links touching them, in one
   * atomic write (CR-1.1) so the delete keeps the confirmation's promise and leaves no orphaned rows
   * skewing stats or net worth. Transfer cleanup mirrors {@link ImportService.undoImport}: a removed
   * transaction may have been auto-linked to one from a *different* account (FR-TRF-2 links across
   * the whole dataset), so the surviving side is un-linked rather than left with a dangling
   * transferId.
   */
  deleteAccount = async (accountId: number): Promise<DeleteAccountResult> =>
    appDb.transaction('rw', [appDb.accounts, appDb.transactions, appDb.transfers], async () => {
      const transactions = await this.transactionsRepository.getByAccount(accountId);
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

      await this.transactionsRepository.bulkRemove([...removedIds]);
      await this.accountsRepository.remove(accountId);

      return {
        removedTransactionIds: [...removedIds],
        unlinkedTransferIds: transfers.map((transfer) => transfer.id!),
        clearedTransferTransactionIds,
      };
    });
}
