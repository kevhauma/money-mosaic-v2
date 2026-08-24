import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ImportBatchesRepository, type ImportBatch, type Transaction } from '@/core/data-access';
import { ImportService, type CommitImportInput } from '@/core/import';
import { CoOwnerContributionService, RulesEngineService } from '@/core/categorisation';
import { TransactionsStore } from './transactions.store';
import { TransfersStore } from './transfers.store';
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
  const coOwnerContributionService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsStore = {
    transactions: vi.fn().mockReturnValue([]),
    hydrate: vi.fn().mockResolvedValue(undefined),
    addMany: vi.fn(),
    removeMany: vi.fn(),
    patchMany: vi.fn(),
  };
  const transfersStore = {
    hydrate: vi.fn().mockResolvedValue(undefined),
    runAutoLink: vi.fn().mockResolvedValue(0),
    removeLocal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: ImportService, useValue: importService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: CoOwnerContributionService, useValue: coOwnerContributionService },
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
      backfilledTransactions: [],
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

  it('runs the co-owner contribution registry after rules and lets it override a conflicting rule (TICKET-CAT-02)', async () => {
    const batch = importBatch();
    const added = [transaction({ id: 10 })];
    importService.commitImport.mockResolvedValue({
      batch,
      addedTransactions: added,
      duplicateCount: 0,
      backfilledTransactions: [],
    });
    // A user rule matches and tags it Groceries...
    rulesEngineService.runAndPersist.mockResolvedValue([{ id: 10, categoryId: 7 }]);
    // ...but the co-owner IBAN registry recognises it as a partner contribution and wins.
    coOwnerContributionService.runAndPersist.mockResolvedValue([{ id: 10, categoryId: 99 }]);

    const store = TestBed.inject(ImportBatchesStore);
    const result = await store.commitImport(commitInput);

    expect(coOwnerContributionService.runAndPersist).toHaveBeenCalledWith([
      { ...added[0], categoryId: 7 },
    ]);
    expect(transactionsStore.addMany).toHaveBeenCalledWith([{ ...added[0], categoryId: 99 }]);
    expect(result.addedTransactions).toEqual([{ ...added[0], categoryId: 99 }]);
  });

  it('patches rawLine/rawRow backfilled onto legacy duplicates into TransactionsStore (TICKET-TXN-06)', async () => {
    const batch = importBatch();
    const backfilledTransactions = [{ id: 42, changes: { rawLine: 'the original line' } }];
    importService.commitImport.mockResolvedValue({
      batch,
      addedTransactions: [],
      duplicateCount: 1,
      backfilledTransactions,
    });

    const store = TestBed.inject(ImportBatchesStore);
    await store.commitImport(commitInput);

    expect(transactionsStore.patchMany).toHaveBeenCalledWith(backfilledTransactions);
  });

  it('does not call patchMany when nothing was backfilled', async () => {
    const batch = importBatch();
    importService.commitImport.mockResolvedValue({
      batch,
      addedTransactions: [],
      duplicateCount: 0,
      backfilledTransactions: [],
    });

    const store = TestBed.inject(ImportBatchesStore);
    await store.commitImport(commitInput);

    expect(transactionsStore.patchMany).not.toHaveBeenCalled();
  });
});

describe('ImportBatchesStore: undoImport mirrors removals and severed transfers into both stores (TICKET-TEST-01)', () => {
  const importBatchesRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const importService = { commitImport: vi.fn(), undoImport: vi.fn() };
  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const coOwnerContributionService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsStore = {
    transactions: vi.fn().mockReturnValue([]),
    hydrate: vi.fn().mockResolvedValue(undefined),
    addMany: vi.fn(),
    removeMany: vi.fn(),
    patchMany: vi.fn(),
  };
  const transfersStore = {
    hydrate: vi.fn().mockResolvedValue(undefined),
    runAutoLink: vi.fn().mockResolvedValue(0),
    removeLocal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: ImportService, useValue: importService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: CoOwnerContributionService, useValue: coOwnerContributionService },
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

describe('ImportBatchesStore: on-injection hydration (TICKET-PERF-07)', () => {
  const importBatchesRepository = { getAll: vi.fn() };
  const importService = { commitImport: vi.fn(), undoImport: vi.fn() };
  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const coOwnerContributionService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsStore = {
    transactions: vi.fn().mockReturnValue([]),
    hydrate: vi.fn().mockResolvedValue(undefined),
    addMany: vi.fn(),
    removeMany: vi.fn(),
    patchMany: vi.fn(),
  };
  const transfersStore = {
    hydrate: vi.fn().mockResolvedValue(undefined),
    runAutoLink: vi.fn().mockResolvedValue(0),
    removeLocal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    importBatchesRepository.getAll.mockResolvedValue([importBatch()]);
    TestBed.configureTestingModule({
      providers: [
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: ImportService, useValue: importService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: CoOwnerContributionService, useValue: coOwnerContributionService },
        { provide: TransactionsStore, useValue: transactionsStore },
        { provide: TransfersStore, useValue: transfersStore },
      ],
    });
  });

  it('hydrates itself on first injection without a caller invoking hydrate()', async () => {
    const store = TestBed.inject(ImportBatchesStore);

    await store.hydrate();

    expect(importBatchesRepository.getAll).toHaveBeenCalledTimes(1);
    expect(store.batches()).toEqual([importBatch()]);
  });

  it('is idempotent: double injection and repeated calls all resolve without re-fetching', async () => {
    const store = TestBed.inject(ImportBatchesStore);

    await Promise.all([store.hydrate(), store.hydrate()]);
    await store.hydrate();

    expect(importBatchesRepository.getAll).toHaveBeenCalledTimes(1);
  });
});

/**
 * TICKET-ACC-13 — the "last import" line every account card and the account detail header show is
 * derived from the batches, not from a mirrored column, so this is where its correctness lives.
 */
describe('ImportBatchesStore: lastImportedAtByAccountId (TICKET-ACC-13)', () => {
  const importBatchesRepository = { getAll: vi.fn() };
  const importService = { commitImport: vi.fn(), undoImport: vi.fn() };
  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const coOwnerContributionService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsStore = {
    transactions: vi.fn().mockReturnValue([]),
    hydrate: vi.fn().mockResolvedValue(undefined),
    addMany: vi.fn(),
    removeMany: vi.fn(),
    patchMany: vi.fn(),
  };
  const transfersStore = {
    hydrate: vi.fn().mockResolvedValue(undefined),
    runAutoLink: vi.fn().mockResolvedValue(0),
    removeLocal: vi.fn(),
  };

  const storeWith = async (batches: ImportBatch[]) => {
    vi.clearAllMocks();
    importBatchesRepository.getAll.mockResolvedValue(batches);
    TestBed.configureTestingModule({
      providers: [
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: ImportService, useValue: importService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: CoOwnerContributionService, useValue: coOwnerContributionService },
        { provide: TransactionsStore, useValue: transactionsStore },
        { provide: TransfersStore, useValue: transfersStore },
      ],
    });
    const store = TestBed.inject(ImportBatchesStore);
    await store.hydrate();
    return store;
  };

  it('reports the most recent batch for an account that has several', async () => {
    const store = await storeWith([
      importBatch({ id: 1, accountId: 7, importedAt: '2026-06-01T00:00:00.000Z' }),
      importBatch({ id: 2, accountId: 7, importedAt: '2026-08-14T09:30:00.000Z' }),
      importBatch({ id: 3, accountId: 7, importedAt: '2026-07-02T00:00:00.000Z' }),
    ]);

    expect(store.lastImportedAtByAccountId().get(7)).toBe('2026-08-14T09:30:00.000Z');
  });

  it('keeps each account on its own newest batch', async () => {
    const store = await storeWith([
      importBatch({ id: 1, accountId: 7, importedAt: '2026-08-14T00:00:00.000Z' }),
      importBatch({ id: 2, accountId: 9, importedAt: '2026-06-30T00:00:00.000Z' }),
    ]);

    expect([...store.lastImportedAtByAccountId()]).toEqual([
      [7, '2026-08-14T00:00:00.000Z'],
      [9, '2026-06-30T00:00:00.000Z'],
    ]);
  });

  it('reports itself un-hydrated until the repository read lands (TICKET-TRF-06’s lesson)', async () => {
    vi.clearAllMocks();
    let resolveRead: (batches: ImportBatch[]) => void = () => undefined;
    importBatchesRepository.getAll.mockReturnValue(
      new Promise<ImportBatch[]>((resolve) => {
        resolveRead = resolve;
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: ImportService, useValue: importService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: CoOwnerContributionService, useValue: coOwnerContributionService },
        { provide: TransactionsStore, useValue: transactionsStore },
        { provide: TransfersStore, useValue: transfersStore },
      ],
    });
    const store = TestBed.inject(ImportBatchesStore);

    // Mid-flight, the map is empty for the same reason it is empty for an account with no batches
    // — which is exactly why the flag exists and consumers must read it.
    expect(store.hydrated()).toBe(false);
    expect(store.lastImportedAtByAccountId().size).toBe(0);

    resolveRead([importBatch({ id: 1, accountId: 7 })]);
    await store.hydrate();

    expect(store.hydrated()).toBe(true);
    expect(store.lastImportedAtByAccountId().has(7)).toBe(true);
  });

  it('leaves an account with no batches out of the map, which is the "never" state', async () => {
    const store = await storeWith([importBatch({ id: 1, accountId: 7 })]);

    expect(store.lastImportedAtByAccountId().has(9)).toBe(false);
  });

  it('falls back to the previous batch when the newest one is undone', async () => {
    const store = await storeWith([
      importBatch({ id: 1, accountId: 7, importedAt: '2026-06-01T00:00:00.000Z' }),
      importBatch({ id: 2, accountId: 7, importedAt: '2026-08-14T00:00:00.000Z' }),
    ]);
    importService.undoImport.mockResolvedValue({
      unlinkedTransferIds: [],
      clearedTransferTransactionIds: [],
    });

    await store.undoImport(importBatch({ id: 2, accountId: 7 }));

    expect(store.lastImportedAtByAccountId().get(7)).toBe('2026-06-01T00:00:00.000Z');
  });

  it('drops the account entirely once its only batch is undone', async () => {
    const store = await storeWith([
      importBatch({ id: 1, accountId: 7, importedAt: '2026-08-14T00:00:00.000Z' }),
    ]);
    importService.undoImport.mockResolvedValue({
      unlinkedTransferIds: [],
      clearedTransferTransactionIds: [],
    });

    await store.undoImport(importBatch({ id: 1, accountId: 7 }));

    expect(store.lastImportedAtByAccountId().has(7)).toBe(false);
  });
});
