import { computed, inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { TransfersRepository, type Transaction, type Transfer } from '@/core/data-access';
import { TransferLinkingService } from '@/core/transfers';
import { TransactionsStore } from './transactions.store';

const transferConfig = entityConfig({
  entity: type<Transfer>(),
  selectId: (transfer) => transfer.id!,
});

export const TransfersStore = signalStore(
  { providedIn: 'root' },
  withEntities(transferConfig),
  withComputed(({ entities }) => ({
    transfers: entities,
    transferByTransactionId: computed(() => {
      const map = new Map<number, Transfer>();
      for (const transfer of entities()) {
        map.set(transfer.fromTransactionId, transfer);
        map.set(transfer.toTransactionId, transfer);
      }
      return map;
    }),
  })),
  withMethods((store) => {
    const transfersRepository = inject(TransfersRepository);
    const transferLinkingService = inject(TransferLinkingService);
    const transactionsStore = inject(TransactionsStore);

    return {
      hydrate: async (): Promise<void> => {
        patchState(store, setAllEntities(await transfersRepository.getAll(), transferConfig));
      },

      link: async (fromTransaction: Transaction, toTransaction: Transaction): Promise<void> => {
        const { transfer, updatedTransactions } = await transferLinkingService.linkManually(
          fromTransaction,
          toTransaction,
        );
        patchState(store, addEntity(transfer, transferConfig));
        transactionsStore.patchMany(
          updatedTransactions.map((transaction) => ({
            id: transaction.id!,
            changes: { transferId: transaction.transferId },
          })),
        );
      },

      unlink: async (transferId: number): Promise<void> => {
        const transfer = store.transfers().find((candidate) => candidate.id === transferId);
        if (!transfer) return;

        await transferLinkingService.unlink(transfer);

        patchState(store, removeEntity(transferId));
        transactionsStore.patchMany([
          { id: transfer.fromTransactionId, changes: { transferId: undefined } },
          { id: transfer.toTransactionId, changes: { transferId: undefined } },
        ]);
      },
    };
  }),
);
