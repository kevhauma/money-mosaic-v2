import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type Transaction,
} from '@/core/data-access';
import { RangeStore, TransactionsStore } from '@/core/state';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { ExploreOverviewComponent } from './explore-overview.component';

stubEchartsBrowserApis();

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-06',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Supermarket',
  fingerprint: 'fp-1',
  createdAt: '2026-07-06T00:00:00.000Z',
  ...overrides,
});

/**
 * `TransactionsStore` self-hydrates on first injection (TICKET-PERF-07), so the repository has to
 * be faked *before* the component is created — re-faking afterwards hits the cached hydration and
 * changes nothing.
 */
const createFixture = async (
  transactions: Transaction[],
): Promise<ComponentFixture<ExploreOverviewComponent>> => {
  await TestBed.configureTestingModule({
    imports: [ExploreOverviewComponent],
    providers: [
      provideRouter([]),
      provideEchartsCore({ echarts }),
      {
        provide: TransactionsRepository,
        useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
      },
      { provide: AccountsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ExploreOverviewComponent);
  await TestBed.inject(TransactionsStore).hydrate();
  fixture.detectChanges();
  return fixture;
};

describe('ExploreOverviewComponent (TICKET-EXP-01)', () => {
  it('renders the empty state, and not the chart sections, when there are no transactions', async () => {
    const fixture = await createFixture([]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Nothing to explore yet');
    expect(host.querySelector('mm-empty-state')).not.toBeNull();
    expect(host.querySelector('app-money-flow-panel mm-paper')).toBeNull();
  });

  it('renders the chart sections, and not the empty state, once transactions exist', async () => {
    const fixture = await createFixture([transaction()]);
    TestBed.inject(RangeStore).setCustomRange('explore', '2026-07-01', '2026-07-31');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-empty-state')).toBeNull();
    expect(host.querySelector('app-money-flow-panel mm-paper')).not.toBeNull();
    expect(host.textContent).not.toContain('Nothing moved in this range');
  });

  it('says the range is empty, rather than going blank, when data exists but none is in range', async () => {
    const fixture = await createFixture([transaction({ bookingDate: '2026-07-10' })]);
    TestBed.inject(RangeStore).setCustomRange('explore', '2026-01-01', '2026-01-31');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-empty-state')).toBeNull();
    expect(host.querySelector('app-money-flow-panel mm-paper')).toBeNull();
    expect(host.textContent).toContain('Nothing moved in this range');
    // The recurring sections moved to /recurring precisely because they never obeyed this range —
    // nothing on this page may now survive an empty one.
    expect(host.querySelector('app-recurring-payments-panel')).toBeNull();
    expect(host.querySelector('app-bills-calendar')).toBeNull();
  });

  it('renders the page header with the Explore range switcher bound to it', async () => {
    const fixture = await createFixture([transaction()]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')?.textContent).toContain('Explore');
    expect(host.querySelector('mm-range-grouping-switcher')).not.toBeNull();
  });

  it('drives the "explore" range key, leaving the Dashboard range where it was', async () => {
    const fixture = await createFixture([transaction()]);
    const rangeStore = TestBed.inject(RangeStore);
    const dashboardFrom = rangeStore.from('dashboard');

    rangeStore.setCustomRange('explore', '2024-02-01', '2024-02-29');
    fixture.detectChanges();

    expect(rangeStore.from('explore')).toBe('2024-02-01');
    expect(rangeStore.from('dashboard')).toBe(dashboardFrom);
  });
});
