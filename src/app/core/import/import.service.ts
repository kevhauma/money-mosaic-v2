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

/**
 * What to do with an incoming row that is already in the account (TICKET-IMP-14). `skip` is what
 * the importer has always done silently; `import` is the deliberate override, for the case where
 * the same movement really did happen twice and the fingerprint cannot tell.
 */
export type DuplicateHandling = 'skip' | 'import';

export type CommitImportInput = {
  accountId: number;
  fileName: string;
  mappingProfileId?: number;
  totalRowsRead: number;
  validRows: ValidParsedRow[];
  /** Defaults to `skip`, which is the behaviour every import had before TICKET-IMP-14. */
  duplicateHandling?: DuplicateHandling;
};

/** The same partition the commit will make, run ahead of it so the wizard can show it (TICKET-IMP-14). */
export type ImportDuplicatePreview = {
  /** Rows whose fingerprint is not yet in this account, in file order. */
  newRows: ValidParsedRow[];
  /** Rows already present, in file order — inspectable, not just counted. */
  duplicateRows: ValidParsedRow[];
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

const occurrenceKey = (fingerprint: string, occurrence: number): string =>
  `${fingerprint}|${occurrence}`;

/**
 * Partitions candidate rows into accepted vs. duplicates against the account's stored fingerprints.
 *
 * Each accepted row is keyed by `<baseFingerprint>|<occurrence>`, where occurrence is the 1-based
 * count of that base fingerprint *within this batch* (CR-1.2). This keeps two genuinely-identical
 * same-day rows (FR-IMP-6) while making dedupe stable across re-imports in both directions: the
 * stored keys are `key|1..key|n`, so re-importing a file with the same rows drops exactly the
 * already-seen occurrences and accepts only any additional ones. The occurrence-qualified key is
 * written back onto the accepted row's `fingerprint` so it lands in the DB and matches next time.
 *
 * `duplicateHandling` (TICKET-IMP-14) is what the user picked in the wizard. It is the *only* thing
 * that decides whether a recognised row is dropped or admitted — the notion of sameness itself is
 * the same fingerprint in both modes, so the counts the preview showed are the counts that happen.
 */
export const partitionByFingerprint = <T extends { fingerprint: string }>(
  rows: T[],
  existingFingerprints: Set<string>,
  duplicateHandling: DuplicateHandling = 'skip',
): {
  accepted: T[];
  duplicates: T[];
  duplicateCount: number;
  /** Rows the app recognised and admitted anyway — zero unless `duplicateHandling` is `import`. */
  recognisedAcceptedCount: number;
} => {
  const accepted: T[] = [];
  const duplicates: T[] = [];
  const occurrenceCounts = new Map<string, number>();
  let recognisedAcceptedCount = 0;
  for (const row of rows) {
    let occurrence = (occurrenceCounts.get(row.fingerprint) ?? 0) + 1;
    const recognised = existingFingerprints.has(occurrenceKey(row.fingerprint, occurrence));
    // Import-anyway (TICKET-IMP-14) walks past every occurrence already stored, so the row lands as
    // a genuinely new one instead of colliding with the row it duplicates. Skipping — the default —
    // leaves the counter where it is and drops the row, exactly as before. Either way the row was
    // *recognised*, and the batch records that so the two cases stay distinguishable afterwards.
    if (duplicateHandling === 'import') {
      while (existingFingerprints.has(occurrenceKey(row.fingerprint, occurrence))) occurrence += 1;
    }
    occurrenceCounts.set(row.fingerprint, occurrence);
    const key = occurrenceKey(row.fingerprint, occurrence);
    if (duplicateHandling === 'skip' && recognised) {
      duplicates.push({ ...row, fingerprint: key });
    } else {
      if (recognised) recognisedAcceptedCount += 1;
      accepted.push({ ...row, fingerprint: key });
    }
  }
  return {
    accepted,
    duplicates,
    duplicateCount: duplicates.length,
    recognisedAcceptedCount,
  };
};

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly importBatchesRepository = inject(ImportBatchesRepository);
  private readonly transferCleanupService = inject(TransferCleanupService);

  /** The rows paired with their base fingerprint — shared by the preview and the commit so the two
   * can never compute sameness differently (TICKET-IMP-14). */
  private fingerprintCandidates(accountId: number, validRows: ValidParsedRow[]) {
    return validRows.map((row) => ({
      row,
      fingerprint: computeFingerprint({
        accountId,
        bookingDate: row.transaction.bookingDate,
        amount: row.transaction.amount,
        description: row.transaction.rawDescription,
        counterpartyIban: row.transaction.counterpartyIban,
      }),
    }));
  }

  /**
   * Runs the commit's own partition without committing anything (TICKET-IMP-14), so the wizard can
   * say how many incoming rows are new and which ones already exist *before* the user commits.
   *
   * Read-only: one `getByAccount` and pure arithmetic. Always partitions in `skip` mode — the
   * question it answers is "which of these does the app already have", which does not depend on
   * what the user then chooses to do about them.
   *
   * A file mapped to an account that does not exist yet (a pending draft, `accountId <= 0`) has
   * nothing to be a duplicate of, and is reported wholly new without touching the database.
   */
  previewImport = async (
    accountId: number,
    validRows: ValidParsedRow[],
  ): Promise<ImportDuplicatePreview> => {
    if (accountId <= 0) return { newRows: [...validRows], duplicateRows: [] };

    const existingTransactions = await this.transactionsRepository.getByAccount(accountId);
    const { accepted, duplicates } = partitionByFingerprint(
      this.fingerprintCandidates(accountId, validRows),
      new Set(existingTransactions.map((transaction) => transaction.fingerprint)),
    );

    return {
      newRows: accepted.map(({ row }) => row),
      duplicateRows: duplicates.map(({ row }) => row),
    };
  };

  commitImport = async (input: CommitImportInput): Promise<CommitImportResult> => {
    const existingTransactions = await this.transactionsRepository.getByAccount(input.accountId);
    const existingByFingerprint = new Map(
      existingTransactions.map((transaction) => [transaction.fingerprint, transaction]),
    );

    const candidates = this.fingerprintCandidates(input.accountId, input.validRows);

    const { accepted, duplicates, duplicateCount, recognisedAcceptedCount } =
      partitionByFingerprint(
        candidates,
        new Set(existingByFingerprint.keys()),
        input.duplicateHandling ?? 'skip',
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
        rowsDuplicateImported: recognisedAcceptedCount || undefined,
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

        const { unlinkedTransferIds, clearedTransferTransactionIds } =
          await this.transferCleanupService.removeTransactionsWithTransferCleanup(transactions);

        await this.importBatchesRepository.remove(importBatchId);

        return { unlinkedTransferIds, clearedTransferTransactionIds };
      },
    );
}
