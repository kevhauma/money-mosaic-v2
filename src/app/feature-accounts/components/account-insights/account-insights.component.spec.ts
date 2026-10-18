import { Component, input, signal } from '@angular/core';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
import { provideStatsScope } from '@/feature-dashboard';
import { formatCurrency } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { AccountBalanceChartComponent } from '../account-balance-chart/account-balance-chart.component';
import { AccountInsightsComponent } from './account-insights.component';

// The real balance chart pulls in echarts/zrender, which jsdom can't paint; it has its own spec.
@Component({ selector: 'app-account-balance-chart', template: '' })
class AccountBalanceChartStubComponent {
  readonly account = input<Account>();
}

// `@defer (on viewport)` registers an IntersectionObserver even under `DeferBlockBehavior.Manual`,
// and jsdom has none. Nothing here needs the trigger to fire — the panels have their own specs.
// Stubbed per test and removed after, so it can't leak into later specs under isolate:false.
class IntersectionObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
  takeRecords = (): [] => [];
}

const checking: Account = {
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#000000',
  icon: 'wallet',
  archived: false,
};

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

describe('AccountInsightsComponent (TICKET-ACC-14)', () => {
  withCleanFormatSettings();

  let fixture: ComponentFixture<AccountInsightsComponent>;
  const transactionsRepository = { getAll: vi.fn() };

  const render = async (transactions: Transaction[]): Promise<HTMLElement> => {
    transactionsRepository.getAll.mockResolvedValue(transactions);
    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(TransactionsStore).hydrate();
    TestBed.inject(RangeStore).setCustomRange('account-detail', '2026-07-01', '2026-07-31');

    fixture = TestBed.createComponent(AccountInsightsComponent);
    fixture.componentRef.setInput('account', checking);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  const statCards = (page: HTMLElement): HTMLElement[] =>
    Array.from(page.querySelectorAll('mm-stat-card'));

  beforeEach(async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    await TestBed.configureTestingModule({
      imports: [AccountInsightsComponent],
      providers: [
        provideRouter([]),
        provideStatsScope(() => ({
          rangePage: 'account-detail',
          accountId: signal(1),
          jointMode: 'raw',
          trendChartKey: 'account-detail-trend',
        })),
        {
          provide: AccountsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([checking]) },
        },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: TransfersRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
      // The panels sit in `@defer (on viewport)`, which jsdom can never trigger; each has its own spec.
      deferBlockBehavior: DeferBlockBehavior.Manual,
    })
      .overrideComponent(AccountInsightsComponent, {
        remove: { imports: [AccountBalanceChartComponent] },
        add: { imports: [AccountBalanceChartStubComponent] },
      })
      .compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows one import empty state, and no cards or chart, for an account with no transactions at all', async () => {
    // Another account's transactions must not count as this one's.
    const page = await render([transaction({ accountId: 2 })]);

    expect(page.textContent).toContain('No transactions on this account yet');
    expect(page.querySelector('mm-empty-state a')?.getAttribute('href')).toBe('/import');
    expect(statCards(page)).toHaveLength(0);
    expect(page.querySelector('app-account-balance-chart')).toBeNull();
  });

  it('shows a no-transactions-in-range empty state instead of zeroed cards, keeping the balance chart', async () => {
    const page = await render([transaction({ bookingDate: '2026-03-10' })]);

    expect(page.textContent).toContain('No transactions in this range');
    expect(statCards(page)).toHaveLength(0);
    expect(page.querySelector('app-account-balance-chart')).not.toBeNull();
  });

  it("shows this account's income, expense, net and transfers, each drilling into it for the range", async () => {
    const page = await render([
      transaction({ id: 1, amount: -100 }),
      transaction({ id: 2, amount: 2000, rawDescription: 'Salary' }),
      transaction({ id: 3, amount: -250, transferId: 7 }),
      transaction({ id: 4, accountId: 2, amount: -999 }),
    ]);
    const cards = statCards(page);

    expect(cards.map((card) => card.querySelector('.stat-value')?.textContent?.trim())).toEqual([
      formatCurrency(2000),
      formatCurrency(100),
      formatCurrency(1900),
      `${formatCurrency(0)} / ${formatCurrency(250)}`,
    ]);
    for (const card of cards) {
      expect(card.querySelector('a')?.getAttribute('href')).toBe(
        '/transactions?from=2026-07-01&to=2026-07-31&accountId=1',
      );
    }
  });
});
