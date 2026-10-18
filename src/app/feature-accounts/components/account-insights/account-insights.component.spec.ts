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
import { provideFakeApi } from '@/core/data-access/fake-api.testing';
import { ServerUnreachableError } from '@/core/server-status';
import { AccountsStore, RangeStore, TransactionsStore } from '@/core/state';
import { StoreResetService } from '@/core/store-reset';
import { provideStatsScope } from '@/feature-dashboard';
import { formatCurrency } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { AccountBalanceChartComponent } from '../account-balance-chart/account-balance-chart.component';
import { AccountInsightsComponent } from './account-insights.component';

// The real balance chart pulls in echarts/zrender, which jsdom can't paint; it has its own spec.
@Component({ selector: 'app-account-balance-chart', template: '' })
class AccountBalanceChartStubComponent {
  /** Instances built so far — a detached one never shows up in a DOM query (TICKET-SRV-13). */
  static created = 0;
  readonly account = input<Account>();
  constructor() {
    AccountBalanceChartStubComponent.created++;
  }
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
        // Answers every read the fakes below don't cover — e.g. the category-comparison settings
        // the scoped stats read, and the app settings behind privacy mode — the way an empty
        // account would (TICKET-SRV-13).
        ...provideFakeApi(),
        provideRouter([]),
        provideStatsScope(() => ({
          rangePage: 'account-detail',
          accountId: signal(1),
          mode: 'cashflow',
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

  it("shows this account's money in and out by sign, transfers included, each drilling into it for the range", async () => {
    const page = await render([
      transaction({ id: 1, amount: -100 }),
      transaction({ id: 2, amount: 2000, rawDescription: 'Salary' }),
      transaction({ id: 3, amount: -250, transferId: 7 }),
      transaction({ id: 4, accountId: 2, amount: -999 }),
    ]);
    const cards = statCards(page);

    expect(cards.map((card) => card.querySelector('.stat-value')?.textContent?.trim())).toEqual([
      formatCurrency(2000),
      formatCurrency(350),
      formatCurrency(1650),
      `${formatCurrency(0)} / ${formatCurrency(250)}`,
    ]);
    for (const card of cards) {
      expect(card.querySelector('a')?.getAttribute('href')).toBe(
        '/transactions?from=2026-07-01&to=2026-07-31&accountId=1',
      );
    }
  });

  describe('against a server that can be slow, down, or someone else (TICKET-SRV-13)', () => {
    const mount = (): HTMLElement => {
      TestBed.inject(RangeStore).setCustomRange('account-detail', '2026-07-01', '2026-07-31');
      fixture = TestBed.createComponent(AccountInsightsComponent);
      fixture.componentRef.setInput('account', checking);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    const buttonLabels = (page: HTMLElement): (string | undefined)[] =>
      Array.from(page.querySelectorAll('button')).map((button) => button.textContent?.trim());

    it('shows a skeleton, and no empty state, while transactions are still loading', () => {
      transactionsRepository.getAll.mockReturnValue(new Promise<Transaction[]>(() => undefined));
      const page = mount();

      // The boundary's own skeleton — a direct child — not the section's inner fallback one.
      expect(page.querySelector('mm-hydration-boundary > mm-loading-skeleton')).not.toBeNull();
      expect(page.querySelector('mm-empty-state')).toBeNull();
      expect(statCards(page)).toHaveLength(0);
    });

    it('builds no chart while another store is still loading, so echarts never sizes a detached canvas', async () => {
      // Transactions are in, categories are not: the boundary still shows its skeleton, so anything
      // this template builds now would sit outside the document.
      TestBed.overrideProvider(CategoriesRepository, {
        useValue: { getAll: () => new Promise<never>(() => undefined) },
      });
      transactionsRepository.getAll.mockResolvedValue([transaction({ amount: 2000 })]);
      AccountBalanceChartStubComponent.created = 0;
      const page = mount();
      await TestBed.inject(TransactionsStore).hydrate();
      fixture.detectChanges();

      expect(page.querySelector('mm-hydration-boundary > mm-loading-skeleton')).not.toBeNull();
      expect(AccountBalanceChartStubComponent.created).toBe(0);
    });

    it('reports a failed load with Try again rather than an empty range, and Try again recovers it', async () => {
      // Every read fails until just before Try again, so recovering without the click is impossible.
      transactionsRepository.getAll.mockRejectedValue(new ServerUnreachableError());
      const page = mount();
      const store = TestBed.inject(TransactionsStore);
      await store.hydrate().catch(() => undefined);
      fixture.detectChanges();

      expect(page.textContent).toContain('Cannot reach the server. Is it running?');
      expect(page.querySelector('mm-empty-state')).toBeNull();
      expect(page.textContent).not.toContain('No transactions');
      expect(buttonLabels(page)).toContain('Try again');

      const tryAgain = Array.from(page.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === 'Try again',
      );
      transactionsRepository.getAll.mockResolvedValue([transaction({ amount: 2000 })]);
      expect(tryAgain).toBeDefined();
      tryAgain!.click();
      // The click itself started the re-read; awaiting `hydrate()` now joins it.
      expect(store.loading()).toBe(true);
      await store.hydrate();
      fixture.detectChanges();

      expect(page.textContent).not.toContain('Cannot reach the server');
      expect(statCards(page)[0].querySelector('.stat-value')?.textContent?.trim()).toBe(
        formatCurrency(2000),
      );
    });

    it("shows the next user's figures after a sign-out, never the previous user's", async () => {
      const page = await render([transaction({ amount: 2000 })]);
      expect(statCards(page)[0].querySelector('.stat-value')?.textContent?.trim()).toBe(
        formatCurrency(2000),
      );

      // Signing out empties every registered store; the next sign-in rehydrates them from that
      // account's rows (TICKET-AUTH-02). The scoped stats hold nothing of their own to clear.
      const resets = TestBed.inject(StoreResetService);
      transactionsRepository.getAll.mockResolvedValue([transaction({ amount: 75 })]);
      resets.resetAll();
      fixture.detectChanges();

      expect(page.textContent).not.toContain(formatCurrency(2000));
      expect(page.querySelector('mm-empty-state')).toBeNull();

      await resets.rehydrateAll();
      fixture.detectChanges();

      expect(statCards(page)[0].querySelector('.stat-value')?.textContent?.trim()).toBe(
        formatCurrency(75),
      );
      expect(page.textContent).not.toContain(formatCurrency(2000));
    });
  });
});
