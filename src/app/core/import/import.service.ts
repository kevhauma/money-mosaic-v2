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
  /**
   * Legacy transactions backfilled in place from a duplicate row in this import: `rawLine`/`rawRow`
   * are each filled in only when the existing transaction doesn't already have one, never
   * overwritten (TICKET-TXN-06). Shaped to feed `TransactionsStore.patchMany` directly.
   */
  backfilledTransactions: { id: number; changes: Pick<Transaction, 'rawLine' | 'rawRow'> }[];
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
): { accepted: T[]; duplicates: T[]; duplicateCount: number } => {
  const accepted: T[] = [];
  const duplicates: T[] = [];
  const occurrenceCounts = new Map<string, number>();
  for (const row of rows) {
    const occurrence = (occurrenceCounts.get(row.fingerprint) ?? 0) + 1;
    occurrenceCounts.set(row.fingerprint, occurrence);
    const key = `${row.fingerprint}|${occurrence}`;
    if (existingFingerprints.has(key)) {
      duplicates.push({ ...row, fingerprint: key });
    } else {
      accepted.push({ ...row, fingerprint: key });
    }
  }
  return { accepted, duplicates, duplicateCount: duplicates.length };
};

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly importBatchesRepository = inject(ImportBatchesRepository);
  private readonly transferCleanupService = inject(TransferCleanupService);

  commitImport = async (input: CommitImportInput): Promise<CommitImportResult> => {
    const existingTransactions = await this.transactionsRepository.getByAccount(input.accountId);
    const existingByFingerprint = new Map(
      existingTransactions.map((transaction) => [transaction.fingerprint, transaction]),
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

    const { accepted, duplicates, duplicateCount } = partitionByFingerprint(
      candidates,
      new Set(existingByFingerprint.keys()),
    );

    // A duplicate row against a legacy transaction backfills whichever of rawLine/rawRow it's
    // missing, in place, instead of just being dropped — the only backfill mechanism for existing
    // data (TICKET-TXN-06). Each field is only ever filled in, never overwritten.
    const backfillUpdates = duplicates
      .map(({ row, fingerprint }) => {
        const existing = existingByFingerprint.get(fingerprint);
        if (!existing?.id) return null;
        const changes: Pick<Transaction, 'rawLine' | 'rawRow'> = {};
        if (!existing.rawLine && row.transaction.rawLine) changes.rawLine = row.transaction.rawLine;
        if (!existing.rawRow && row.transaction.rawRow) changes.rawRow = row.transaction.rawRow;
        if (Object.keys(changes).length === 0) return null;
        return { id: existing.id, changes };
      })
      .filter(
        (update): update is { id: number; changes: Pick<Transaction, 'rawLine' | 'rawRow'> } =>
          update !== null,
      );

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

      if (backfillUpdates.length > 0) {
        await this.transactionsRepository.bulkUpdate(backfillUpdates);
      }

      const batch = await this.importBatchesRepository.getById(batchId);
      if (!batch) throw new Error('Import batch failed to persist');

      return { batch, addedTransactions, duplicateCount, backfilledTransactions: backfillUpdates };
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
