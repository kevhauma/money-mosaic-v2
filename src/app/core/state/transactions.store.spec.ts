import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TransactionsRepository, type Transaction } from '@/core/data-access';
import { TransactionDeletionService } from '@/core/transactions';
import { TransactionsStore } from './transactions.store';

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

describe('TransactionsStore: bulkAssignCategory (TICKET-TXN-01)', () => {
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    bulkUpdate: vi.fn().mockResolvedValue(3),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: TransactionsRepository, useValue: transactionsRepository }],
    });
  });

  it('persists one batched write that assigns the category and marks each row manual', async () => {
    const store = TestBed.inject(TransactionsStore);
    store.addMany([transaction({ id: 1 }), transaction({ id: 2 }), transaction({ id: 3 })]);

    await store.bulkAssignCategory([1, 2, 3], 7);

    // Single batched write, not N sequential awaits.
    expect(transactionsRepository.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(transactionsRepository.update).not.toHaveBeenCalled();
    expect(transactionsRepository.bulkUpdate).toHaveBeenCalledWith([
      { id: 1, changes: { categoryId: 7, categoryManual: true } },
      { id: 2, changes: { categoryId: 7, categoryManual: true } },
      { id: 3, changes: { categoryId: 7, categoryManual: true } },
    ]);
  });

  it('reflects the category and manual flag into local state so computed stats update immediately', async () => {
    const store = TestBed.inject(TransactionsStore);
    store.addMany([transaction({ id: 1 }), transaction({ id: 2 })]);
    expect(store.uncategorisedCount()).toBe(2);

    await store.bulkAssignCategory([1, 2], 7);

    expect(store.transactions().every((t) => t.categoryId === 7 && t.categoryManual === true)).toBe(
      true,
    );
    expect(store.uncategorisedCount()).toBe(0);
  });

  it('no-ops on an empty selection', async () => {
    const store = TestBed.inject(TransactionsStore);
    await store.bulkAssignCategory([], 7);
    expect(transactionsRepository.bulkUpdate).not.toHaveBeenCalled();
  });
});

describe('TransactionsStore: uncategorised backlog excludes savings movements (TICKET-TRF-02)', () => {
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    bulkUpdate: vi.fn().mockResolvedValue(0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: TransactionsRepository, useValue: transactionsRepository }],
    });
  });

  it('drops a movement to a savings account but keeps a genuine uncategorised spend', () => {
    const store = TestBed.inject(TransactionsStore);
    store.addMany([
      // Uncategorised movement to an own savings account.
      transaction({ id: 1, amount: -200, counterpartyIban: 'BE00SAVINGS' }),
      // Genuinely uncategorised spend.
      transaction({ id: 2, amount: -30, counterpartyIban: 'BE00SHOP' }),
    ]);

    // Before the savings IBANs are known, both look uncategorised.
    expect(store.uncategorisedCount()).toBe(2);

    store.setOwnSavingsIbans(new Set(['BE00SAVINGS']));

    expect(store.uncategorisedCount()).toBe(1);
    expect(store.uncategorisedTransactions().map((t) => t.id)).toEqual([2]);
  });
});

describe('TransactionsStore: uncategorised backlog excludes transfer-linked transactions (TICKET-TRF-01)', () => {
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    bulkUpdate: vi.fn().mockResolvedValue(0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: TransactionsRepository, useValue: transactionsRepository }],
    });
  });

  it('drops a transaction linked as a transfer but keeps a genuine uncategorised spend', () => {
    const store = TestBed.inject(TransactionsStore);
    store.addMany([
      // Linked as a transfer — categoryId is cleared on link and must never re-enter the backlog.
      transaction({ id: 1, amount: -500, transferId: 42 }),
      // Genuinely uncategorised spend.
      transaction({ id: 2, amount: -30 }),
    ]);

    expect(store.uncategorisedCount()).toBe(1);
    expect(store.uncategorisedTransactions().map((t) => t.id)).toEqual([2]);
  });
});

describe('TransactionsStore: deleteTransactions', () => {
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    bulkUpdate: vi.fn().mockResolvedValue(0),
  };
  const transactionDeletionService = {
    removeMany: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: TransactionDeletionService, useValue: transactionDeletionService },
      ],
    });
  });

  it('removes the deleted transactions from local state and clears any unlinked transferId', async () => {
    const store = TestBed.inject(TransactionsStore);
    store.addMany([
      transaction({ id: 1 }),
      transaction({ id: 2, transferId: 5 }),
      transaction({ id: 3, transferId: 5 }),
    ]);
    transactionDeletionService.removeMany.mockResolvedValue({
      removedTransactionIds: [1],
      unlinkedTransferIds: [5],
      clearedTransferTransactionIds: [2],
    });

    const result = await store.deleteTransactions([store.transactions()[0]]);

    expect(store.transactions().map((t) => t.id)).toEqual([2, 3]);
    expect(store.transactions().find((t) => t.id === 2)?.transferId).toBeUndefined();
    expect(result.unlinkedTransferIds).toEqual([5]);
  });
});

describe('TransactionsStore: nullify toggle leaves other fields untouched (TICKET-TXN-04)', () => {
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    bulkUpdate: vi.fn().mockResolvedValue(0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: TransactionsRepository, useValue: transactionsRepository }],
    });
  });

  it('setting nullified persists and reflects only that field, leaving category/attributionOverride as-is', async () => {
    const store = TestBed.inject(TransactionsStore);
    store.addMany([
      transaction({
        id: 1,
        categoryId: 3,
        categoryManual: true,
        attributionOverride: { mode: 'personal' },
      }),
    ]);

    await store.updateTransaction(1, { nullified: true });

    expect(transactionsRepository.update).toHaveBeenCalledWith(1, { nullified: true });
    const updated = store.transactions().find((t) => t.id === 1);
    expect(updated).toMatchObject({
      nullified: true,
      categoryId: 3,
      categoryManual: true,
      attributionOverride: { mode: 'personal' },
    });
  });
});
