import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountsRepository, TransactionsRepository } from '@/core/data-access';
import { TransferLinkingService } from '@/core/transfers';
import { AccountsStore, TransactionsStore, TransfersStore, CategoriesStore } from '@/core/state';
import { DevSeedService } from './dev-seed.service';

const SEED_CATEGORIES = [
  { id: 1, name: 'Groceries' },
  { id: 4, name: 'Housing' },
  { id: 3, name: 'Subscriptions' },
  { id: 7, name: 'Utilities' },
  { id: 6, name: 'Eating Out' },
  { id: 5, name: 'Transport' },
  { id: 9, name: 'Salary' },
  { id: 10, name: 'Other Income' },
];

const NOW = new Date(2026, 5, 15);

const setup = (options: { accounts: unknown[]; transactionCount: number }) => {
  const accountsRepository = {
    getAll: vi.fn().mockResolvedValue(options.accounts),
    add: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2),
  };
  const transactionsRepository = {
    count: vi.fn().mockResolvedValue(options.transactionCount),
    bulkAdd: vi.fn().mockImplementation(async (rows: unknown[]) => rows.map((_, i) => i + 1)),
  };
  const transferLinkingService = { linkAuto: vi.fn().mockResolvedValue(undefined) };
  const accountsStore = { hydrate: vi.fn().mockResolvedValue(undefined) };
  const transactionsStore = { hydrate: vi.fn().mockResolvedValue(undefined) };
  const transfersStore = { hydrate: vi.fn().mockResolvedValue(undefined) };
  const categoriesStore = { categories: () => SEED_CATEGORIES };

  TestBed.configureTestingModule({
    providers: [
      DevSeedService,
      { provide: AccountsRepository, useValue: accountsRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: TransferLinkingService, useValue: transferLinkingService },
      { provide: AccountsStore, useValue: accountsStore },
      { provide: TransactionsStore, useValue: transactionsStore },
      { provide: TransfersStore, useValue: transfersStore },
      { provide: CategoriesStore, useValue: categoriesStore },
    ],
  });

  return {
    service: TestBed.inject(DevSeedService),
    accountsRepository,
    transactionsRepository,
    transferLinkingService,
    accountsStore,
    transactionsStore,
    transfersStore,
  };
};

describe('DevSeedService: seedIfEmpty', () => {
  it('writes the dataset and re-hydrates the stores when the database is empty', async () => {
    const ctx = setup({ accounts: [], transactionCount: 0 });

    const written = await ctx.service.seedIfEmpty(NOW);

    expect(written).toBeGreaterThanOrEqual(20);
    expect(ctx.accountsRepository.add).toHaveBeenCalledTimes(2);

    expect(ctx.transactionsRepository.bulkAdd).toHaveBeenCalledTimes(1);
    const rows = ctx.transactionsRepository.bulkAdd.mock.calls[0][0] as { fingerprint: string }[];
    expect(rows.length).toBe(written);
    // Fingerprints were finalised to the stored `<base>|<occurrence>` form (same invariant as imports).
    expect(rows.every((row) => /\|\d+$/.test(row.fingerprint))).toBe(true);

    expect(ctx.transferLinkingService.linkAuto).toHaveBeenCalled();
    expect(ctx.accountsStore.hydrate).toHaveBeenCalledTimes(1);
    expect(ctx.transactionsStore.hydrate).toHaveBeenCalledTimes(1);
    expect(ctx.transfersStore.hydrate).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when accounts already exist', async () => {
    const ctx = setup({ accounts: [{ id: 1 }], transactionCount: 0 });

    const written = await ctx.service.seedIfEmpty(NOW);

    expect(written).toBe(0);
    expect(ctx.accountsRepository.add).not.toHaveBeenCalled();
    expect(ctx.transactionsRepository.bulkAdd).not.toHaveBeenCalled();
    expect(ctx.transferLinkingService.linkAuto).not.toHaveBeenCalled();
    expect(ctx.transactionsStore.hydrate).not.toHaveBeenCalled();
  });

  it('is a no-op when transactions already exist', async () => {
    const ctx = setup({ accounts: [], transactionCount: 5 });

    const written = await ctx.service.seedIfEmpty(NOW);

    expect(written).toBe(0);
    expect(ctx.accountsRepository.add).not.toHaveBeenCalled();
    expect(ctx.transactionsRepository.bulkAdd).not.toHaveBeenCalled();
    expect(ctx.transferLinkingService.linkAuto).not.toHaveBeenCalled();
  });
});
