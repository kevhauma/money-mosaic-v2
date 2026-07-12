import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { appDb, TransactionsRepository, type Transaction } from '@/core/data-access';
import { TransferCleanupService } from '@/core/transfers';
import { TransactionDeletionService } from './transaction-deletion.service';

const setup = (options: {
  cleanupResult?: { unlinkedTransferIds: number[]; clearedTransferTransactionIds: number[] };
}) => {
  const transactionsRepository = {
    bulkRemove: vi.fn().mockResolvedValue(undefined),
  };
  const transferCleanupService = {
    cleanupTransfersForRemovedTransactions: vi
      .fn()
      .mockResolvedValue(
        options.cleanupResult ?? { unlinkedTransferIds: [], clearedTransferTransactionIds: [] },
      ),
  };

  TestBed.configureTestingModule({
    providers: [
      TransactionDeletionService,
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: TransferCleanupService, useValue: transferCleanupService },
    ],
  });

  return {
    service: TestBed.inject(TransactionDeletionService),
    transactionsRepository,
    transferCleanupService,
  };
};

describe('TransactionDeletionService: removeMany', () => {
  // The cascade runs inside `appDb.transaction('rw', ...)`; stub it to synchronously invoke the scope
  // so we exercise the repository calls without a real IndexedDB.
  beforeEach(() => {
    vi.spyOn(appDb, 'transaction').mockImplementation(((...args: unknown[]) =>
      (args[args.length - 1] as () => unknown)()) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes the given transactions', async () => {
    const transactions: Transaction[] = [
      { id: 10, accountId: 1, bookingDate: '2026-07-01' } as Transaction,
      { id: 11, accountId: 1, bookingDate: '2026-07-02' } as Transaction,
    ];
    const ctx = setup({});

    const result = await ctx.service.removeMany(transactions);

    expect(ctx.transactionsRepository.bulkRemove).toHaveBeenCalledWith([10, 11]);
    expect(result.removedTransactionIds).toEqual([10, 11]);
  });

  it('delegates transfer cleanup to the shared TransferCleanupService and merges its result', async () => {
    const transactions: Transaction[] = [
      { id: 10, accountId: 1, bookingDate: '2026-07-01', transferId: 5 } as Transaction,
    ];
    const ctx = setup({
      cleanupResult: { unlinkedTransferIds: [5], clearedTransferTransactionIds: [20] },
    });

    const result = await ctx.service.removeMany(transactions);

    expect(ctx.transferCleanupService.cleanupTransfersForRemovedTransactions).toHaveBeenCalledWith(
      transactions,
    );
    expect(result).toEqual({
      removedTransactionIds: [10],
      unlinkedTransferIds: [5],
      clearedTransferTransactionIds: [20],
    });
  });

  it('is a safe no-op for an empty selection', async () => {
    const ctx = setup({});

    const result = await ctx.service.removeMany([]);

    expect(ctx.transactionsRepository.bulkRemove).toHaveBeenCalledWith([]);
    expect(result).toEqual({
      removedTransactionIds: [],
      unlinkedTransferIds: [],
      clearedTransferTransactionIds: [],
    });
  });
});
