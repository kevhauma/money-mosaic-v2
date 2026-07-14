import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { pickGranularityForSpan, RangeStore } from '@/core/stats';
import { CategoriesStore, TransactionsStore } from '@/core/state';
import { echarts } from '@/shared/echarts';
import { TrendChartPanelComponent } from './trend-chart-panel.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const groceries: Category = {
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#ff0000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
};

const salary: Category = {
  id: 2,
  name: 'Salary',
  kind: 'income',
  color: '#00ff00',
  icon: 'cash',
  archived: false,
  isSystem: false,
};

describe('TrendChartPanelComponent', () => {
  let fixture: ComponentFixture<TrendChartPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendChartPanelComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        { provide: CategoriesRepository, useValue: { add: vi.fn().mockResolvedValue(1) } },
      ],
    }).compileComponents();

    TestBed.inject(RangeStore).setCustomRange('2026-01-01', '2026-02-28');

    fixture = TestBed.createComponent(TrendChartPanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defaults its local granularity control from pickGranularityForSpan for the current shared date range (TICKET-STAT-15)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const expected = pickGranularityForSpan(rangeStore.from(), rangeStore.to());

    expect(fixture.componentInstance['granularity']()).toBe(expected);
  });

  it("changing its local granularity control changes both charts' buckets (TICKET-STAT-15)", async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-01-10',
        amount: -50,
        currency: 'EUR',
        rawDescription: 'Supermarket',
        fingerprint: 'fp-1',
        createdAt: '2026-01-10T00:00:00.000Z',
        categoryId: 1,
      },
    ]);

    fixture.componentInstance['granularity'].set('day');
    const dayBucketCount = (
      fixture.componentInstance['expenseChartOption']()['xAxis'] as { data: string[] }
    ).data.length;

    fixture.componentInstance['granularity'].set('month');
    const monthBucketCount = (
      fixture.componentInstance['expenseChartOption']()['xAxis'] as { data: string[] }
    ).data.length;
    const incomeMonthBucketCount = (
      fixture.componentInstance['incomeChartOption']()['xAxis'] as { data: string[] }
    ).data.length;

    expect(monthBucketCount).toBe(2);
    expect(incomeMonthBucketCount).toBe(2);
    expect(monthBucketCount).not.toBe(dayBucketCount);
  });

  it('renders one stacked bar series per top-N category, coloured with the category color', async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-01-10',
        amount: -50,
        currency: 'EUR',
        rawDescription: 'Supermarket',
        fingerprint: 'fp-1',
        createdAt: '2026-01-10T00:00:00.000Z',
        categoryId: 1,
      },
    ]);

    const option = fixture.componentInstance['expenseChartOption']() as {
      series: { name: string; stack: string; itemStyle: { color: string } }[];
    };

    expect(option.series).toHaveLength(1);
    expect(option.series[0].name).toBe('Groceries');
    expect(option.series[0].stack).toBe('expense');
    expect(option.series[0].itemStyle.color).toBe('#ff0000');
  });

  it('renders both charts on the same shared y-axis max', async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    await TestBed.inject(CategoriesStore).addCategory(salary);
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-01-10',
        amount: -50,
        currency: 'EUR',
        rawDescription: 'Supermarket',
        fingerprint: 'fp-1',
        createdAt: '2026-01-10T00:00:00.000Z',
        categoryId: 1,
      },
      {
        id: 2,
        accountId: 1,
        bookingDate: '2026-01-15',
        amount: 3000,
        currency: 'EUR',
        rawDescription: 'Payroll',
        fingerprint: 'fp-2',
        createdAt: '2026-01-15T00:00:00.000Z',
        categoryId: 2,
      },
    ]);

    const expenseMax = (
      fixture.componentInstance['expenseChartOption']()['yAxis'] as { max: number }
    ).max;
    const incomeMax = (fixture.componentInstance['incomeChartOption']()['yAxis'] as { max: number })
      .max;

    expect(expenseMax).toBe(3000);
    expect(incomeMax).toBe(3000);
  });

  it('clicking a stacked segment navigates to /transactions filtered by that bucket range and category', async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-01-10',
        amount: -50,
        currency: 'EUR',
        rawDescription: 'Supermarket',
        fingerprint: 'fp-1',
        createdAt: '2026-01-10T00:00:00.000Z',
        categoryId: 1,
      },
    ]);
    fixture.componentInstance['granularity'].set('month');

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['onExpenseChartClick']({ seriesIndex: 0, dataIndex: 0 } as never);

    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['/transactions'], {
      queryParams: { from: '2026-01-01', to: '2026-01-31', categoryId: '1' },
    });
  });
});
