import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TransactionsRepository, type Transaction } from '@/core/data-access';
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
