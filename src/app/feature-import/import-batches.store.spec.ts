import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ImportBatchesRepository, type ImportBatch, type Transaction } from '@/core/data-access';
import { ImportService, type CommitImportInput } from '@/core/import';
import { RulesEngineService } from '@/core/categorisation';
import { TransactionsStore, TransfersStore } from '@/feature-transactions';
import { ImportBatchesStore } from './import-batches.store';

const importBatch = (overrides: Partial<ImportBatch> = {}): ImportBatch => ({
  id: 5,
  accountId: 1,
  fileName: 'export.csv',
  importedAt: '2026-06-01T00:00:00.000Z',
  rowsRead: 2,
  rowsAdded: 2,
  rowsDuplicate: 0,
  dateFrom: '2026-06-01',
  dateTo: '2026-06-02',
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: -12,
  currency: 'EUR',
  rawDescription: 'Coffee',
  fingerprint: `fp-${overrides.id ?? 1}`,
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const commitInput: CommitImportInput = {
  accountId: 1,
  fileName: 'export.csv',
  totalRowsRead: 2,
  validRows: [],
};

describe('ImportBatchesStore: commitImport pre-categorises rows before they land in TransactionsStore (TICKET-TEST-01)', () => {
  const importBatchesRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const importService = { commitImport: vi.fn(), undoImport: vi.fn() };
  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsStore = {
    transactions: vi.fn().mockReturnValue([]),
    addMany: vi.fn(),
    removeMany: vi.fn(),
    patchMany: vi.fn(),
  };
  const transfersStore = { runAutoLink: vi.fn().mockResolvedValue(0), removeLocal: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: ImportService, useValue: importService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: TransactionsStore, useValue: transactionsStore },
        { provide: TransfersStore, useValue: transfersStore },
      ],
    });
  });

  it('merges the matching rule’s categoryId into the added row before addMany, then runs auto-link after', async () => {
    const batch = importBatch();
    const added = [transaction({ id: 10 }), transaction({ id: 11 })];
    importService.commitImport.mockResolvedValue({
      batch,
      addedTransactions: added,
      duplicateCount: 0,
    });
    // Rule matches only transaction 10.
    rulesEngineService.runAndPersist.mockResolvedValue([{ id: 10, categoryId: 7 }]);

    const store = TestBed.inject(ImportBatchesStore);
    const result = await store.commitImport(commitInput);

    expect(rulesEngineService.runAndPersist).toHaveBeenCalledWith(added);
    expect(transactionsStore.addMany).toHaveBeenCalledWith([
      { ...added[0], categoryId: 7 },
      added[1],
    ]);
    expect(transfersStore.runAutoLink).toHaveBeenCalled();
    expect(transactionsStore.addMany.mock.invocationCallOrder[0]).toBeLessThan(
      transfersStore.runAutoLink.mock.invocationCallOrder[0],
    );
    expect(result.addedTransactions).toEqual([{ ...added[0], categoryId: 7 }, added[1]]);
  });
});

describe('ImportBatchesStore: undoImport mirrors removals and severed transfers into both stores (TICKET-TEST-01)', () => {
  const importBatchesRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const importService = { commitImport: vi.fn(), undoImport: vi.fn() };
  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsStore = {
    transactions: vi.fn().mockReturnValue([]),
    addMany: vi.fn(),
    removeMany: vi.fn(),
    patchMany: vi.fn(),
  };
  const transfersStore = { runAutoLink: vi.fn().mockResolvedValue(0), removeLocal: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: ImportService, useValue: importService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: TransactionsStore, useValue: transactionsStore },
        { provide: TransfersStore, useValue: transfersStore },
      ],
    });
  });

  it('removes exactly the batch’s rows, clears the surviving cross-import partner’s transferId, and forgets the severed transfer', async () => {
    const batch = importBatch({ id: 5 });
    transactionsStore.transactions.mockReturnValue([
      transaction({ id: 1, importBatchId: 5 }),
      transaction({ id: 2, importBatchId: 5 }),
      transaction({ id: 3, importBatchId: 9 }),
    ]);
    importService.undoImport.mockResolvedValue({
      unlinkedTransferIds: [100],
      clearedTransferTransactionIds: [3],
    });

    const store = TestBed.inject(ImportBatchesStore);
    await store.undoImport(batch);

    expect(importService.undoImport).toHaveBeenCalledWith(5);
    expect(transactionsStore.removeMany).toHaveBeenCalledWith([1, 2]);
    expect(transactionsStore.patchMany).toHaveBeenCalledWith([
      { id: 3, changes: { transferId: undefined } },
    ]);
    expect(transfersStore.removeLocal).toHaveBeenCalledWith([100]);
  });
});
