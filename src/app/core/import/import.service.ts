import { Injectable, inject } from '@angular/core';
import { computeFingerprint } from '@/shared/utils';
import {
  ApiClient,
  TransactionsRepository,
  type ImportBatch,
  type Transaction,
} from '@/core/data-access';
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

/**
 * What undoing a batch would cost, read before the user confirms it (TICKET-IMP-13).
 *
 * Undo is a **hard delete** of the rows the batch created, so the two figures beyond the row count
 * are the ones the user cannot get back by re-importing the same file: work they did *after* the
 * import. Re-importing restores the rows; it does not restore the category you set on one by hand,
 * and it does not restore a transfer link you made.
 */
export type UndoImportImpact = {
  /** Transactions this batch created and undo would remove. Zero for a batch already undone. */
  rowCount: number;
  /** Of those, how many carry a hand-set category (`categoryManual`) that the delete takes with them. */
  manuallyCategorisedCount: number;
  /** Of those, how many are one leg of a linked transfer — each unlinks its counterpart. */
  transferLinkedCount: number;
};

export type UndoImportResult = {
  /** Transfer records removed because one side belonged to the undone import. */
  unlinkedTransferIds: number[];
  /** Surviving (not-removed) transactions whose transferId was cleared as a result. */
  clearedTransferTransactionIds: number[];
};

/** What `POST /api/import/commit` answers with — `CommitImportResult` minus the backfill echo. */
type CommitImportResponse = Pick<
  CommitImportResult,
  'batch' | 'addedTransactions' | 'duplicateCount'
>;

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
  private readonly api = inject(ApiClient);

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

    // The batch, its rows and the backfill patches are **one** request and one SQLite transaction
    // (TICKET-SRV-04): split across calls, the gap between them is where a dropped connection leaves
    // transactions pointing at a batch that was never written. The rows go without an
    // `importBatchId` — the endpoint assigns it from the batch it has just created, and hands them
    // back carrying it.
    const committed = await this.api.post<CommitImportResponse>('/import/commit', {
      batch: {
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
      },
      transactions: accepted.map(({ row, fingerprint }) => ({
        ...row.transaction,
        accountId: input.accountId,
        fingerprint,
        createdAt,
      })),
      backfill: backfillUpdates,
    });

    return {
      batch: committed.batch,
      addedTransactions: committed.addedTransactions,
      duplicateCount: committed.duplicateCount,
      // The locally-computed patches rather than the endpoint's echo of them: they are the same
      // `{ id, changes }` objects, and this side of them carries the `Pick<Transaction, 'rawLine' |
      // 'rawRow'>` type that `TransactionsStore.patchMany` is typed against.
      backfilledTransactions: backfillUpdates,
    };
  };

  /**
   * What `undoImport` would do to this batch, without doing it (TICKET-IMP-13) — so the confirm
   * dialog can state the cost rather than asking the user to guess it.
   *
   * Read-only, and reads the same rows the undo will delete: one user-scoped query serves both
   * endpoints server-side, so the count shown and the count removed cannot disagree.
   *
   * A batch that has already been undone reports zero of everything, which is what makes a second
   * undo a stated no-op instead of a surprise.
   */
  previewUndo = (importBatchId: number): Promise<UndoImportImpact> =>
    this.api.get<UndoImportImpact>(`/import/${importBatchId}/undo-preview`);

  // A removed transaction may have been auto-linked to a transaction from a *different* import
  // (FR-TRF-2 re-links across the whole dataset) — the shared cleanup handles that surviving side.
  undoImport = (importBatchId: number): Promise<UndoImportResult> =>
    this.api.post<UndoImportResult>(`/import/${importBatchId}/undo`, {});
}
