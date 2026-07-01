import { Injectable, inject, signal } from '@angular/core';
import { ImportBatchesRepository, type ImportBatch } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
import { ImportService, type CommitImportInput, type CommitImportResult } from '@/core/import';

@Injectable({ providedIn: 'root' })
export class ImportBatchesStore {
  private readonly importBatchesRepository = inject(ImportBatchesRepository);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly importService = inject(ImportService);

  private readonly batchesSignal = signal<ImportBatch[]>([]);
  readonly batches = this.batchesSignal.asReadonly();

  hydrate = async (): Promise<void> => {
    this.batchesSignal.set(await this.importBatchesRepository.getAll());
  };

  commitImport = async (input: CommitImportInput): Promise<CommitImportResult> => {
    const result = await this.importService.commitImport(input);
    this.batchesSignal.update((batches) => [...batches, result.batch]);
    this.transactionsStore.addMany(result.addedTransactions);
    return result;
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
