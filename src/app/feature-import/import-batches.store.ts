import { Injectable, inject, signal } from '@angular/core';
import { ImportBatchesRepository, type ImportBatch } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
import { ImportService, type CommitImportInput, type CommitImportResult } from '@/core/import';
import { RulesEngineService } from '@/core/categorisation';

@Injectable({ providedIn: 'root' })
export class ImportBatchesStore {
  private readonly importBatchesRepository = inject(ImportBatchesRepository);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly importService = inject(ImportService);
  private readonly rulesEngineService = inject(RulesEngineService);

  private readonly batchesSignal = signal<ImportBatch[]>([]);
  readonly batches = this.batchesSignal.asReadonly();

  hydrate = async (): Promise<void> => {
    this.batchesSignal.set(await this.importBatchesRepository.getAll());
  };

  /** Runs the rules engine over freshly imported rows before they land in the store, so they show up already categorised (FR-CAT-3). */
  commitImport = async (input: CommitImportInput): Promise<CommitImportResult> => {
    const result = await this.importService.commitImport(input);

    const updates = await this.rulesEngineService.runAndPersist(result.addedTransactions);
    const categoryIdById = new Map(updates.map((update) => [update.id, update.categoryId]));
    const categorisedTransactions = result.addedTransactions.map((transaction) =>
      categoryIdById.has(transaction.id!)
        ? { ...transaction, categoryId: categoryIdById.get(transaction.id!) }
        : transaction,
    );

    this.batchesSignal.update((batches) => [...batches, result.batch]);
    this.transactionsStore.addMany(categorisedTransactions);
    return { ...result, addedTransactions: categorisedTransactions };
  };

  undoImport = async (batch: ImportBatch): Promise<void> => {
    const transactionIds = this.transactionsStore
      .transactions()
      .filter((transaction) => transaction.importBatchId === batch.id)
      .map((transaction) => transaction.id!);

    await this.importService.undoImport(batch.id!);

    this.batchesSignal.update((batches) => batches.filter((b) => b.id !== batch.id));
    this.transactionsStore.removeMany(transactionIds);
  };
}
