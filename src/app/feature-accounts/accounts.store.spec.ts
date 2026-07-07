import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  TransactionsRepository,
  type Account,
  type Transaction,
} from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
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
