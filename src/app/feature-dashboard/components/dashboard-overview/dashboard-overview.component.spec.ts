import {
  ComponentFixture,
  DeferBlockBehavior,
  DeferBlockState,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { appDb, type Transaction } from '@/core/data-access';
import { RangeStore, TransactionsStore } from '@/core/state';
import { echarts } from '@/shared/echarts';
import { DashboardLayoutSettingsStore } from '../../dashboard-layout-settings.store';
import { DashboardOverviewComponent } from './dashboard-overview.component';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: 0,
  currency: 'EUR',
  rawDescription: 'Test',
  fingerprint: 'fp',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const renderAllDeferBlocks = async (fixture: ComponentFixture<unknown>): Promise<void> => {
  for (const block of await fixture.getDeferBlocks()) {
    await block.render(DeferBlockState.Complete);
  }
};

// jsdom has no ResizeObserver; the trend chart's echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom has no real canvas 2D context. That's normally harmless for a chart that only ever gets
// change-detected once, but this spec's row-hiding tests await a real (fake-indexeddb) store
// write before a second `detectChanges()`, and that second pass drives the still-mounted trend
// chart's echarts directive into zrender's real paint path, which needs one.
const noopCanvasContext = new Proxy(
  {},
  {
    get: (target: Record<string, unknown>, prop: string) =>
      prop in target ? target[prop] : (): void => {},
    set: (target: Record<string, unknown>, prop: string, value: unknown) => {
      target[prop] = value;
      return true;
    },
  },
);
// jsdom's own `getContext` is defined but always returns null, so `??=` wouldn't replace it.
HTMLCanvasElement.prototype.getContext = (() =>
  noopCanvasContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

const configureTestBed = async (): Promise<void> => {
  await TestBed.configureTestingModule({
    imports: [DashboardOverviewComponent],
    providers: [provideRouter([]), provideEchartsCore({ echarts })],
    // Below-fold panels are wrapped in `@defer (on viewport)` (TICKET-PERF-06); jsdom has no real
    // IntersectionObserver to fire that trigger, so tests render deferred content explicitly via
    // the defer-block testing API instead of waiting on a trigger that would never fire.
    deferBlockBehavior: DeferBlockBehavior.Manual,
  }).compileComponents();
};

describe('DashboardOverviewComponent', () => {
  let component: DashboardOverviewComponent;
  let fixture: ComponentFixture<DashboardOverviewComponent>;

  /**
   * The zero-transaction empty state (TICKET-STAT-22) replaces the whole row switch, so every test
   * about row rendering has to put at least one transaction in the store first — hydrating against
   * the empty fake-indexeddb-backed repo alone would land on the empty branch instead.
   */
  const seedOneTransaction = (): void => {
    TestBed.inject(TransactionsStore).addMany([transaction()]);
  };

  /** Visible text of every button in the page header — TICKET-STAT-25 made the label the name. */
  const headerButtonLabels = (): string[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll(
        'mm-page-header button',
      ) as NodeListOf<HTMLButtonElement>,
    ).map((button) => button.textContent?.trim() ?? '');

  const settingsButton = (): HTMLButtonElement | undefined =>
    Array.from(
      fixture.nativeElement.querySelectorAll(
        'mm-page-header button',
      ) as NodeListOf<HTMLButtonElement>,
    ).find((button) => /Dashboard settings|Done/.test(button.textContent ?? ''));

  beforeEach(async () => {
    await configureTestBed();

    fixture = TestBed.createComponent(DashboardOverviewComponent);
    component = fixture.componentInstance;
    await TestBed.inject(TransactionsStore).hydrate();
    await fixture.whenStable();
  });

  afterEach(async () => {
    // Writes through the real DashboardLayoutSettingsStore/repository to the shared `appDb`
    // (fake-indexeddb is a global singleton and Vitest runs with isolate:false), so leftover rows
    // here leak into other spec files unless cleared.
    await appDb.dashboardLayoutSettings.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("omits a user-hidden row entirely, composing without error with the row's own zero-count self-hide", async () => {
    // action-queue-panel already self-hides its cards when counts are zero (no data hydrated in
    // this spec); hiding the whole row on top of that must not double-hide or throw (TICKET-STAT-14).
    seedOneTransaction();
    await TestBed.inject(DashboardLayoutSettingsStore).toggleRowHidden('action-queue');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).toBeNull();
  });

  it('does not instantiate a below-fold panel until its defer block is triggered (TICKET-PERF-06)', () => {
    seedOneTransaction();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-trend-chart-panel')).toBeNull();
  });

  it('renders a visible row that has no hidden preference once its defer block completes', async () => {
    seedOneTransaction();
    fixture.detectChanges();

    await renderAllDeferBlocks(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).not.toBeNull();
  });

  describe('periodized sub-labels (TICKET-STAT-21)', () => {
    // The 'stats' row gates on `statsStore.dataReady()` (TICKET-PERF-05), which the outer
    // `beforeEach`'s hydrate against the empty fake-indexeddb-backed repo already satisfies before
    // each test's `addMany` seeds local state — otherwise the row would show its loading skeleton
    // instead of the real stat cards.

    // Each `mm-stat-card` renders its own `.stat` block with a `.stat-title` and `.stat-desc`;
    // scope by title text rather than DOM order since the row is a plain `@for` over static markup.
    const subLabelFor = (label: string): string | null => {
      const cards = fixture.nativeElement.querySelectorAll('.stat');
      for (const card of Array.from(cards) as HTMLElement[]) {
        if (card.querySelector('.stat-title')?.textContent?.trim() === label) {
          return card.querySelector('.stat-desc')?.textContent?.trim() ?? null;
        }
      }
      return null;
    };

    it('renders €X/month · €X/week · €X/day on the Income and Expense cards for a two-month range', () => {
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-01', '2026-08-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, bookingDate: '2026-07-01', amount: 930 }),
        transaction({ id: 2, bookingDate: '2026-07-15', amount: -620 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Income')).toBe('€465.00/month · €93.00/week · €15.00/day');
      expect(subLabelFor('Expense')).toBe('€310.00/month · €62.00/week · €10.00/day');
    });

    it('drops the week/month parts for a single-day range, keeping only €X/day', () => {
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-13', '2026-07-13');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, bookingDate: '2026-07-13', amount: 60 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Income')).toBe('€60.00/day');
    });

    it('renders a "kept" net margin sub-label when net is non-negative', () => {
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, amount: 1000 }),
        transaction({ id: 2, amount: -700 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBe('30% of income kept');
    });

    it('renders an "overspent" net margin sub-label when net is negative', () => {
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, amount: 1000 }),
        transaction({ id: 2, amount: -1200 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBe('20% of income overspent');
    });

    it('leaves the net margin sub-label absent when income is zero', () => {
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([transaction({ id: 1, amount: -100 })]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBeNull();
    });

    it('reads as "kept" (not "overspent") at the net === 0 sign-flip boundary', () => {
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, amount: 1000 }),
        transaction({ id: 2, amount: -1000 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBe('0% of income kept');
    });

    it('no longer renders a "Spending rate" stat card', () => {
      seedOneTransaction();
      fixture.detectChanges();
      const titles = Array.from(
        fixture.nativeElement.querySelectorAll('.stat-title') as NodeListOf<HTMLElement>,
      ).map((el) => el.textContent?.trim());
      expect(titles).not.toContain('Spending rate');
    });
  });

  describe('page header (TICKET-STAT-25)', () => {
    it('names the settings button in visible text, not just an aria label', () => {
      seedOneTransaction();
      fixture.detectChanges();

      const button = settingsButton();
      expect(button?.textContent?.trim()).toBe('Dashboard settings');
      expect(button?.querySelector('ng-icon')).not.toBeNull();
      // The label carries the accessible name now, so there is no aria-label left to drift from it.
      expect(button?.getAttribute('aria-label')).toBeNull();
    });

    it('reads "Done" with a different icon in customize mode, and clicking it exits', () => {
      seedOneTransaction();
      fixture.detectChanges();
      // `ng-icon` renders the glyph as inline svg and this build emits no `ng-reflect-*`, so the
      // icon swap is asserted through the markup it actually draws.
      const pencilGlyph = settingsButton()?.querySelector('ng-icon')?.innerHTML;

      settingsButton()?.click();
      fixture.detectChanges();

      expect(settingsButton()?.textContent?.trim()).toBe('Done');
      const checkGlyph = settingsButton()?.querySelector('ng-icon')?.innerHTML;
      expect(checkGlyph).toBeTruthy();
      expect(checkGlyph).not.toBe(pencilGlyph);

      settingsButton()?.click();
      fixture.detectChanges();

      expect(settingsButton()?.textContent?.trim()).toBe('Dashboard settings');
      expect(settingsButton()?.querySelector('ng-icon')?.innerHTML).toBe(pencilGlyph);
    });

    it('keeps the net-worth figure in the header', () => {
      seedOneTransaction();
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('mm-page-header app-net-worth-header'),
      ).not.toBeNull();
    });

    it('renders the range switcher in the header, and a preset change re-scopes the page', () => {
      seedOneTransaction();
      fixture.detectChanges();

      const switcher = fixture.nativeElement.querySelector(
        'mm-page-header mm-range-grouping-switcher',
      );
      expect(switcher).not.toBeNull();

      const select = switcher.querySelector('select') as HTMLSelectElement;
      select.value = 'last-year';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const rangeStore = TestBed.inject(RangeStore);
      expect(rangeStore.preset('dashboard')).toBe('last-year');
      // …and only this page's range moved (TICKET-UI-23, asserted here from the Dashboard's side).
      expect(rangeStore.preset('accounts')).toBe('this-month');
    });

    it('orders the header title · range · net worth · settings (TICKET-UI-24)', () => {
      seedOneTransaction();
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('mm-page-header') as HTMLElement;
      const order = Array.from(
        header.querySelectorAll(
          'h1, app-net-worth-header, mm-range-grouping-switcher, button',
        ) as NodeListOf<HTMLElement>,
      )
        // The switcher has its own buttons; only the header's direct action buttons count.
        .filter((el) => el.tagName !== 'BUTTON' || !el.closest('mm-range-grouping-switcher'))
        .map((el) => el.tagName.toLowerCase());

      expect(order).toEqual(['h1', 'mm-range-grouping-switcher', 'app-net-worth-header', 'button']);
    });

    it('puts the range in the start group and net worth plus settings in the end group (TICKET-UI-24)', () => {
      seedOneTransaction();
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('mm-page-header') as HTMLElement;
      const startGroup = header.querySelector('.mm-page-actions-start');
      const endGroup = header.querySelector('.mm-page-actions');
      const range = header.querySelector('mm-range-grouping-switcher');
      const netWorth = header.querySelector('app-net-worth-header');

      expect(startGroup?.contains(range as Node)).toBe(true);
      expect(endGroup?.contains(range as Node)).toBe(false);
      expect(endGroup?.contains(netWorth as Node)).toBe(true);
      expect(endGroup?.contains(settingsButton() as Node)).toBe(true);
    });
  });

  describe('empty state (TICKET-STAT-22)', () => {
    it('replaces the dashboard rows with mm-empty-state when hydration finds zero transactions', () => {
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('mm-empty-state');
      expect(emptyState).not.toBeNull();
      expect(emptyState.textContent).toContain('No transactions yet');
      expect(fixture.nativeElement.querySelector('.stat')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-account-balance-strip')).toBeNull();
    });

    it('points the call-to-action at /import via routerLink', () => {
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('mm-empty-state a');
      expect(cta.getAttribute('href')).toBe('/import');
      expect(cta.textContent.trim()).toBe('Import transactions');
    });

    it('hides the dashboard-settings toggle while the empty state is showing', () => {
      fixture.detectChanges();

      expect(headerButtonLabels()).not.toContain('Dashboard settings');
    });

    it('swaps back to the row-based dashboard as soon as a transaction exists, without a reload', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('mm-empty-state')).not.toBeNull();

      seedOneTransaction();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mm-empty-state')).toBeNull();
      expect(fixture.nativeElement.querySelector('.stat')).not.toBeNull();
      expect(headerButtonLabels()).toContain('Dashboard settings');
    });

    it('stays hidden for a date range with no hits, since the dataset itself is not empty', () => {
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, bookingDate: '2020-01-01', amount: 100 }),
      ]);
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-01', '2026-07-31');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mm-empty-state')).toBeNull();
      expect(fixture.nativeElement.querySelector('.stat')).not.toBeNull();
    });
  });
});

describe('DashboardOverviewComponent before hydration (TICKET-STAT-22)', () => {
  // Its own TestBed setup, deliberately *not* awaiting `TransactionsStore.hydrate()`: the empty state
  // must not flash while the first repository read is still in flight. Angular's per-test TestBed
  // reset gives this block a fresh (un-hydrated) root store.
  beforeEach(configureTestBed);

  it('shows the loading skeleton rather than the empty state while transactions are still hydrating', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();

    expect(TestBed.inject(TransactionsStore).hydrated()).toBe(false);
    expect(fixture.nativeElement.querySelector('mm-empty-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('mm-loading-skeleton')).not.toBeNull();
  });
});
