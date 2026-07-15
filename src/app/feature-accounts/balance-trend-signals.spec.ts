import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type Transaction,
} from '@/core/data-access';
import { AccountsStore, CategoriesStore, TransactionsStore, TransfersStore } from '@/core/state';
import { computeZoomWindow, pickGranularityForSpan, RangeStore } from '@/core/stats';
import { balanceTrendSignals } from './balance-trend-signals';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 1000,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-01-15',
  amount: 100,
  currency: 'EUR',
  rawDescription: 'Deposit',
  fingerprint: 'fp',
  createdAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

describe('balanceTrendSignals', () => {
  const accountsRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const transfersRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const categoriesRepository = { getAll: vi.fn().mockResolvedValue([]) };

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

  it('defaults granularity from the shared range (TICKET-STAT-15)', () => {
    TestBed.runInInjectionContext(() => {
      const rangeStore = TestBed.inject(RangeStore);
      const trend = balanceTrendSignals(signal([account()]));

      expect(trend.granularity()).toBe(pickGranularityForSpan(rangeStore.from(), rangeStore.to()));
    });
  });

  it("maps the shared range onto the series' own bucket keys for the zoom window", () => {
    TestBed.runInInjectionContext(() => {
      const rangeStore = TestBed.inject(RangeStore);
      const trend = balanceTrendSignals(signal([account()]));

      const expected = computeZoomWindow(
        trend.series()[0]?.points.map((point) => point.bucketKey) ?? [],
        rangeStore.from(),
        rangeStore.to(),
        trend.granularity(),
      );
      expect(trend.zoomWindow()).toEqual(expected);
    });
  });

  it('wires jointLegContext so a joint account’s series only counts its own stake (TICKET-STAT-03)', async () => {
    const jointAccount = account({
      id: 1,
      type: 'joint',
      name: 'Joint',
      ownershipShare: 0.5,
      openingBalance: 0,
    });
    accountsRepository.getAll.mockResolvedValue([jointAccount]);

    const groceries = transaction({ id: 1, accountId: 1, amount: -200, bookingDate: '2026-01-10' });
    transactionsRepository.getAll.mockResolvedValue([groceries]);

    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(TransfersStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();

    TestBed.runInInjectionContext(() => {
      const trend = balanceTrendSignals(signal([jointAccount]));

      // jointSpend leg (negative, no transfer) counts at the 0.5 ownership share only.
      expect(trend.series()[0]?.points.at(-1)?.netWorth).toBe(-100);
    });
  });

  it('double-injection returns independent, correctly-scoped series for different account lists', () => {
    const accountA = account({ id: 1, openingBalance: 1000 });
    const accountB = account({ id: 2, openingBalance: 500 });
    accountsRepository.getAll.mockResolvedValue([accountA, accountB]);
    transactionsRepository.getAll.mockResolvedValue([]);

    TestBed.runInInjectionContext(() => {
      const trendA = balanceTrendSignals(signal([accountA]));
      const trendB = balanceTrendSignals(signal([accountA, accountB]));

      expect(trendA.series()).toHaveLength(1);
      expect(trendB.series()).toHaveLength(2);
    });
  });
});
