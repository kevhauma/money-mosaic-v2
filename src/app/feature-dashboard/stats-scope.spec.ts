import { createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
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
import { AccountsStore, RangeStore, TransactionsStore } from '@/core/state';
import type { StatsScope } from './stats-scope';
import { provideStatsScope, StatsStore } from './stats.store';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#000000',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-10',
  amount: -100,
  currency: 'EUR',
  rawDescription: 'Shop',
  fingerprint: 'fp',
  createdAt: '2026-07-10T00:00:00.000Z',
  ...overrides,
});

const accountDetailScope = (accountId: number): StatsScope => ({
  rangePage: 'account-detail',
  accountId: signal(accountId),
  jointMode: 'raw',
  trendChartKey: 'account-detail-trend',
});

describe('StatsStore: scoped by STATS_SCOPE (TICKET-ACC-14)', () => {
  const accountsRepository = { getAll: vi.fn() };

  /** A component-level instance, as `provideStatsScope` gives account detail, beside the root one. */
  const scopedStatsStore = (scope: StatsScope): InstanceType<typeof StatsStore> =>
    createEnvironmentInjector(
      provideStatsScope(() => scope),
      TestBed.inject(EnvironmentInjector),
    ).get(StatsStore);

  beforeEach(async () => {
    accountsRepository.getAll.mockResolvedValue([
      account({ id: 1 }),
      account({ id: 2, name: 'Savings', type: 'savings' }),
      account({ id: 3, name: 'Joint', type: 'joint', ownershipShare: 0.5 }),
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: TransfersRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    });
    await TestBed.inject(AccountsStore).hydrate();

    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setCustomRange('dashboard', '2026-07-01', '2026-07-31');
    rangeStore.setCustomRange('account-detail', '2026-07-01', '2026-07-31');

    TestBed.inject(TransactionsStore).addMany([
      transaction({ id: 1, accountId: 1, amount: -100 }),
      transaction({ id: 2, accountId: 1, amount: 2000, rawDescription: 'Salary' }),
      transaction({ id: 3, accountId: 2, amount: -40 }),
      transaction({ id: 4, accountId: 3, amount: -300 }),
    ]);
  });

  it("returns only the given account's figures", () => {
    const stats = scopedStatsStore(accountDetailScope(1));

    expect(stats.transactions().map((t) => t.id)).toEqual([1, 2]);
    expect(stats.periodStats()).toMatchObject({ income: 2000, expense: 100, net: 1900 });
    expect(stats.topTransactions().map((t) => t.id)).toEqual([1]);
  });

  it('leaves the unscoped root instance reading every account', () => {
    TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-01', '2026-07-31');
    const root = TestBed.inject(StatsStore);
    scopedStatsStore(accountDetailScope(1));

    expect(root.transactions()).toBe(TestBed.inject(TransactionsStore).transactions());
    // 100 + 40 on own accounts, plus my 50% share of the €300 joint expense.
    expect(root.periodStats()).toMatchObject({ income: 2000, expense: 290 });
  });

  it("reads a joint account at full amount in 'raw' mode, and at my share in 'share' mode", () => {
    const raw = scopedStatsStore(accountDetailScope(3));
    const share = scopedStatsStore({ ...accountDetailScope(3), jointMode: 'share' });

    expect(raw.periodStats().expense).toBe(300);
    expect(share.periodStats().expense).toBe(150);
    expect(raw.categoryBreakdown().expenseByCategory[0]?.total).toBe(300);
  });

  it("follows the 'account-detail' range, independent of the Dashboard's", () => {
    const rangeStore = TestBed.inject(RangeStore);
    const scoped = scopedStatsStore(accountDetailScope(1));
    const root = TestBed.inject(StatsStore);

    rangeStore.setCustomRange('account-detail', '2026-08-01', '2026-08-31');

    expect(scoped.from()).toBe('2026-08-01');
    expect(scoped.periodStats().expense).toBe(0);
    expect(scoped.hasTransactionsInRange()).toBe(false);
    expect(root.from()).toBe('2026-07-01');
    expect(root.periodStats().income).toBe(2000);

    rangeStore.setCustomRange('dashboard', '2026-01-01', '2026-01-31');

    expect(scoped.from()).toBe('2026-08-01');
  });

  it('sums the account’s linked transfer legs in both directions, kept out of income/expense', () => {
    TestBed.inject(TransactionsStore).addMany([
      transaction({ id: 10, accountId: 2, amount: 500, transferId: 1 }),
      transaction({ id: 11, accountId: 2, amount: -120, transferId: 2 }),
      transaction({ id: 12, accountId: 1, amount: -500, transferId: 1 }),
    ]);
    const savings = scopedStatsStore(accountDetailScope(2));

    expect(savings.transferFlows()).toEqual({ in: 500, out: 120 });
    expect(savings.periodStats()).toMatchObject({ income: 0, expense: 40 });
  });

  it('adds the account to every drill-down, which the root scope leaves off', () => {
    const scoped = scopedStatsStore(accountDetailScope(2));
    const root = TestBed.inject(StatsStore);

    expect(scoped.drilldownScope()).toEqual({ from: '2026-07-01', to: '2026-07-31', accountId: 2 });
    expect(root.drilldownScope()).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
      accountId: undefined,
    });
  });
});
