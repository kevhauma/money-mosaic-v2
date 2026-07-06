import { computed, inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntities,
  entityConfig,
  removeEntities,
  setAllEntities,
  updateEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { TransactionsRepository, type Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';

const transactionConfig = entityConfig({
  entity: type<Transaction>(),
  selectId: (transaction) => transaction.id!,
});

/**
 * Savings-account IBANs, pushed down from `AccountsStore` (which already depends on this store, so this
 * store can't inject it back without a DI cycle) so the categorisation backlog can drop savings
 * movements (TICKET-TRF-02).
 */
type TransactionsState = { ownSavingsIbans: ReadonlySet<string> };

export const TransactionsStore = signalStore(
  { providedIn: 'root' },
  withEntities(transactionConfig),
  withState<TransactionsState>({ ownSavingsIbans: new Set<string>() }),
  withComputed(({ entities, ownSavingsIbans }) => {
    /**
     * Surfaces the categorisation backlog so it's never quietly lost (FR-CAT-5), minus money moved
     * into a savings account — that never needs a category (TICKET-TRF-02).
     */
    const uncategorisedTransactions = computed(() =>
      entities().filter(
        (transaction) =>
          transaction.categoryId == null && !isSavingsMovement(transaction, ownSavingsIbans()),
      ),
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

      /** Receives the current savings-account IBANs from `AccountsStore` (TICKET-TRF-02). */
      setOwnSavingsIbans: (ownSavingsIbans: ReadonlySet<string>): void => {
        patchState(store, { ownSavingsIbans });
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

      /**
       * Applies one category to many transactions in a single batched write, marking each as a manual
       * category so a later rules re-run won't overwrite it (FR-TXN-2 / FR-CAT-3). Powers the bulk-action
       * bar (TICKET-TXN-01).
       */
      bulkAssignCategory: async (ids: number[], categoryId: number): Promise<void> => {
        if (ids.length === 0) return;
        const changes: Partial<Transaction> = { categoryId, categoryManual: true };
        await transactionsRepository.bulkUpdate(ids.map((id) => ({ id, changes })));
        store.patchMany(ids.map((id) => ({ id, changes })));
      },
    };
  }),
);
