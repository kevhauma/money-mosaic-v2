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
  type Transfer,
} from '@/core/data-access';
import {
  AccountsStore,
  CategoriesStore,
  RangeStore,
  TransactionsStore,
  TransfersStore,
} from '@/core/state';
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
  mode: 'cashflow',
  trendChartKey: 'account-detail-trend',
});

/** Links checking's €500 out (12) to savings' €500 in (10) — the pair the transfer tests below add. */
const checkingToSavings: Transfer = {
  id: 1,
  fromTransactionId: 12,
  toTransactionId: 10,
  method: 'auto-iban',
  confidence: 'high',
  linkedAt: '2026-07-10T00:00:00.000Z',
};

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
      account({ id: 2, name: 'Savings', type: 'savings', iban: 'BE22 2222', color: '#22aa22' }),
      account({ id: 3, name: 'Joint', type: 'joint', ownershipShare: 0.5 }),
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        {
          provide: TransfersRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([checkingToSavings]) },
        },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    });
    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(TransfersStore).hydrate();

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

  it("reads a joint account at full amount under account detail's 'cashflow', and at my share in 'share' mode", () => {
    const cashflow = scopedStatsStore(accountDetailScope(3));
    const share = scopedStatsStore({ ...accountDetailScope(3), mode: 'share' });

    expect(cashflow.periodStats().expense).toBe(300);
    expect(share.periodStats().expense).toBe(150);
    expect(cashflow.categoryBreakdown().expenseByCategory[0]?.total).toBe(300);
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

  it("counts the account's transfer legs as income/expense under 'cashflow', and breaks them out in transferFlows", () => {
    TestBed.inject(TransactionsStore).addMany([
      transaction({ id: 10, accountId: 2, amount: 500, transferId: 1 }),
      transaction({ id: 11, accountId: 2, amount: -120, transferId: 2 }),
      transaction({ id: 12, accountId: 1, amount: -500, transferId: 1 }),
    ]);
    const savings = scopedStatsStore(accountDetailScope(2));

    expect(savings.transferFlows()).toEqual({ in: 500, out: 120 });
    expect(savings.periodStats()).toMatchObject({ income: 500, expense: 160, net: 340 });
    expect(savings.topTransactions().map((t) => t.id)).toEqual([11, 3]);
    // The Dashboard's reading of the same rows still leaves the transfer legs out.
    expect(
      scopedStatsStore({ ...accountDetailScope(2), mode: 'share' }).periodStats(),
    ).toMatchObject({ income: 0, expense: 40 });
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

  it("gives each account a transfer moves to or from its own category under 'cashflow', in that account's colour", () => {
    TestBed.inject(TransactionsStore).addMany([
      transaction({ id: 10, accountId: 2, amount: 500, transferId: 1 }),
      transaction({ id: 12, accountId: 1, amount: -500, transferId: 1 }),
      // Unlinked, but paid to the savings account's IBAN — the same move, as far as the stats know.
      transaction({ id: 13, accountId: 1, amount: -75, counterpartyIban: 'be222222' }),
    ]);
    const checking = scopedStatsStore(accountDetailScope(1));
    const savings = scopedStatsStore(accountDetailScope(2));

    const [toSavings] = checking.categoryBreakdown().expenseByCategory;
    expect(toSavings).toMatchObject({ total: 575, transactionCount: 2 });
    expect(checking.categoriesById().get(toSavings.categoryId!)).toMatchObject({
      name: 'Transfer · Savings',
      color: '#22aa22',
    });
    expect(checking.topTransactions()[0]).toMatchObject({
      id: 12,
      categoryId: toSavings.categoryId,
    });

    const fromChecking = savings
      .categoryBreakdown()
      .incomeBySource.find((entry) => entry.total === 500);
    expect(savings.categoriesById().get(fromChecking!.categoryId!)?.name).toBe(
      'Transfer · Checking',
    );
  });

  it('leaves the root instance on the real categories, and its transactions untouched', () => {
    TestBed.inject(TransactionsStore).addMany([
      transaction({ id: 12, accountId: 1, amount: -500, transferId: 1 }),
    ]);
    const root = TestBed.inject(StatsStore);
    scopedStatsStore(accountDetailScope(1));

    expect(root.categoriesById()).toBe(TestBed.inject(CategoriesStore).categoriesById());
    expect(root.transactions().find((t) => t.id === 12)?.categoryId).toBeUndefined();
  });
});
