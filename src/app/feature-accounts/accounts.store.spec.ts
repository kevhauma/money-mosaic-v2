import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type Category,
  type Transaction,
  type Transfer,
} from '@/core/data-access';
import { CategoriesStore } from '@/feature-categories';
import { TransactionsStore, TransfersStore } from '@/feature-transactions';
import { AccountsStore } from './accounts.store';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 1000,
  openingBalanceDate: '2026-01-01',
  color: '#ffffff',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: -200,
  currency: 'EUR',
  rawDescription: 'Move to savings',
  fingerprint: 'fp',
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

describe('AccountsStore: savings movements still count toward balances (TICKET-TRF-02)', () => {
  const accountsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('includes a movement to a savings account in both accounts’ balances (FR-ACC-3)', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, accountId: 1, amount: -200, counterpartyIban: 'BE00SAVINGS' }),
      transaction({ id: 2, accountId: 2, amount: 200, counterpartyIban: 'BE00CHECKING' }),
    ]);

    const accountsStore = TestBed.inject(AccountsStore);
    accountsRepository.getAll.mockResolvedValue([
      account({ id: 1, type: 'checking', openingBalance: 1000, iban: 'BE00CHECKING' }),
      account({ id: 2, type: 'savings', openingBalance: 0, iban: 'BE00SAVINGS' }),
    ]);
    await accountsStore.hydrate();

    // The savings movement is excluded from stats, but never from balances: checking 1000 - 200,
    // savings 0 + 200.
    expect(accountsStore.balancesById().get(1)).toBe(800);
    expect(accountsStore.balancesById().get(2)).toBe(200);
  });
});

describe('AccountsStore: archive/unarchive round-trip (TICKET-NG-04)', () => {
  const accountsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('persists archiveAccount through the repository and updates the active/archived filters', async () => {
    accountsRepository.getAll.mockResolvedValue([account({ id: 1, archived: false })]);
    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    await accountsStore.archiveAccount(1);

    expect(accountsRepository.update).toHaveBeenCalledWith(1, { archived: true });
    expect(accountsStore.activeAccounts()).toHaveLength(0);
    expect(accountsStore.archivedAccounts()).toHaveLength(1);
  });

  it('persists unarchiveAccount through the repository and updates the active/archived filters', async () => {
    accountsRepository.getAll.mockResolvedValue([account({ id: 1, archived: true })]);
    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    await accountsStore.unarchiveAccount(1);

    expect(accountsRepository.update).toHaveBeenCalledWith(1, { archived: false });
    expect(accountsStore.activeAccounts()).toHaveLength(1);
    expect(accountsStore.archivedAccounts()).toHaveLength(0);
  });
});

describe('AccountsStore: manual account ordering (TICKET-ACC-04)', () => {
  const accountsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('sorts accounts by sortOrder, with accounts missing one falling after those that have it', async () => {
    accountsRepository.getAll.mockResolvedValue([
      account({ id: 1, name: 'No order A' }),
      account({ id: 2, name: 'Second', sortOrder: 10 }),
      account({ id: 3, name: 'No order B' }),
      account({ id: 4, name: 'First', sortOrder: 0 }),
    ]);
    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    expect(accountsStore.accounts().map((a) => a.id)).toEqual([4, 2, 1, 3]);
  });

  it('persists moveAccount as a sortOrder swap through the repository and reorders the computed list', async () => {
    accountsRepository.getAll.mockResolvedValue([
      account({ id: 1, name: 'A', sortOrder: 0 }),
      account({ id: 2, name: 'B', sortOrder: 10 }),
      account({ id: 3, name: 'C', sortOrder: 20 }),
    ]);
    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    await accountsStore.moveAccount(3, 'up');

    expect(accountsRepository.update).toHaveBeenCalledWith(3, { sortOrder: 10 });
    expect(accountsRepository.update).toHaveBeenCalledWith(2, { sortOrder: 20 });
    expect(accountsStore.accounts().map((a) => a.id)).toEqual([1, 3, 2]);
  });

  it('does nothing when moving the first account up', async () => {
    accountsRepository.getAll.mockResolvedValue([
      account({ id: 1, sortOrder: 0 }),
      account({ id: 2, sortOrder: 10 }),
    ]);
    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    await accountsStore.moveAccount(1, 'up');

    expect(accountsRepository.update).not.toHaveBeenCalled();
  });
});

describe('AccountsStore: contribution-based net worth for joint accounts (TICKET-STAT-03)', () => {
  const accountsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const transfersRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const categoriesRepository = { getAll: vi.fn().mockResolvedValue([]) };

  const neutralCategory: Category = {
    id: 1,
    name: 'Partner contribution',
    kind: 'neutral',
    color: '#000000',
    icon: 'users',
    archived: false,
    isSystem: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    accountsRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([]);
    transfersRepository.getAll.mockResolvedValue([]);
    categoriesRepository.getAll.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: TransfersRepository, useValue: transfersRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
      ],
    });
  });

  it('counts my stake, not the full balance, for a joint account (worked example: stake €800 vs balance €1600 at s=0.5)', async () => {
    accountsRepository.getAll.mockResolvedValue([
      account({ id: 1, type: 'joint', openingBalance: 0, ownershipShare: 0.5 }),
      account({ id: 2, type: 'checking', openingBalance: 5000 }),
    ]);
    categoriesRepository.getAll.mockResolvedValue([neutralCategory]);
    const transfer: Transfer = {
      id: 100,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-01T00:00:00.000Z',
    };
    transfersRepository.getAll.mockResolvedValue([transfer]);

    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      // I move €1000 from checking into the joint pot (linked transfer) — mineIn at 100%.
      transaction({
        id: 1,
        accountId: 1,
        amount: 1000,
        transferId: 100,
        bookingDate: '2026-07-01',
      }),
      transaction({
        id: 2,
        accountId: 2,
        amount: -1000,
        transferId: 100,
        bookingDate: '2026-07-01',
      }),
      // Partner deposits €1000, tagged as a neutral contribution — counts 0 toward my stake.
      transaction({ id: 3, accountId: 1, amount: 1000, categoryId: 1, bookingDate: '2026-07-02' }),
      // We spend €400 on groceries — my share only (€200).
      transaction({ id: 4, accountId: 1, amount: -400, bookingDate: '2026-07-03' }),
    ]);

    await TestBed.inject(CategoriesStore).hydrate();
    await TestBed.inject(TransfersStore).hydrate();
    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    expect(accountsStore.jointAccountStakeById().get(1)).toBe(800);
    expect(accountsStore.balancesById().get(1)).toBe(1600);
    expect(accountsStore.netWorth()).toBe(800 + 4000);
  });

  it('produces byte-identical net worth to today when there are no joint accounts (regression guard)', async () => {
    accountsRepository.getAll.mockResolvedValue([
      account({ id: 1, type: 'checking', openingBalance: 1000 }),
      account({ id: 2, type: 'savings', openingBalance: 500 }),
    ]);

    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, accountId: 1, amount: -100, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 200, bookingDate: '2026-07-01' }),
    ]);

    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    expect(accountsStore.netWorth()).toBe(900 + 700);
    expect(accountsStore.jointAccountStakeById().size).toBe(0);
  });

  it('exposes a per-contributor breakdown for a joint account', async () => {
    accountsRepository.getAll.mockResolvedValue([
      account({
        id: 1,
        type: 'joint',
        openingBalance: 0,
        ownershipShare: 0.5,
        coOwners: [{ name: 'Partner', ibans: ['BE71096123456769'] }],
      }),
    ]);

    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, accountId: 1, amount: 300, counterpartyIban: 'BE71096123456769' }),
      transaction({ id: 2, accountId: 1, amount: 1200, counterpartyIban: 'BE00EMPLOYER' }),
    ]);

    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    const breakdown = accountsStore.contributorBreakdownById().get(1);
    expect(breakdown?.byCoOwner.get('Partner')).toBe(300);
    expect(breakdown?.unattributed).toBe(1200);
  });
});
