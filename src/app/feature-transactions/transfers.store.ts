import { Injectable, computed, inject, signal } from '@angular/core';
import { TransfersRepository, type Transaction, type Transfer } from '@/core/data-access';
import { TransferLinkingService } from '@/core/transfers';
import { TransactionsStore } from './transactions.store';

@Injectable({ providedIn: 'root' })
export class TransfersStore {
  private readonly transfersRepository = inject(TransfersRepository);
  private readonly transferLinkingService = inject(TransferLinkingService);
  private readonly transactionsStore = inject(TransactionsStore);

  private readonly transfersSignal = signal<Transfer[]>([]);
  readonly transfers = this.transfersSignal.asReadonly();

  readonly transferByTransactionId = computed(() => {
    const map = new Map<number, Transfer>();
    for (const transfer of this.transfersSignal()) {
      map.set(transfer.fromTransactionId, transfer);
      map.set(transfer.toTransactionId, transfer);
    }
    return map;
  });

  hydrate = async (): Promise<void> => {
    this.transfersSignal.set(await this.transfersRepository.getAll());
  };

  link = async (fromTransaction: Transaction, toTransaction: Transaction): Promise<void> => {
    const { transfer, updatedTransactions } = await this.transferLinkingService.linkManually(
      fromTransaction,
      toTransaction,
    );
    this.transfersSignal.update((existing) => [...existing, transfer]);
    this.transactionsStore.patchMany(
      updatedTransactions.map((transaction) => ({
        id: transaction.id!,
        changes: { transferId: transaction.transferId },
      })),
    );
  };

  unlink = async (transferId: number): Promise<void> => {
    const transfer = this.transfersSignal().find((candidate) => candidate.id === transferId);
    if (!transfer) return;

    await this.transferLinkingService.unlink(transfer);

    this.transfersSignal.update((existing) => existing.filter((t) => t.id !== transferId));
    this.transactionsStore.patchMany([
      { id: transfer.fromTransactionId, changes: { transferId: undefined } },
      { id: transfer.toTransactionId, changes: { transferId: undefined } },
    ]);
  };
}
