import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountsRepository, TransactionsRepository, type Account } from '@/core/data-access';
import { AccountsStore, TransactionsStore } from '@/core/state';
import { AuthApiService, SessionStore, type PublicUser } from '@/core/auth';
import { StoreResetService } from './store-reset.service';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';

const account = (id: number, name: string): Account => ({
  id,
  name,
  type: 'checking',
  currency: 'EUR',
  openingBalance: 1000,
  openingBalanceDate: '2026-01-01',
  color: '#ffffff',
  icon: 'wallet',
  archived: false,
});

const user = (id: number, email: string): PublicUser => ({
  id,
  email,
  displayName: email,
  role: 'user',
});

describe('StoreResetService: registration', () => {
  let service: StoreResetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StoreResetService);
  });

  it('resets every registered store, and names them', () => {
    const first = vi.fn();
    const second = vi.fn();
    service.register('FirstStore', first, () => Promise.resolve());
    service.register('SecondStore', second, () => Promise.resolve());

    service.resetAll();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(service.registeredStoreNames()).toEqual(['FirstStore', 'SecondStore']);
  });

  it('registers a store once, however often it registers itself', () => {
    const reset = vi.fn();
    service.register('OnlyStore', reset, () => Promise.resolve());
    service.register('OnlyStore', reset, () => Promise.resolve());

    service.resetAll();

    expect(reset).toHaveBeenCalledOnce();
    expect(service.registeredStoreNames()).toEqual(['OnlyStore']);
  });

  it('re-hydrates every registered store on request, and resolves when all have', async () => {
    const hydrate = vi.fn().mockResolvedValue(undefined);
    service.register('FirstStore', vi.fn(), hydrate);
    service.register('SecondStore', vi.fn(), hydrate);

    await service.rehydrateAll();

    expect(hydrate).toHaveBeenCalledTimes(2);
  });
});

/**
 * The failure this whole mechanism exists to prevent (TICKET-AUTH-02): user B, signing in on the
 * browser user A just used, reading A's accounts and transactions out of stores that were never
 * torn down.
 */
describe('StoreResetService: a second user never sees the first user’s data', () => {
  const accountsRepository = { getAll: vi.fn(), update: vi.fn().mockResolvedValue(1) };
  const transactionsRepository = { getAll: vi.fn() };
  const authApi = {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        ...provideFakeApi(),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AuthApiService, useValue: authApi },
      ],
    });
  });

  it('empties the account and transaction stores at sign-out, and refills them for the next user', async () => {
    // --- A signs in, and the two stores hydrate with A's data on first injection.
    authApi.login.mockResolvedValue(user(1, 'a@example.com'));
    accountsRepository.getAll.mockResolvedValue([account(1, "A's current account")]);
    transactionsRepository.getAll.mockResolvedValue([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-06-01',
        amount: -200,
        currency: 'EUR',
        rawDescription: "A's groceries",
        fingerprint: 'fp-a',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ]);

    const session = TestBed.inject(SessionStore);
    const accountsStore = TestBed.inject(AccountsStore);
    const transactionsStore = TestBed.inject(TransactionsStore);
    await session.login('a@example.com', 'secret');
    await accountsStore.hydrate();
    await transactionsStore.hydrate();

    expect(accountsStore.accounts()).toHaveLength(1);
    expect(transactionsStore.transactions()).toHaveLength(1);

    // --- A signs out.
    await session.logout();

    expect(session.status()).toBe('anonymous');
    expect(accountsStore.accounts()).toEqual([]);
    expect(transactionsStore.transactions()).toEqual([]);

    // --- B signs in. Their own data is still in flight, and must not be substituted for by A's.
    let releaseAccounts = (): void => {};
    let releaseTransactions = (): void => {};
    accountsRepository.getAll.mockReturnValue(
      new Promise((resolve) => {
        releaseAccounts = () => resolve([account(2, "B's current account")]);
      }),
    );
    transactionsRepository.getAll.mockReturnValue(
      new Promise((resolve) => {
        releaseTransactions = () => resolve([]);
      }),
    );
    authApi.login.mockResolvedValue(user(2, 'b@example.com'));

    await session.login('b@example.com', 'secret');

    expect(accountsStore.accounts()).toEqual([]);
    expect(transactionsStore.transactions()).toEqual([]);

    // ...and once it lands, B's own hydration fills the stores again — a reset store is not a
    // permanently empty one.
    releaseAccounts();
    releaseTransactions();
    await accountsStore.hydrate();

    expect(accountsStore.accounts().map((entry) => entry.name)).toEqual(["B's current account"]);
  });
});

describe('retryOnFailure: a failed hydration is not remembered (TICKET-SRV-05)', () => {
  const accountsRepository = { getAll: vi.fn(), update: vi.fn().mockResolvedValue(1) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        ...provideFakeApi(),
        { provide: AccountsRepository, useValue: accountsRepository },
      ],
    });
  });

  it('lets the next hydrate try again after the first one rejects', async () => {
    // Against the old browser database a read effectively never rejected, so memoising the promise
    // and memoising a
    // *success* were the same thing. Over HTTP they are not — and a cached rejection would answer
    // every later hydrate, leaving the store empty until sign-out.
    accountsRepository.getAll.mockRejectedValueOnce(new Error('Http failure response: 500'));
    const store = TestBed.inject(AccountsStore);

    await expect(store.hydrate()).rejects.toThrow('Http failure response: 500');
    expect(store.accounts()).toEqual([]);

    accountsRepository.getAll.mockResolvedValue([account(1, 'Back again')]);
    await store.hydrate();

    expect(store.accounts().map((entry) => entry.name)).toEqual(['Back again']);
    expect(accountsRepository.getAll).toHaveBeenCalledTimes(2);
  });

  it('still memoises a successful hydration', async () => {
    accountsRepository.getAll.mockResolvedValue([account(1, 'Once only')]);
    const store = TestBed.inject(AccountsStore);

    await Promise.all([store.hydrate(), store.hydrate(), store.hydrate()]);

    expect(accountsRepository.getAll).toHaveBeenCalledOnce();
  });
});
