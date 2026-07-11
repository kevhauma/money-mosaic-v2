import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  TransactionsRepository,
  TransfersRepository,
  type Transaction,
  type Transfer,
} from '@/core/data-access';
import { TransferLinkingService, TransferMatchingService } from '@/core/transfers';
import { TransactionsStore } from './transactions.store';
import { TransferSettingsStore } from './transfer-settings.store';
import { TransfersStore } from './transfers.store';

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

const transfer = (overrides: Partial<Transfer> = {}): Transfer => ({
  id: 1,
  fromTransactionId: 1,
  toTransactionId: 2,
  method: 'manual',
  confidence: 'manual',
  linkedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

describe('TransfersStore: link/unlink mirror transferId into TransactionsStore (TICKET-TEST-01)', () => {
  const transfersRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const transferLinkingService = { linkManually: vi.fn(), unlink: vi.fn() };
  const transferMatchingService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transferSettingsStore = { matchWindowDays: () => 3, autoLinkMediumConfidence: () => true };
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: TransfersRepository, useValue: transfersRepository },
        { provide: TransferLinkingService, useValue: transferLinkingService },
        { provide: TransferMatchingService, useValue: transferMatchingService },
        { provide: TransferSettingsStore, useValue: transferSettingsStore },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('link adds the transfer entity and patches both transactions’ transferId', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([transaction({ id: 1 }), transaction({ id: 2 })]);

    const from = transaction({ id: 1 });
    const to = transaction({ id: 2 });
    const linked = transfer({ id: 42, fromTransactionId: 1, toTransactionId: 2 });
    transferLinkingService.linkManually.mockResolvedValue({
      transfer: linked,
      updatedTransactions: [
        { ...from, transferId: 42 },
        { ...to, transferId: 42 },
      ],
    });

    const store = TestBed.inject(TransfersStore);
    await store.link(from, to);

    expect(store.transfers().some((t) => t.id === 42)).toBe(true);
    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(1)?.transferId).toBe(42);
    expect(byId.get(2)?.transferId).toBe(42);
  });

  it('link clears categoryId/categoryManual on both sides, mirroring the cleared category from the service (TICKET-TRF-01)', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, categoryId: 7, categoryManual: true }),
      transaction({ id: 2, categoryId: 7 }),
    ]);

    const from = transaction({ id: 1, categoryId: 7, categoryManual: true });
    const to = transaction({ id: 2, categoryId: 7 });
    const linked = transfer({ id: 42, fromTransactionId: 1, toTransactionId: 2 });
    transferLinkingService.linkManually.mockResolvedValue({
      transfer: linked,
      updatedTransactions: [
        { ...from, transferId: 42, categoryId: undefined, categoryManual: undefined },
        { ...to, transferId: 42, categoryId: undefined, categoryManual: undefined },
      ],
    });

    const store = TestBed.inject(TransfersStore);
    await store.link(from, to);

    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(1)?.categoryId).toBeUndefined();
    expect(byId.get(1)?.categoryManual).toBeUndefined();
    expect(byId.get(2)?.categoryId).toBeUndefined();
    expect(byId.get(2)?.categoryManual).toBeUndefined();
  });

  it('unlink clears transferId on both sides and removes the transfer entity', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, transferId: 42 }),
      transaction({ id: 2, transferId: 42 }),
    ]);
    transfersRepository.getAll.mockResolvedValue([
      transfer({ id: 42, fromTransactionId: 1, toTransactionId: 2 }),
    ]);
    transferLinkingService.unlink.mockResolvedValue({ clearedAttributionOverrides: [] });

    const store = TestBed.inject(TransfersStore);
    await store.hydrate();

    await store.unlink(42);

    expect(transferLinkingService.unlink).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
    expect(store.transfers().some((t) => t.id === 42)).toBe(false);
    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(1)?.transferId).toBeUndefined();
    expect(byId.get(2)?.transferId).toBeUndefined();
  });

  it('unlink mirrors a cleared dangling reimbursementTransferId into TransactionsStore (TICKET-TXN-03)', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, transferId: 42 }),
      transaction({ id: 2, transferId: 42 }),
      transaction({
        id: 5,
        attributionOverride: { mode: 'shared', jointAccountId: 1, reimbursementTransferId: 42 },
      }),
    ]);
    transfersRepository.getAll.mockResolvedValue([
      transfer({ id: 42, fromTransactionId: 1, toTransactionId: 2 }),
    ]);
    transferLinkingService.unlink.mockResolvedValue({
      clearedAttributionOverrides: [
        { id: 5, attributionOverride: { mode: 'shared', jointAccountId: 1 } },
      ],
    });

    const store = TestBed.inject(TransfersStore);
    await store.hydrate();

    await store.unlink(42);

    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(5)?.attributionOverride).toEqual({ mode: 'shared', jointAccountId: 1 });
  });

  it('unlink is a safe no-op for an unknown transferId', async () => {
    const store = TestBed.inject(TransfersStore);
    await store.hydrate();

    await store.unlink(999);

    expect(transferLinkingService.unlink).not.toHaveBeenCalled();
  });

  it('runAutoLink patches every linked pair and returns the linked count', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, categoryId: 9 }),
      transaction({ id: 2, categoryId: 9, categoryManual: true }),
      transaction({ id: 3 }),
      transaction({ id: 4 }),
    ]);
    transferMatchingService.runAndPersist.mockResolvedValue([
      transfer({ id: 100, fromTransactionId: 1, toTransactionId: 2 }),
      transfer({ id: 101, fromTransactionId: 3, toTransactionId: 4 }),
    ]);

    const store = TestBed.inject(TransfersStore);
    const count = await store.runAutoLink();

    expect(transferMatchingService.runAndPersist).toHaveBeenCalledWith(3, true);
    expect(count).toBe(2);
    expect(store.transfers()).toHaveLength(2);
    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(1)?.transferId).toBe(100);
    expect(byId.get(2)?.transferId).toBe(100);
    expect(byId.get(3)?.transferId).toBe(101);
    expect(byId.get(4)?.transferId).toBe(101);
    // Auto-linking clears category (TICKET-TRF-01) — checked here alongside side 2, which had categoryManual set.
    expect(byId.get(1)?.categoryId).toBeUndefined();
    expect(byId.get(2)?.categoryId).toBeUndefined();
    expect(byId.get(2)?.categoryManual).toBeUndefined();
  });
});
