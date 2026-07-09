import { inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { ImportBatchesRepository, type ImportBatch, type Transaction } from '@/core/data-access';
import { TransactionsStore, TransfersStore } from '@/feature-transactions';
import { ImportService, type CommitImportInput, type CommitImportResult } from '@/core/import';
import { CoOwnerContributionService, RulesEngineService } from '@/core/categorisation';

/** Applies `{ id, categoryId }` updates onto their matching transactions, leaving the rest untouched. */
const applyCategoryUpdates = (
  transactions: Transaction[],
  updates: { id: number; categoryId: number }[],
): Transaction[] => {
  const categoryIdById = new Map(updates.map((update) => [update.id, update.categoryId]));
  return transactions.map((transaction) =>
    categoryIdById.has(transaction.id!)
      ? { ...transaction, categoryId: categoryIdById.get(transaction.id!) }
      : transaction,
  );
};

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
    const transfersStore = inject(TransfersStore);
    const importService = inject(ImportService);
    const rulesEngineService = inject(RulesEngineService);
    const coOwnerContributionService = inject(CoOwnerContributionService);

    return {
      hydrate: async (): Promise<void> => {
        patchState(
          store,
          setAllEntities(await importBatchesRepository.getAll(), importBatchConfig),
        );
      },

      /**
       * Runs the rules engine, then the co-owner contribution registry (TICKET-CAT-02), over freshly
       * imported rows before they land in the store, so they show up already categorised (FR-CAT-3).
       * The registry-driven "Partner contribution" tag runs last and wins over a conflicting user
       * Rule for the same joint-account inflow — the co-owner IBAN registry is the more specific,
       * curated signal.
       */
      commitImport: async (input: CommitImportInput): Promise<CommitImportResult> => {
        const result = await importService.commitImport(input);

        const ruleUpdates = await rulesEngineService.runAndPersist(result.addedTransactions);
        const ruleCategorisedTransactions = applyCategoryUpdates(
          result.addedTransactions,
          ruleUpdates,
        );

        const contributionUpdates = await coOwnerContributionService.runAndPersist(
          ruleCategorisedTransactions,
        );
        const categorisedTransactions = applyCategoryUpdates(
          ruleCategorisedTransactions,
          contributionUpdates,
        );

        patchState(store, addEntity(result.batch, importBatchConfig));
        transactionsStore.addMany(categorisedTransactions);

        // Re-scans the entire dataset, not just this batch, so a later import can retroactively
        // pair with an earlier one-sided movement (FR-TRF-2).
        await transfersStore.runAutoLink();

        return { ...result, addedTransactions: categorisedTransactions };
      },

      undoImport: async (batch: ImportBatch): Promise<void> => {
        const transactionIds = transactionsStore
          .transactions()
          .filter((transaction) => transaction.importBatchId === batch.id)
          .map((transaction) => transaction.id!);

        const { unlinkedTransferIds, clearedTransferTransactionIds } =
          await importService.undoImport(batch.id!);

        patchState(store, removeEntity(batch.id!));
        transactionsStore.removeMany(transactionIds);
        transactionsStore.patchMany(
          clearedTransferTransactionIds.map((id) => ({ id, changes: { transferId: undefined } })),
        );
        transfersStore.removeLocal(unlinkedTransferIds);
      },
    };
  }),
);
