import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  appDb,
  AccountsRepository,
  TransactionsRepository,
  TransfersRepository,
  type Transaction,
  type Transfer,
} from '@/core/data-access';
import { AccountDeletionService } from './account-deletion.service';

const setup = (options: {
  transactions: Partial<Transaction>[];
  transfers?: Partial<Transfer>[];
}) => {
  const transfersById = new Map(
    (options.transfers ?? []).map((transfer) => [transfer.id!, transfer]),
  );

  const accountsRepository = {
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    getByAccount: vi.fn().mockResolvedValue(options.transactions),
    bulkRemove: vi.fn().mockResolvedValue(undefined),
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
      AccountDeletionService,
      { provide: AccountsRepository, useValue: accountsRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: TransfersRepository, useValue: transfersRepository },
    ],
  });

  return {
    service: TestBed.inject(AccountDeletionService),
    accountsRepository,
    transactionsRepository,
    transfersRepository,
  };
};

describe('AccountDeletionService: clearTransactions', () => {
  // The cascade runs inside `appDb.transaction('rw', ...)`; stub it to synchronously invoke the scope
  // so we exercise the repository calls without a real IndexedDB.
  beforeEach(() => {
    // `Dexie.transaction` is heavily overloaded; a positional 3-arg impl matches the wrong overload,
    // so accept a variadic arg list and invoke the trailing scope callback.
    vi.spyOn(appDb, 'transaction').mockImplementation(((...args: unknown[]) =>
      (args[args.length - 1] as () => unknown)()) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes all of the target account's transactions but leaves the account row intact", async () => {
    const ctx = setup({
      transactions: [
        { id: 10, accountId: 1 },
        { id: 11, accountId: 1 },
      ],
    });

    const result = await ctx.service.clearTransactions(1);

    // Only the target account was read, and exactly its transactions were removed — other accounts'
    // rows are never touched because `getByAccount(1)` is the only source of ids.
    expect(ctx.transactionsRepository.getByAccount).toHaveBeenCalledWith(1);
    expect(ctx.transactionsRepository.bulkRemove).toHaveBeenCalledWith([10, 11]);
    expect(result.removedTransactionIds).toEqual([10, 11]);
    // The account itself must survive.
    expect(ctx.accountsRepository.remove).not.toHaveBeenCalled();
  });

  it('un-links the surviving side of a transfer to a different account instead of leaving it dangling', async () => {
    const ctx = setup({
      transactions: [{ id: 10, accountId: 1, transferId: 5 }],
      transfers: [{ id: 5, fromTransactionId: 10, toTransactionId: 20 }],
    });

    const result = await ctx.service.clearTransactions(1);

    expect(ctx.transfersRepository.remove).toHaveBeenCalledWith(5);
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(20, { transferId: undefined });
    expect(ctx.transactionsRepository.bulkRemove).toHaveBeenCalledWith([10]);
    expect(result.unlinkedTransferIds).toEqual([5]);
    expect(result.clearedTransferTransactionIds).toEqual([20]);
    expect(ctx.accountsRepository.remove).not.toHaveBeenCalled();
  });

  it('is a safe no-op when the account has no transactions', async () => {
    const ctx = setup({ transactions: [] });

    const result = await ctx.service.clearTransactions(1);

    expect(ctx.transactionsRepository.bulkRemove).toHaveBeenCalledWith([]);
    expect(ctx.transfersRepository.remove).not.toHaveBeenCalled();
    expect(ctx.transactionsRepository.update).not.toHaveBeenCalled();
    expect(ctx.accountsRepository.remove).not.toHaveBeenCalled();
    expect(result).toEqual({
      removedTransactionIds: [],
      unlinkedTransferIds: [],
      clearedTransferTransactionIds: [],
    });
  });

  it('deleteAccount reuses the same cascade and additionally removes the account row', async () => {
    const ctx = setup({
      transactions: [{ id: 10, accountId: 1, transferId: 5 }],
      transfers: [{ id: 5, fromTransactionId: 10, toTransactionId: 20 }],
    });

    await ctx.service.deleteAccount(1);

    // Same cross-account cleanup as clearTransactions...
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(20, { transferId: undefined });
    expect(ctx.transactionsRepository.bulkRemove).toHaveBeenCalledWith([10]);
    // ...plus the account row is removed.
    expect(ctx.accountsRepository.remove).toHaveBeenCalledWith(1);
  });
});
