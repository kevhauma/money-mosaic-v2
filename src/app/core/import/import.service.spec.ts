import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TransactionsRepository, type ImportBatch, type Transaction } from '@/core/data-access';
import { untilRequested } from '@/core/data-access/api-client.testing';
import type { ParsedRowResult } from './csv-row-mapper';
import {
  ImportService,
  partitionByFingerprint,
  type CommitImportInput,
  type CommitImportResult,
} from './import.service';

type ValidParsedRow = Extract<ParsedRowResult, { valid: true }>;

const validRow = (overrides: Partial<ValidParsedRow['transaction']> = {}): ValidParsedRow => ({
  rowIndex: 0,
  valid: true,
  transaction: {
    bookingDate: '2026-07-01',
    amount: -10,
    currency: 'EUR',
    rawDescription: 'Carrefour Market',
    ...overrides,
  },
});

/** What the commit endpoint receives — the batch, the accepted rows, and the backfill patches. */
type CommitBody = {
  batch: ImportBatch;
  transactions: Transaction[];
  backfill: { id: number; changes: Partial<Transaction> }[];
};

/** The providers every describe here needs: the real service, a stubbed read, a fake backend. */
const importProviders = (transactionsRepository: unknown): unknown[] => [
  ImportService,
  { provide: TransactionsRepository, useValue: transactionsRepository },
  provideHttpClient(),
  provideHttpClientTesting(),
];

/**
 * Commits, answering `POST /api/import/commit` the way the endpoint does — the batch with an id, the
 * rows carrying it — and hands back **what was sent**, which is where the client's remaining half of
 * the import now lives: the dedupe partition, the batch counts and TICKET-TXN-06's backfill patches.
 */
const commitAgainstApi = async (
  service: ImportService,
  input: CommitImportInput,
): Promise<{ sent: CommitBody; result: CommitImportResult }> => {
  const settled = service.commitImport(input);
  // The commit reads the account's existing rows before it posts, so the request is one turn away.
  await untilRequested();
  const request = TestBed.inject(HttpTestingController).expectOne('/api/import/commit');
  const sent = request.request.body as CommitBody;

  request.flush({
    batch: { ...sent.batch, id: 1 },
    addedTransactions: sent.transactions.map((row, index) => ({
      ...row,
      id: index + 100,
      importBatchId: 1,
    })),
    duplicateCount: sent.batch.rowsDuplicate,
  });

  return { sent, result: await settled };
};

describe('ImportService: undoImport', () => {
  const setup = (): ImportService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: importProviders({}) });
    return TestBed.inject(ImportService);
  };

  /** Answers `POST /api/import/:batchId/undo` with the cleanup report the endpoint produces. */
  const undoAgainstApi = async (
    service: ImportService,
    batchId: number,
    report: { unlinkedTransferIds: number[]; clearedTransferTransactionIds: number[] },
  ): Promise<unknown> => {
    const settled = service.undoImport(batchId);
    const request = TestBed.inject(HttpTestingController).expectOne(`/api/import/${batchId}/undo`);

    expect(request.request.method).toBe('POST');
    request.flush(report);

    return settled;
  };

  /**
   * The undo deletes the batch's transactions, the transfers that linked them and the batch row —
   * three tables, one transaction, so it is one endpoint (TICKET-SRV-04) rather than a sequence of
   * repository calls this service orchestrates. What is asserted here is that it calls that endpoint
   * for the batch it was given.
   */
  it('undoes the batch through its own endpoint, in one request', async () => {
    await undoAgainstApi(setup(), 99, {
      unlinkedTransferIds: [],
      clearedTransferTransactionIds: [],
    });
  });

  /**
   * A removed transaction may have been auto-linked to one from a *different* import (FR-TRF-2 links
   * across the whole dataset), so the surviving leg is un-linked rather than left dangling. That
   * cleanup is the endpoint's — `server/src/operations/transfer-cleanup.ts`, where the ported specs
   * cover it — and what this service owes its callers is the report, forwarded verbatim, because
   * `TransfersStore` and `TransactionsStore` mirror it.
   */
  it('forwards the cross-import cleanup report verbatim, for the stores to mirror', async () => {
    const result = await undoAgainstApi(setup(), 99, {
      unlinkedTransferIds: [5],
      clearedTransferTransactionIds: [20],
    });

    expect(result).toEqual({ unlinkedTransferIds: [5], clearedTransferTransactionIds: [20] });
  });
});

describe('ImportService: commitImport rawLine/rawRow handling (TICKET-TXN-06)', () => {
  const setup = (existingTransactions: Transaction[]): ImportService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: importProviders({
        getByAccount: vi.fn().mockResolvedValue(existingTransactions),
      }),
    });

    return TestBed.inject(ImportService);
  };

  const baseInput = (validRows: ValidParsedRow[]): CommitImportInput => ({
    accountId: 1,
    fileName: 'test.csv',
    totalRowsRead: validRows.length,
    validRows,
  });

  const fingerprintFor = async (row: ValidParsedRow): Promise<string> => {
    const { computeFingerprint } = await import('@/shared/utils');
    return `${computeFingerprint({
      accountId: 1,
      bookingDate: row.transaction.bookingDate,
      amount: row.transaction.amount,
      description: row.transaction.rawDescription,
      counterpartyIban: row.transaction.counterpartyIban,
    })}|1`;
  };

  it('persists rawLine and rawRow onto every newly-added transaction', async () => {
    const service = setup([]);

    const { sent } = await commitAgainstApi(
      service,
      baseInput([
        validRow({
          rawLine: '01/07/2026;-10,00;Carrefour Market',
          rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
        }),
      ]),
    );

    expect(sent.transactions).toEqual([
      expect.objectContaining({
        rawLine: '01/07/2026;-10,00;Carrefour Market',
        rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
      }),
    ]);
  });

  // The rows go **without** an `importBatchId`: the endpoint assigns it from the batch it has just
  // created in the same transaction, and a row that arrived carrying one would be naming another.
  it('leaves the batch id to the endpoint that creates the batch', async () => {
    const service = setup([]);

    const { sent, result } = await commitAgainstApi(service, baseInput([validRow()]));

    expect(sent.transactions[0]).not.toHaveProperty('importBatchId');
    expect(result.addedTransactions[0].importBatchId).toBe(1);
  });

  it('backfills rawLine and rawRow onto a legacy duplicate transaction that has neither yet', async () => {
    const row = validRow({
      rawLine: '01/07/2026;-10,00;Carrefour Market',
      rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
    });
    const legacy: Transaction = {
      id: 42,
      accountId: 1,
      bookingDate: '2026-07-01',
      amount: -10,
      currency: 'EUR',
      rawDescription: 'Carrefour Market',
      fingerprint: await fingerprintFor(row),
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    const service = setup([legacy]);

    const { sent, result } = await commitAgainstApi(service, baseInput([row]));

    expect(sent.transactions).toEqual([]);
    const expectedChanges = {
      id: 42,
      changes: {
        rawLine: '01/07/2026;-10,00;Carrefour Market',
        rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
      },
    };
    expect(sent.backfill).toEqual([expectedChanges]);
    expect(result.backfilledTransactions).toEqual([expectedChanges]);
  });

  it('backfills only the field a legacy transaction is missing, leaving the other alone', async () => {
    const row = validRow({
      rawLine: 'new candidate line',
      rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
    });
    const legacy: Transaction = {
      id: 42,
      accountId: 1,
      bookingDate: '2026-07-01',
      amount: -10,
      currency: 'EUR',
      rawDescription: 'Carrefour Market',
      rawLine: 'already had one', // must be left untouched
      fingerprint: await fingerprintFor(row),
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    const service = setup([legacy]);

    const { sent, result } = await commitAgainstApi(service, baseInput([row]));

    const expectedChanges = {
      id: 42,
      changes: { rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' } },
    };
    expect(sent.backfill).toEqual([expectedChanges]);
    expect(result.backfilledTransactions).toEqual([expectedChanges]);
  });

  it('never touches a legacy transaction that already has both rawLine and rawRow', async () => {
    const row = validRow({
      rawLine: 'new candidate line',
      rawRow: { Date: '01/07/2026' },
    });
    const legacy: Transaction = {
      id: 42,
      accountId: 1,
      bookingDate: '2026-07-01',
      amount: -10,
      currency: 'EUR',
      rawDescription: 'Carrefour Market',
      rawLine: 'already had one',
      rawRow: { Date: 'already had one too' },
      fingerprint: await fingerprintFor(row),
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    const service = setup([legacy]);

    const { sent, result } = await commitAgainstApi(service, baseInput([row]));

    expect(sent.backfill).toEqual([]);
    expect(result.backfilledTransactions).toEqual([]);
  });
});

describe('partitionByFingerprint: dedupe partitioning', () => {
  it('skips a row whose (occurrence-keyed) fingerprint already exists in the account history', () => {
    const rows = [{ fingerprint: 'aaa' }, { fingerprint: 'bbb' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['aaa|1']));
    expect(accepted).toEqual([{ fingerprint: 'bbb|1' }]);
    expect(duplicateCount).toBe(1);
  });

  it('keeps two identical in-batch rows when neither is pre-existing, keyed by occurrence (FR-IMP-6)', () => {
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set());
    expect(accepted).toEqual([{ fingerprint: 'same|1' }, { fingerprint: 'same|2' }]);
    expect(duplicateCount).toBe(0);
  });

  it('correctly partitions a mixed batch of pre-existing dupes, new rows, and in-batch repeats', () => {
    const rows = [
      { fingerprint: 'existing' },
      { fingerprint: 'new-1' },
      { fingerprint: 'repeat' },
      { fingerprint: 'repeat' },
    ];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['existing|1']));
    expect(accepted).toEqual([
      { fingerprint: 'new-1|1' },
      { fingerprint: 'repeat|1' },
      { fingerprint: 'repeat|2' },
    ]);
    expect(duplicateCount).toBe(1);
  });

  it('is idempotent: re-importing an identical file adds nothing (CR-1.2)', () => {
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(
      rows,
      new Set(['same|1', 'same|2']),
    );
    expect(accepted).toEqual([]);
    expect(duplicateCount).toBe(2);
  });

  it('keeps a genuinely new n-th occurrence when an overlapping file re-imports earlier ones (CR-1.2)', () => {
    // One occurrence already stored; a later file carries two identical rows — the first matches the
    // stored occurrence and is dropped, the second is a legitimate new same-day transaction.
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['same|1']));
    expect(accepted).toEqual([{ fingerprint: 'same|2' }]);
    expect(duplicateCount).toBe(1);
  });

  // CR-9/TICKET-TEST-02: the occurrence-keyed dedupe has exactly two directions worth naming
  // explicitly — same-fingerprint-twice-in-one-file, and re-import of an overlapping export. Both
  // are already exercised above under other names; these pin the two directions by name.
  it('direction 1 — same fingerprint twice in one file: both occurrences are accepted when neither is pre-existing', () => {
    const rows = [{ fingerprint: 'dup' }, { fingerprint: 'dup' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set());
    expect(accepted).toEqual([{ fingerprint: 'dup|1' }, { fingerprint: 'dup|2' }]);
    expect(duplicateCount).toBe(0);
  });

  it('direction 2 — re-import of an overlapping export: only the occurrences already stored are dropped, later ones in the same file are accepted', () => {
    const rows = [{ fingerprint: 'dup' }, { fingerprint: 'dup' }, { fingerprint: 'dup' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['dup|1', 'dup|2']));
    expect(accepted).toEqual([{ fingerprint: 'dup|3' }]);
    expect(duplicateCount).toBe(2);
  });
});

/**
 * TICKET-IMP-14 — the wizard now says how many incoming rows are new and how many the app already
 * has, and the user chooses what happens to the duplicates. Both halves partition with the same
 * function, so these cover the preview's counts and the two commit modes together.
 */
describe('ImportService: duplicate preview and handling (TICKET-IMP-14)', () => {
  const setup = (existingTransactions: Transaction[]) => {
    // Several of these cases commit once to seed "already there", then re-configure with what was
    // stored — two TestBeds in one test, which needs the first torn down first.
    TestBed.resetTestingModule();
    const transactionsRepository = {
      getByAccount: vi.fn().mockResolvedValue(existingTransactions),
    };

    TestBed.configureTestingModule({ providers: importProviders(transactionsRepository) });

    return { service: TestBed.inject(ImportService), transactionsRepository };
  };

  const row = (overrides: Partial<Transaction> = {}): ValidParsedRow =>
    ({
      valid: true,
      transaction: {
        bookingDate: '2026-06-01',
        amount: -10,
        currency: 'EUR',
        rawDescription: 'Coffee',
        ...overrides,
      },
    }) as ValidParsedRow;

  /** Commits the given rows once and hands back what was stored, to seed "already there". */
  const commitFirst = async (rows: ValidParsedRow[]): Promise<Transaction[]> => {
    const { service } = setup([]);
    const { result } = await commitAgainstApi(service, {
      accountId: 1,
      fileName: 'first.csv',
      totalRowsRead: rows.length,
      validRows: rows,
    });
    return result.addedTransactions;
  };

  it('reports an all-new file as zero duplicates', async () => {
    const { service } = setup([]);

    const preview = await service.previewImport(1, [row(), row({ amount: -20 })]);

    expect(preview.duplicateRows).toEqual([]);
    expect(preview.newRows).toHaveLength(2);
  });

  it('reports every row of a fully-overlapping file as already present', async () => {
    const rows = [row(), row({ amount: -20 })];
    const stored = await commitFirst(rows);
    const { service } = setup(stored);

    const preview = await service.previewImport(1, rows);

    expect(preview.newRows).toEqual([]);
    expect(preview.duplicateRows).toHaveLength(2);
  });

  it('splits a partially-overlapping file, keeping file order on both sides', async () => {
    const stored = await commitFirst([row(), row({ amount: -20 })]);
    const { service } = setup(stored);

    const preview = await service.previewImport(1, [
      row(),
      row({ amount: -30, rawDescription: 'New one' }),
      row({ amount: -20 }),
    ]);

    expect(preview.duplicateRows).toHaveLength(2);
    expect(preview.newRows).toHaveLength(1);
    expect(preview.newRows[0].transaction.rawDescription).toBe('New one');
  });

  it('touches the database not at all for a file whose account does not exist yet', async () => {
    const { service, transactionsRepository } = setup([]);

    const preview = await service.previewImport(-1, [row()]);

    expect(transactionsRepository.getByAccount).not.toHaveBeenCalled();
    expect(preview.newRows).toHaveLength(1);
    expect(preview.duplicateRows).toEqual([]);
  });

  it('skip (the default) imports exactly the new rows and leaves the existing ones untouched', async () => {
    const stored = await commitFirst([row(), row({ amount: -20 })]);
    const { service } = setup(stored);

    const { sent, result } = await commitAgainstApi(service, {
      accountId: 1,
      fileName: 'second.csv',
      totalRowsRead: 3,
      validRows: [row(), row({ amount: -30, rawDescription: 'New one' }), row({ amount: -20 })],
    });

    expect(result.addedTransactions).toHaveLength(1);
    expect(result.addedTransactions[0].rawDescription).toBe('New one');
    expect(result.duplicateCount).toBe(2);
    // Nothing about an existing row is rewritten — no category, no categoryManual, no transferId.
    // The only patch this path can ever send is TICKET-TXN-06's rawLine/rawRow backfill, and these
    // rows carry neither, so it sends none at all.
    expect(sent.backfill).toEqual([]);
    expect(sent.batch).toEqual(expect.objectContaining({ rowsAdded: 1, rowsDuplicate: 2 }));
  });

  it('import-anyway admits every row, on fingerprints that do not collide with the stored ones', async () => {
    const stored = await commitFirst([row(), row({ amount: -20 })]);
    const { service } = setup(stored);

    const { sent, result } = await commitAgainstApi(service, {
      accountId: 1,
      fileName: 'second.csv',
      totalRowsRead: 2,
      validRows: [row(), row({ amount: -20 })],
      duplicateHandling: 'import',
    });

    expect(result.addedTransactions).toHaveLength(2);
    expect(result.duplicateCount).toBe(0);
    const storedKeys = new Set(stored.map((transaction) => transaction.fingerprint));
    for (const added of result.addedTransactions) {
      expect(storedKeys.has(added.fingerprint)).toBe(false);
    }
    expect(sent.backfill).toEqual([]);
  });

  it('records the knowingly re-imported rows on the batch, so the audit stays honest', async () => {
    const stored = await commitFirst([row(), row({ amount: -20 })]);
    const { service } = setup(stored);

    const { sent } = await commitAgainstApi(service, {
      accountId: 1,
      fileName: 'second.csv',
      totalRowsRead: 2,
      validRows: [row(), row({ amount: -20 })],
      duplicateHandling: 'import',
    });

    // rowsDuplicate stays "not added", so rowsRead = rowsAdded + rowsDuplicate still holds; the
    // recognised-but-added rows get their own figure, or a batch of 2 knowingly re-imported rows
    // would look exactly like a batch of 2 genuinely new ones.
    expect(sent.batch).toEqual(
      expect.objectContaining({ rowsAdded: 2, rowsDuplicate: 0, rowsDuplicateImported: 2 }),
    );
  });

  // Absent, not zero — and `null` on the wire, which is how `ApiClient` says "no value" for a field
  // a JSON body would otherwise drop entirely.
  it('leaves the field off a batch where nothing was re-imported', async () => {
    const { service } = setup([]);

    const { sent } = await commitAgainstApi(service, {
      accountId: 1,
      fileName: 'first.csv',
      totalRowsRead: 1,
      validRows: [row()],
    });

    expect(sent.batch.rowsDuplicateImported).toBeNull();
  });

  it('counts a second file overlapping the first, once the first has been committed', async () => {
    // The wizard commits file by file, so by the time file 2 is scanned file 1 is in the account —
    // which is what makes overlap *within* an incoming batch of exports show up here at all.
    const stored = await commitFirst([row(), row({ amount: -20 })]);
    const { service } = setup(stored);

    const preview = await service.previewImport(1, [
      row({ amount: -20 }),
      row({ amount: -40, rawDescription: 'Only in file two' }),
    ]);

    expect(preview.duplicateRows).toHaveLength(1);
    expect(preview.newRows).toHaveLength(1);
    expect(preview.newRows[0].transaction.rawDescription).toBe('Only in file two');
  });
});

describe('partitionByFingerprint: import-anyway mode (TICKET-IMP-14)', () => {
  it('walks past every stored occurrence rather than dropping the row', () => {
    const rows = [{ fingerprint: 'dup' }, { fingerprint: 'dup' }];

    const { accepted, duplicates, duplicateCount } = partitionByFingerprint(
      rows,
      new Set(['dup|1', 'dup|2']),
      'import',
    );

    expect(accepted).toEqual([{ fingerprint: 'dup|3' }, { fingerprint: 'dup|4' }]);
    expect(duplicates).toEqual([]);
    expect(duplicateCount).toBe(0);
  });

  it('leaves a genuinely new row on its first occurrence', () => {
    const { accepted } = partitionByFingerprint([{ fingerprint: 'fresh' }], new Set(), 'import');

    expect(accepted).toEqual([{ fingerprint: 'fresh|1' }]);
  });

  it('defaults to skip when no handling is passed, so every existing caller is unchanged', () => {
    const { accepted, duplicateCount } = partitionByFingerprint(
      [{ fingerprint: 'dup' }],
      new Set(['dup|1']),
    );

    expect(accepted).toEqual([]);
    expect(duplicateCount).toBe(1);
  });
});

/**
 * TICKET-IMP-13 — the history's Undo asks what the undo would cost before it happens, so the
 * confirm dialog can state it. Same query as the undo itself, so the two cannot disagree.
 */
describe('ImportService: previewUndo (TICKET-IMP-13)', () => {
  const setup = (): ImportService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: importProviders({}) });
    return TestBed.inject(ImportService);
  };

  /** Answers `GET /api/import/:batchId/undo-preview` with the counts the endpoint reports. */
  const previewAgainstApi = async (
    service: ImportService,
    batchId: number,
    counts: { rowCount: number; manuallyCategorisedCount: number; transferLinkedCount: number },
  ) => {
    const settled = service.previewUndo(batchId);
    const request = TestBed.inject(HttpTestingController).expectOne(
      `/api/import/${batchId}/undo-preview`,
    );

    expect(request.request.method).toBe('GET');
    request.flush(counts);

    return settled;
  };

  /**
   * The counts are the endpoint's, read through the same query the undo deletes by — which is what
   * makes "the cost the dialog states" and "the rows the undo removes" impossible to disagree
   * (`server/src/routes/import.ts`, covered there). What this asserts is that the preview asks the
   * *batch it was given* about, read-only, and reports what it is told.
   */
  it('asks the preview endpoint about exactly the batch it was given', async () => {
    const impact = await previewAgainstApi(setup(), 99, {
      rowCount: 3,
      manuallyCategorisedCount: 2,
      transferLinkedCount: 1,
    });

    expect(impact).toEqual({
      rowCount: 3,
      manuallyCategorisedCount: 2,
      transferLinkedCount: 1,
    });
  });

  it('reports zero of everything for a batch that has already been undone', async () => {
    const impact = await previewAgainstApi(setup(), 99, {
      rowCount: 0,
      manuallyCategorisedCount: 0,
      transferLinkedCount: 0,
    });

    expect(impact).toEqual({
      rowCount: 0,
      manuallyCategorisedCount: 0,
      transferLinkedCount: 0,
    });
  });

  // Read-only: the preview must never write, so the one request it makes being a GET is the whole
  // property. `expectOne` above is what fails this if a second request appears.
  it('makes exactly one read and no write', async () => {
    const service = setup();

    await previewAgainstApi(service, 7, {
      rowCount: 1,
      manuallyCategorisedCount: 0,
      transferLinkedCount: 0,
    });

    TestBed.inject(HttpTestingController).verify();
  });
});
