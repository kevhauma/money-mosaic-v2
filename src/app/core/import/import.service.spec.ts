import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  appDb,
  ImportBatchesRepository,
  TransactionsRepository,
  TransfersRepository,
  type ImportBatch,
  type Transaction,
} from '@/core/data-access';
import { TransferCleanupService } from '@/core/transfers';
import type { ParsedRowResult } from './csv-row-mapper';
import { ImportService, partitionByFingerprint, type CommitImportInput } from './import.service';

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

describe('ImportService: undoImport', () => {
  // The undo runs inside `appDb.transaction('rw', ...)`; stub it to synchronously invoke the scope
  // so we exercise the repository calls without a real IndexedDB.
  beforeEach(() => {
    vi.spyOn(appDb, 'transaction').mockImplementation(((...args: unknown[]) =>
      (args[args.length - 1] as () => unknown)()) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = (transactions: Partial<Transaction>[]) => {
    const transactionsRepository = {
      getByImportBatch: vi.fn().mockResolvedValue(transactions),
      bulkRemove: vi.fn().mockResolvedValue(undefined),
    };
    const importBatchesRepository = {
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const transferCleanupService = {
      removeTransactionsWithTransferCleanup: vi.fn().mockResolvedValue({
        removedTransactionIds: transactions.map((transaction) => transaction.id!),
        unlinkedTransferIds: [5],
        clearedTransferTransactionIds: [20],
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ImportService,
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: TransferCleanupService, useValue: transferCleanupService },
      ],
    });

    return {
      service: TestBed.inject(ImportService),
      transactionsRepository,
      importBatchesRepository,
      transferCleanupService,
    };
  };

  it('delegates the cross-import transfer cleanup to TransferCleanupService and removes the batch', async () => {
    // One of the removed transactions was auto-linked to a transaction from a *different* import
    // batch (FR-TRF-2 links across the whole dataset) — the shared cleanup handles that surviving side.
    const transactions = [{ id: 10, transferId: 5 }, { id: 11 }];
    const ctx = setup(transactions);

    const result = await ctx.service.undoImport(99);

    expect(ctx.transferCleanupService.removeTransactionsWithTransferCleanup).toHaveBeenCalledWith(
      transactions,
    );
    expect(ctx.importBatchesRepository.remove).toHaveBeenCalledWith(99);
    expect(result).toEqual({ unlinkedTransferIds: [5], clearedTransferTransactionIds: [20] });
  });

  it('undoImport unlinks a transfer whose other leg belongs to a different import batch', async () => {
    // Batch 99's transaction (id 10) was auto-linked to transaction 20, which was imported in a
    // different batch entirely — wired with the *real* TransferCleanupService (not a stub) so this
    // test proves the surviving leg is actually found and unlinked, not just delegated to.
    const removedTransactions: Partial<Transaction>[] = [{ id: 10, transferId: 5 }];
    const transactionsRepository = {
      getByImportBatch: vi.fn().mockResolvedValue(removedTransactions),
      bulkRemove: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(1),
    };
    const importBatchesRepository = {
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const transfersRepository = {
      getByIds: vi.fn().mockResolvedValue([{ id: 5, fromTransactionId: 10, toTransactionId: 20 }]),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        ImportService,
        TransferCleanupService,
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: TransfersRepository, useValue: transfersRepository },
      ],
    });
    const service = TestBed.inject(ImportService);

    const result = await service.undoImport(99);

    expect(transfersRepository.remove).toHaveBeenCalledWith(5);
    expect(transactionsRepository.update).toHaveBeenCalledWith(20, { transferId: undefined });
    expect(transactionsRepository.bulkRemove).toHaveBeenCalledWith([10]);
    expect(result).toEqual({ unlinkedTransferIds: [5], clearedTransferTransactionIds: [20] });
  });
});

describe('ImportService: commitImport rawLine/rawRow handling (TICKET-TXN-06)', () => {
  beforeEach(() => {
    vi.spyOn(appDb, 'transaction').mockImplementation(((...args: unknown[]) =>
      (args[args.length - 1] as () => unknown)()) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = (existingTransactions: Transaction[]) => {
    const transactionsRepository = {
      getByAccount: vi.fn().mockResolvedValue(existingTransactions),
      bulkAdd: vi
        .fn()
        .mockImplementation((rows: Transaction[]) =>
          Promise.resolve(rows.map((_, index) => index + 100)),
        ),
      bulkUpdate: vi.fn().mockResolvedValue(0),
    };
    const importBatchesRepository = {
      add: vi.fn().mockResolvedValue(1),
      getById: vi.fn().mockResolvedValue({ id: 1 } as ImportBatch),
    };

    TestBed.configureTestingModule({
      providers: [
        ImportService,
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: TransferCleanupService, useValue: {} },
      ],
    });

    return { service: TestBed.inject(ImportService), transactionsRepository };
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
    const { service, transactionsRepository } = setup([]);

    await service.commitImport(
      baseInput([
        validRow({
          rawLine: '01/07/2026;-10,00;Carrefour Market',
          rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
        }),
      ]),
    );

    expect(transactionsRepository.bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        rawLine: '01/07/2026;-10,00;Carrefour Market',
        rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
      }),
    ]);
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

    const { service, transactionsRepository } = setup([legacy]);

    const result = await service.commitImport(baseInput([row]));

    expect(transactionsRepository.bulkAdd).toHaveBeenCalledWith([]);
    const expectedChanges = {
      id: 42,
      changes: {
        rawLine: '01/07/2026;-10,00;Carrefour Market',
        rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
      },
    };
    expect(transactionsRepository.bulkUpdate).toHaveBeenCalledWith([expectedChanges]);
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

    const { service, transactionsRepository } = setup([legacy]);

    const result = await service.commitImport(baseInput([row]));

    const expectedChanges = {
      id: 42,
      changes: { rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' } },
    };
    expect(transactionsRepository.bulkUpdate).toHaveBeenCalledWith([expectedChanges]);
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

    const { service, transactionsRepository } = setup([legacy]);

    const result = await service.commitImport(baseInput([row]));

    expect(transactionsRepository.bulkUpdate).not.toHaveBeenCalled();
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
