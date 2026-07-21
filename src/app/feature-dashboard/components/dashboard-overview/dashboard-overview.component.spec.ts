import {
  ComponentFixture,
  DeferBlockBehavior,
  DeferBlockState,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { appDb, type Transaction } from '@/core/data-access';
import { TransactionsStore } from '@/core/state';
import { RangeStore } from '@/core/stats';
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

describe('DashboardOverviewComponent', () => {
  let component: DashboardOverviewComponent;
  let fixture: ComponentFixture<DashboardOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts })],
      // Below-fold panels are wrapped in `@defer (on viewport)` (TICKET-PERF-06); jsdom has no real
      // IntersectionObserver to fire that trigger, so tests render deferred content explicitly via
      // the defer-block testing API instead of waiting on a trigger that would never fire.
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardOverviewComponent);
    component = fixture.componentInstance;
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
    await TestBed.inject(DashboardLayoutSettingsStore).toggleRowHidden('action-queue');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).toBeNull();
  });

  it('does not instantiate a below-fold panel until its defer block is triggered (TICKET-PERF-06)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-trend-chart-panel')).toBeNull();
  });

  it('renders a visible row that has no hidden preference once its defer block completes', async () => {
    fixture.detectChanges();

    await renderAllDeferBlocks(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).not.toBeNull();
  });

  describe('periodized sub-labels (TICKET-STAT-21)', () => {
    // The 'stats' row gates on `statsStore.dataReady()` (TICKET-PERF-05); hydrate against the empty
    // fake-indexeddb-backed repo first so it's true before each test's `addMany` seeds local state,
    // otherwise the row would show its loading skeleton instead of the real stat cards.
    beforeEach(async () => {
      await TestBed.inject(TransactionsStore).hydrate();
    });

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
      TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-08-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, bookingDate: '2026-07-01', amount: 930 }),
        transaction({ id: 2, bookingDate: '2026-07-15', amount: -620 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Income')).toBe('€465.00/month · €93.00/week · €15.00/day');
      expect(subLabelFor('Expense')).toBe('€310.00/month · €62.00/week · €10.00/day');
    });

    it('drops the week/month parts for a single-day range, keeping only €X/day', () => {
      TestBed.inject(RangeStore).setCustomRange('2026-07-13', '2026-07-13');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, bookingDate: '2026-07-13', amount: 60 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Income')).toBe('€60.00/day');
    });

    it('renders a "kept" net margin sub-label when net is non-negative', () => {
      TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, amount: 1000 }),
        transaction({ id: 2, amount: -700 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBe('30% of income kept');
    });

    it('renders an "overspent" net margin sub-label when net is negative', () => {
      TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, amount: 1000 }),
        transaction({ id: 2, amount: -1200 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBe('20% of income overspent');
    });

    it('leaves the net margin sub-label absent when income is zero', () => {
      TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([transaction({ id: 1, amount: -100 })]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBeNull();
    });

    it('reads as "kept" (not "overspent") at the net === 0 sign-flip boundary', () => {
      TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, amount: 1000 }),
        transaction({ id: 2, amount: -1000 }),
      ]);
      fixture.detectChanges();

      expect(subLabelFor('Net cash flow')).toBe('0% of income kept');
    });

    it('no longer renders a "Spending rate" stat card', () => {
      fixture.detectChanges();
      const titles = Array.from(
        fixture.nativeElement.querySelectorAll('.stat-title') as NodeListOf<HTMLElement>,
      ).map((el) => el.textContent?.trim());
      expect(titles).not.toContain('Spending rate');
    });
  });
});
