import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  appDb,
  AccountsRepository,
  TransactionsRepository,
  type Transaction,
} from '@/core/data-access';
import { TransferCleanupService, type RemoveTransactionsWithCleanupResult } from '@/core/transfers';
import { AccountDeletionService } from './account-deletion.service';

const setup = (options: {
  transactions: Partial<Transaction>[];
  cleanupResult?: RemoveTransactionsWithCleanupResult;
}) => {
  const accountsRepository = {
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    getByAccount: vi.fn().mockResolvedValue(options.transactions),
  };
  const transferCleanupService = {
    removeTransactionsWithTransferCleanup: vi.fn().mockResolvedValue(
      options.cleanupResult ?? {
        removedTransactionIds: options.transactions.map((transaction) => transaction.id!),
        unlinkedTransferIds: [],
        clearedTransferTransactionIds: [],
      },
    ),
  };

  TestBed.configureTestingModule({
    providers: [
      AccountDeletionService,
      { provide: AccountsRepository, useValue: accountsRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: TransferCleanupService, useValue: transferCleanupService },
    ],
  });

  return {
    service: TestBed.inject(AccountDeletionService),
    accountsRepository,
    transactionsRepository,
    transferCleanupService,
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
    const transactions = [
      { id: 10, accountId: 1 },
      { id: 11, accountId: 1 },
    ];
    const ctx = setup({
      transactions,
      cleanupResult: {
        removedTransactionIds: [10, 11],
        unlinkedTransferIds: [],
        clearedTransferTransactionIds: [],
      },
    });

    const result = await ctx.service.clearTransactions(1);

    // Only the target account was read, and exactly its transactions were removed — other accounts'
    // rows are never touched because `getByAccount(1)` is the only source of ids.
    expect(ctx.transactionsRepository.getByAccount).toHaveBeenCalledWith(1);
    expect(ctx.transferCleanupService.removeTransactionsWithTransferCleanup).toHaveBeenCalledWith(
      transactions,
    );
    expect(result.removedTransactionIds).toEqual([10, 11]);
    // The account itself must survive.
    expect(ctx.accountsRepository.remove).not.toHaveBeenCalled();
  });

  it('delegates removal + transfer cleanup to the shared TransferCleanupService and forwards its result', async () => {
    const transactions = [{ id: 10, accountId: 1, transferId: 5 }];
    const ctx = setup({
      transactions,
      cleanupResult: {
        removedTransactionIds: [10],
        unlinkedTransferIds: [5],
        clearedTransferTransactionIds: [20],
      },
    });

    const result = await ctx.service.clearTransactions(1);

    expect(ctx.transferCleanupService.removeTransactionsWithTransferCleanup).toHaveBeenCalledWith(
      transactions,
    );
    expect(result).toEqual({
      removedTransactionIds: [10],
      unlinkedTransferIds: [5],
      clearedTransferTransactionIds: [20],
    });
    expect(ctx.accountsRepository.remove).not.toHaveBeenCalled();
  });

  it('is a safe no-op when the account has no transactions', async () => {
    const ctx = setup({
      transactions: [],
      cleanupResult: {
        removedTransactionIds: [],
        unlinkedTransferIds: [],
        clearedTransferTransactionIds: [],
      },
    });

    const result = await ctx.service.clearTransactions(1);

    expect(ctx.transferCleanupService.removeTransactionsWithTransferCleanup).toHaveBeenCalledWith(
      [],
    );
    expect(ctx.accountsRepository.remove).not.toHaveBeenCalled();
    expect(result).toEqual({
      removedTransactionIds: [],
      unlinkedTransferIds: [],
      clearedTransferTransactionIds: [],
    });
  });

  it('deleteAccount reuses the same cascade and additionally removes the account row', async () => {
    const transactions = [{ id: 10, accountId: 1, transferId: 5 }];
    const ctx = setup({
      transactions,
      cleanupResult: {
        removedTransactionIds: [10],
        unlinkedTransferIds: [5],
        clearedTransferTransactionIds: [20],
      },
    });

    await ctx.service.deleteAccount(1);

    // Same cross-account cleanup as clearTransactions...
    expect(ctx.transferCleanupService.removeTransactionsWithTransferCleanup).toHaveBeenCalledWith(
      transactions,
    );
    // ...plus the account row is removed.
    expect(ctx.accountsRepository.remove).toHaveBeenCalledWith(1);
  });
});
