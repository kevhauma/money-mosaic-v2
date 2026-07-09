import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  appDb,
  TransactionsRepository,
  TransfersRepository,
  type Transaction,
} from '@/core/data-access';
import { TransferLinkingService } from './transfer-linking.service';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: -12,
  currency: 'EUR',
  rawDescription: 'Own transfer',
  fingerprint: `fp-${overrides.id ?? 1}`,
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const setup = () => {
  const transactionsRepository = {
    update: vi.fn().mockResolvedValue(1),
  };
  const transfersRepository = {
    add: vi.fn().mockResolvedValue(42),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  TestBed.configureTestingModule({
    providers: [
      TransferLinkingService,
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: TransfersRepository, useValue: transfersRepository },
    ],
  });

  return {
    service: TestBed.inject(TransferLinkingService),
    transactionsRepository,
    transfersRepository,
  };
};

describe('TransferLinkingService: category is cleared on link (TICKET-TRF-01)', () => {
  // Linking runs inside `appDb.transaction('rw', ...)`; stub it to synchronously invoke the scope so
  // we exercise the repository calls without a real IndexedDB.
  beforeEach(() => {
    vi.spyOn(appDb, 'transaction').mockImplementation(((...args: unknown[]) =>
      (args[args.length - 1] as () => unknown)()) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('linkManually clears categoryId and categoryManual on both sides atomically with transferId', async () => {
    const ctx = setup();
    const from = transaction({ id: 1, categoryId: 5, categoryManual: true });
    const to = transaction({ id: 2, categoryId: 5 });

    const result = await ctx.service.linkManually(from, to);

    const clearedCategory = { transferId: 42, categoryId: undefined, categoryManual: undefined };
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(1, clearedCategory);
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(2, clearedCategory);
    expect(result.updatedTransactions[0].categoryId).toBeUndefined();
    expect(result.updatedTransactions[0].categoryManual).toBeUndefined();
    expect(result.updatedTransactions[1].categoryId).toBeUndefined();
    expect(appDb.transaction).toHaveBeenCalled();
  });

  it('linkAuto (auto-iban high confidence) clears the category on both sides', async () => {
    const ctx = setup();
    const from = transaction({ id: 1, categoryId: 3 });
    const to = transaction({ id: 2, categoryId: 3 });

    await ctx.service.linkAuto(from, to, 'auto-iban', 'high');

    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(1, {
      transferId: 42,
      categoryId: undefined,
      categoryManual: undefined,
    });
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(2, {
      transferId: 42,
      categoryId: undefined,
      categoryManual: undefined,
    });
  });

  it('linkAuto (auto-amountdate medium confidence) clears the category on both sides', async () => {
    const ctx = setup();
    const from = transaction({ id: 1, categoryId: 3 });
    const to = transaction({ id: 2, categoryId: 3 });

    await ctx.service.linkAuto(from, to, 'auto-amountdate', 'medium');

    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(1, {
      transferId: 42,
      categoryId: undefined,
      categoryManual: undefined,
    });
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(2, {
      transferId: 42,
      categoryId: undefined,
      categoryManual: undefined,
    });
  });

  it('link with no prior category still writes the cleared fields (idempotent)', async () => {
    const ctx = setup();
    const from = transaction({ id: 1 });
    const to = transaction({ id: 2 });

    await ctx.service.linkManually(from, to);

    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(1, {
      transferId: 42,
      categoryId: undefined,
      categoryManual: undefined,
    });
  });

  it('unlink only clears transferId — the decision is to leave the category empty rather than restore or re-suggest one', async () => {
    const ctx = setup();

    await ctx.service.unlink({
      id: 42,
      fromTransactionId: 1,
      toTransactionId: 2,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-06-01T00:00:00.000Z',
    });

    expect(ctx.transfersRepository.remove).toHaveBeenCalledWith(42);
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(1, { transferId: undefined });
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(2, { transferId: undefined });
    // No categoryId key present in either update call — unlink never touches category.
    expect(
      ctx.transactionsRepository.update.mock.calls.every(
        ([, changes]) => !('categoryId' in changes),
      ),
    ).toBe(true);
  });
});
