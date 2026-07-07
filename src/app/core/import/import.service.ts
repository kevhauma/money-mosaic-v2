import { Injectable, inject } from '@angular/core';
import { computeFingerprint } from '@/shared/utils';
import {
  appDb,
  ImportBatchesRepository,
  TransactionsRepository,
  type ImportBatch,
  type Transaction,
} from '@/core/data-access';
import { TransferCleanupService } from '@/core/transfers';
import type { ParsedRowResult } from './csv-row-mapper';

type ValidParsedRow = Extract<ParsedRowResult, { valid: true }>;

export type CommitImportInput = {
  accountId: number;
  fileName: string;
  mappingProfileId?: number;
  totalRowsRead: number;
  validRows: ValidParsedRow[];
};

export type CommitImportResult = {
  batch: ImportBatch;
  addedTransactions: Transaction[];
  duplicateCount: number;
};

export type UndoImportResult = {
  /** Transfer records removed because one side belonged to the undone import. */
  unlinkedTransferIds: number[];
  /** Surviving (not-removed) transactions whose transferId was cleared as a result. */
  clearedTransferTransactionIds: number[];
};

/**
 * Partitions candidate rows into accepted vs. duplicates against the account's stored fingerprints.
 *
 * Each accepted row is keyed by `<baseFingerprint>|<occurrence>`, where occurrence is the 1-based
 * count of that base fingerprint *within this batch* (CR-1.2). This keeps two genuinely-identical
 * same-day rows (FR-IMP-6) while making dedupe stable across re-imports in both directions: the
 * stored keys are `key|1..key|n`, so re-importing a file with the same rows drops exactly the
 * already-seen occurrences and accepts only any additional ones. The occurrence-qualified key is
 * written back onto the accepted row's `fingerprint` so it lands in the DB and matches next time.
 */
export const partitionByFingerprint = <T extends { fingerprint: string }>(
  rows: T[],
  existingFingerprints: Set<string>,
): { accepted: T[]; duplicateCount: number } => {
  const accepted: T[] = [];
  const occurrenceCounts = new Map<string, number>();
  let duplicateCount = 0;
  for (const row of rows) {
    const occurrence = (occurrenceCounts.get(row.fingerprint) ?? 0) + 1;
    occurrenceCounts.set(row.fingerprint, occurrence);
    const key = `${row.fingerprint}|${occurrence}`;
    if (existingFingerprints.has(key)) {
      duplicateCount++;
    } else {
      accepted.push({ ...row, fingerprint: key });
    }
  }
  return { accepted, duplicateCount };
};

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly importBatchesRepository = inject(ImportBatchesRepository);
  private readonly transferCleanupService = inject(TransferCleanupService);

  commitImport = async (input: CommitImportInput): Promise<CommitImportResult> => {
    const existingFingerprints = await this.transactionsRepository.getFingerprintsByAccount(
      input.accountId,
    );

    const candidates = input.validRows.map((row) => ({
      row,
      fingerprint: computeFingerprint({
        accountId: input.accountId,
        bookingDate: row.transaction.bookingDate,
        amount: row.transaction.amount,
        description: row.transaction.rawDescription,
        counterpartyIban: row.transaction.counterpartyIban,
      }),
    }));

    const { accepted, duplicateCount } = partitionByFingerprint(candidates, existingFingerprints);

    const bookingDates = input.validRows.map((row) => row.transaction.bookingDate).sort();
    const createdAt = new Date().toISOString();
    const dateFrom = bookingDates[0] ?? createdAt.slice(0, 10);
    const dateTo = bookingDates[bookingDates.length - 1] ?? createdAt.slice(0, 10);

    return appDb.transaction('rw', [appDb.transactions, appDb.importBatches], async () => {
      const batchId = await this.importBatchesRepository.add({
        accountId: input.accountId,
        fileName: input.fileName,
        mappingProfileId: input.mappingProfileId,
        importedAt: createdAt,
        rowsRead: input.totalRowsRead,
        rowsAdded: accepted.length,
        rowsDuplicate: duplicateCount,
        dateFrom,
        dateTo,
      });

      const transactionsToAdd: Transaction[] = accepted.map(({ row, fingerprint }) => ({
        ...row.transaction,
        accountId: input.accountId,
        importBatchId: batchId,
        fingerprint,
        createdAt,
      }));

      const ids = await this.transactionsRepository.bulkAdd(transactionsToAdd);
      const addedTransactions = transactionsToAdd.map((transaction, index) => ({
        ...transaction,
        id: ids[index],
      }));

      const batch = await this.importBatchesRepository.getById(batchId);
      if (!batch) throw new Error('Import batch failed to persist');

      return { batch, addedTransactions, duplicateCount };
    });
  };

  // A removed transaction may have been auto-linked to a transaction from a *different* import
  // (FR-TRF-2 re-links across the whole dataset) — the shared cleanup handles that surviving side.
  undoImport = async (importBatchId: number): Promise<UndoImportResult> =>
    appDb.transaction(
      'rw',
      [appDb.transactions, appDb.importBatches, appDb.transfers],
      async () => {
        const transactions = await this.transactionsRepository.getByImportBatch(importBatchId);
        const removedIds = transactions.map((transaction) => transaction.id!);

        const { unlinkedTransferIds, clearedTransferTransactionIds } =
          await this.transferCleanupService.cleanupTransfersForRemovedTransactions(transactions);

        await this.transactionsRepository.bulkRemove(removedIds);
        await this.importBatchesRepository.remove(importBatchId);

        return { unlinkedTransferIds, clearedTransferTransactionIds };
      },
    );
}
