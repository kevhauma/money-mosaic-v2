import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  TransactionsRepository,
  TransfersRepository,
  type Transaction,
  type Transfer,
} from '@/core/data-access';
import { TransferCleanupService } from './transfer-cleanup.service';

const setup = (transfers: Partial<Transfer>[] = []) => {
  const transfersById = new Map(transfers.map((transfer) => [transfer.id!, transfer]));

  const transactionsRepository = {
    update: vi.fn().mockResolvedValue(1),
  };
  const transfersRepository = {
    getByIds: vi
      .fn()
      .mockImplementation(async (ids: number[]) =>
        ids.map((id) => transfersById.get(id)).filter((transfer) => transfer != null),
      ),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  TestBed.configureTestingModule({
    providers: [
      TransferCleanupService,
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: TransfersRepository, useValue: transfersRepository },
    ],
  });

  return {
    service: TestBed.inject(TransferCleanupService),
    transactionsRepository,
    transfersRepository,
  };
};

describe('TransferCleanupService: cleanupTransfersForRemovedTransactions', () => {
  it('is a no-op when none of the removed transactions carry a transferId', async () => {
    const ctx = setup();
    const transactions: Partial<Transaction>[] = [{ id: 10 }, { id: 11 }];

    const result = await ctx.service.cleanupTransfersForRemovedTransactions(
      transactions as Transaction[],
    );

    expect(ctx.transfersRepository.remove).not.toHaveBeenCalled();
    expect(ctx.transactionsRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual({ unlinkedTransferIds: [], clearedTransferTransactionIds: [] });
  });

  it("removes the transfer and clears the surviving side's transferId when it isn't also being removed", async () => {
    const ctx = setup([{ id: 5, fromTransactionId: 10, toTransactionId: 20 }]);
    const transactions: Partial<Transaction>[] = [{ id: 10, transferId: 5 }];

    const result = await ctx.service.cleanupTransfersForRemovedTransactions(
      transactions as Transaction[],
    );

    expect(ctx.transfersRepository.remove).toHaveBeenCalledWith(5);
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(20, { transferId: undefined });
    expect(result).toEqual({ unlinkedTransferIds: [5], clearedTransferTransactionIds: [20] });
  });

  it('removes the transfer but leaves the surviving side alone when it is also in the doomed set', async () => {
    const ctx = setup([{ id: 5, fromTransactionId: 10, toTransactionId: 20 }]);
    const transactions: Partial<Transaction>[] = [{ id: 10, transferId: 5 }, { id: 20 }];

    const result = await ctx.service.cleanupTransfersForRemovedTransactions(
      transactions as Transaction[],
    );

    expect(ctx.transfersRepository.remove).toHaveBeenCalledWith(5);
    expect(ctx.transactionsRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual({ unlinkedTransferIds: [5], clearedTransferTransactionIds: [] });
  });

  it('de-duplicates a transferId shared across multiple removed rows', async () => {
    const ctx = setup([{ id: 5, fromTransactionId: 10, toTransactionId: 20 }]);
    const transactions: Partial<Transaction>[] = [
      { id: 10, transferId: 5 },
      { id: 11, transferId: 5 },
    ];

    await ctx.service.cleanupTransfersForRemovedTransactions(transactions as Transaction[]);

    expect(ctx.transfersRepository.getByIds).toHaveBeenCalledWith([5]);
    expect(ctx.transfersRepository.remove).toHaveBeenCalledTimes(1);
  });
});
