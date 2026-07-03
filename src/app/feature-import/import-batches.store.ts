import { inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { ImportBatchesRepository, type ImportBatch } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
import { ImportService, type CommitImportInput, type CommitImportResult } from '@/core/import';
import { RulesEngineService } from '@/core/categorisation';

const importBatchConfig = entityConfig({
  entity: type<ImportBatch>(),
  selectId: (batch) => batch.id!,
});

export const ImportBatchesStore = signalStore(
  { providedIn: 'root' },
  withEntities(importBatchConfig),
  withComputed(({ entities }) => ({ batches: entities })),
  withMethods((store) => {
    const importBatchesRepository = inject(ImportBatchesRepository);
    const transactionsStore = inject(TransactionsStore);
    const importService = inject(ImportService);
    const rulesEngineService = inject(RulesEngineService);

    return {
      hydrate: async (): Promise<void> => {
        patchState(
          store,
          setAllEntities(await importBatchesRepository.getAll(), importBatchConfig),
        );
      },

      /** Runs the rules engine over freshly imported rows before they land in the store, so they show up already categorised (FR-CAT-3). */
      commitImport: async (input: CommitImportInput): Promise<CommitImportResult> => {
        const result = await importService.commitImport(input);

        const updates = await rulesEngineService.runAndPersist(result.addedTransactions);
        const categoryIdById = new Map(updates.map((update) => [update.id, update.categoryId]));
        const categorisedTransactions = result.addedTransactions.map((transaction) =>
          categoryIdById.has(transaction.id!)
            ? { ...transaction, categoryId: categoryIdById.get(transaction.id!) }
            : transaction,
        );

        patchState(store, addEntity(result.batch, importBatchConfig));
        transactionsStore.addMany(categorisedTransactions);
        return { ...result, addedTransactions: categorisedTransactions };
      },

      undoImport: async (batch: ImportBatch): Promise<void> => {
        const transactionIds = transactionsStore
          .transactions()
          .filter((transaction) => transaction.importBatchId === batch.id)
          .map((transaction) => transaction.id!);

        await importService.undoImport(batch.id!);

        patchState(store, removeEntity(batch.id!));
        transactionsStore.removeMany(transactionIds);
      },
    };
  }),
);
