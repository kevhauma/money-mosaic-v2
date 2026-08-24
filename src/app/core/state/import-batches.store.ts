import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { ImportBatchesRepository, type ImportBatch, type Transaction } from '@/core/data-access';
import { TransactionsStore } from './transactions.store';
import { TransfersStore } from './transfers.store';
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
  /**
   * Whether the repository read has landed (TICKET-ACC-13), the same flag `TransactionsStore` keeps.
   * An empty batch list and a not-yet-loaded one look identical, and the first thing built on this
   * store says "Never imported" about the difference — TICKET-TRF-06 shipped exactly that bug on
   * the transfers panel, so the flag goes in with the first consumer rather than after it.
   */
  withState({ hydrated: false }),
  withComputed(({ entities }) => ({
    batches: entities,
    /**
     * When each account last received imported rows (TICKET-ACC-13) — the newest `importedAt`
     * among that account's batches, absent from the map when it has none.
     *
     * Derived here rather than stored on the account: the batches already are the record, and a
     * mirrored `lastImportedAt` column would need maintaining on undo too, where the correct value
     * is "whatever the batch before it was" rather than anything the undo knows. Undo removes the
     * entity, so this recomputes to exactly that for free.
     *
     * ISO timestamps, so `localeCompare` orders them and no `Date` is constructed per batch.
     */
    lastImportedAtByAccountId: computed(() => {
      const lastByAccountId = new Map<number, string>();
      for (const batch of entities()) {
        const current = lastByAccountId.get(batch.accountId);
        if (current === undefined || batch.importedAt.localeCompare(current) > 0) {
          lastByAccountId.set(batch.accountId, batch.importedAt);
        }
      }
      return lastByAccountId;
    }),
  })),
  withMethods((store) => {
    const importBatchesRepository = inject(ImportBatchesRepository);
    const transactionsStore = inject(TransactionsStore);
    const transfersStore = inject(TransfersStore);
    const importService = inject(ImportService);
    const rulesEngineService = inject(RulesEngineService);
    const coOwnerContributionService = inject(CoOwnerContributionService);
    let hydration: Promise<void> | null = null;

    return {
      /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
      hydrate: (): Promise<void> => {
        if (!hydration) {
          hydration = importBatchesRepository.getAll().then((batches) => {
            patchState(store, setAllEntities(batches, importBatchConfig), { hydrated: true });
          });
        }
        return hydration;
      },

      /**
       * Runs the rules engine, then the co-owner contribution registry (TICKET-CAT-02), over freshly
       * imported rows before they land in the store, so they show up already categorised (FR-CAT-3).
       * The registry-driven "Partner contribution" tag runs last and wins over a conflicting user
       * Rule for the same joint-account inflow — the co-owner IBAN registry is the more specific,
       * curated signal. Awaits `TransactionsStore`/`TransfersStore`'s own hydration first
       * (idempotent) so the mirroring below (and the `runAutoLink` it triggers) never races the
       * bootstrap-kicked-off (non-blocking) hydration of either store (TICKET-PERF-05).
       */
      commitImport: async (input: CommitImportInput): Promise<CommitImportResult> => {
        await Promise.all([transactionsStore.hydrate(), transfersStore.hydrate()]);
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

        // Reflects rawLine/rawRow backfilled onto legacy duplicates so the already-loaded list
        // updates without a reload (TICKET-TXN-06).
        if (result.backfilledTransactions.length > 0) {
          transactionsStore.patchMany(result.backfilledTransactions);
        }

        // Re-scans the entire dataset, not just this batch, so a later import can retroactively
        // pair with an earlier one-sided movement (FR-TRF-2).
        await transfersStore.runAutoLink();

        return { ...result, addedTransactions: categorisedTransactions };
      },

      undoImport: async (batch: ImportBatch): Promise<void> => {
        await transactionsStore.hydrate();
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
  withHooks({
    onInit(store) {
      // Fire-and-forget on first `/import` injection instead of app bootstrap (TICKET-PERF-07).
      void store.hydrate();
    },
  }),
);
