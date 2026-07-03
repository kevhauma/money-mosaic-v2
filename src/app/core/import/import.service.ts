import { Injectable, inject } from '@angular/core';
import { computeFingerprint } from '@/shared/utils';
import {
  appDb,
  ImportBatchesRepository,
  TransactionsRepository,
  TransfersRepository,
  type ImportBatch,
  type Transaction,
} from '@/core/data-access';
import type { ParsedRowResult } from './csv-row-mapper';

type ValidParsedRow = Extract<ParsedRowResult, { valid: true }>;

export type CommitImportInput = {
  accountId: number;
  fileName: string;
  mappingProfileId: number;
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

export const partitionByFingerprint = <T extends { fingerprint: string }>(
  rows: T[],
  existingFingerprints: Set<string>,
): { accepted: T[]; duplicateCount: number } => {
  const accepted: T[] = [];
  let duplicateCount = 0;
  for (const row of rows) {
    if (existingFingerprints.has(row.fingerprint)) {
      duplicateCount++;
    } else {
      accepted.push(row);
    }
  }
  return { accepted, duplicateCount };
};

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly importBatchesRepository = inject(ImportBatchesRepository);
  private readonly transfersRepository = inject(TransfersRepository);

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

  undoImport = async (importBatchId: number): Promise<UndoImportResult> =>
    appDb.transaction(
      'rw',
      [appDb.transactions, appDb.importBatches, appDb.transfers],
      async () => {
        const transactions = await this.transactionsRepository.getByImportBatch(importBatchId);
        const removedIds = new Set(transactions.map((transaction) => transaction.id!));

        // A removed transaction may have been auto-linked to a transaction from a *different*
        // import (FR-TRF-2 re-links across the whole dataset) — clean up that Transfer record so
        // the surviving side doesn't keep a dangling transferId.
        const transferIds = [
          ...new Set(
            transactions
              .map((transaction) => transaction.transferId)
              .filter((transferId): transferId is number => transferId != null),
          ),
        ];
        const transfers = await this.transfersRepository.getByIds(transferIds);
        const clearedTransferTransactionIds: number[] = [];
        for (const transfer of transfers) {
          await this.transfersRepository.remove(transfer.id!);
          const survivingId = removedIds.has(transfer.fromTransactionId)
            ? transfer.toTransactionId
            : transfer.fromTransactionId;
          if (!removedIds.has(survivingId)) {
            await this.transactionsRepository.update(survivingId, { transferId: undefined });
            clearedTransferTransactionIds.push(survivingId);
          }
        }

        await this.transactionsRepository.bulkRemove([...removedIds]);
        await this.importBatchesRepository.remove(importBatchId);

        return {
          unlinkedTransferIds: transfers.map((transfer) => transfer.id!),
          clearedTransferTransactionIds,
        };
      },
    );
}
