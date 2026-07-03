import { computed, inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import {
  addEntities,
  entityConfig,
  removeEntities,
  setAllEntities,
  updateEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { TransactionsRepository, type Transaction } from '@/core/data-access';

const transactionConfig = entityConfig({
  entity: type<Transaction>(),
  selectId: (transaction) => transaction.id!,
});

export const TransactionsStore = signalStore(
  { providedIn: 'root' },
  withEntities(transactionConfig),
  withComputed(({ entities }) => {
    /** Surfaces the categorisation backlog so it's never quietly lost (FR-CAT-5). */
    const uncategorisedTransactions = computed(() =>
      entities().filter((transaction) => transaction.categoryId == null),
    );
    return {
      transactions: entities,
      uncategorisedTransactions,
      uncategorisedCount: computed(() => uncategorisedTransactions().length),
    };
  }),
  withMethods((store) => {
    const transactionsRepository = inject(TransactionsRepository);

    return {
      hydrate: async (): Promise<void> => {
        patchState(store, setAllEntities(await transactionsRepository.getAll(), transactionConfig));
      },

      addMany: (transactions: Transaction[]): void => {
        patchState(store, addEntities(transactions, transactionConfig));
      },

      removeMany: (ids: number[]): void => {
        patchState(store, removeEntities(ids));
      },

      /** Reflects changes already persisted elsewhere (e.g. an atomic multi-transaction write) into local state. */
      patchMany: (updates: { id: number; changes: Partial<Transaction> }[]): void => {
        const changesById = new Map(updates.map((update) => [update.id, update.changes]));
        patchState(
          store,
          updateEntities(
            {
              ids: updates.map((update) => update.id),
              changes: (transaction) => changesById.get(transaction.id!) ?? {},
            },
            transactionConfig,
          ),
        );
      },
    };
  }),
  withMethods((store) => {
    const transactionsRepository = inject(TransactionsRepository);

    return {
      updateTransaction: async (id: number, changes: Partial<Transaction>): Promise<void> => {
        await transactionsRepository.update(id, changes);
        store.patchMany([{ id, changes }]);
      },
    };
  }),
);
