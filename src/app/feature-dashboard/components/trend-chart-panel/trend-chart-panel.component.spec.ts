import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { pickGranularityForSpan } from '@/core/stats';
import { CategoriesStore, RangeStore, TransactionsStore } from '@/core/state';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { TrendChartPanelComponent } from './trend-chart-panel.component';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';

stubEchartsBrowserApis();

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
  // These assertions read formatted currency, and format-settings.ts's signals are process-global
  // under isolate:false — pin them so another spec file's locale/symbol can't reach in here.
  withCleanFormatSettings();

  let fixture: ComponentFixture<TrendChartPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendChartPanelComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        {
          provide: CategoriesRepository,
          // CategoriesStore self-hydrates on injection (TICKET-PERF-07); tests seed via addCategory.
          useValue: { add: vi.fn().mockResolvedValue(1), getAll: vi.fn().mockResolvedValue([]) },
        },
      ],
    }).compileComponents();

    TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-01-01', '2026-02-28');

    fixture = TestBed.createComponent(TrendChartPanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defaults its local granularity control from pickGranularityForSpan for the current shared date range (TICKET-STAT-15)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const expected = pickGranularityForSpan(
      rangeStore.from('dashboard'),
      rangeStore.to('dashboard'),
    );

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

    fixture.componentInstance['setGranularity']('day');
    const dayBucketCount = (
      fixture.componentInstance['expenseChartOption']()['xAxis'] as { data: string[] }
    ).data.length;

    fixture.componentInstance['setGranularity']('month');
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

  it("draws each column's legend in a top strip with the grid grown to clear it (TICKET-STAT-26)", async () => {
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

    for (const key of ['expenseChartOption', 'incomeChartOption'] as const) {
      const option = fixture.componentInstance[key]() as {
        legend: { type: string; top: number };
        grid: { top: number };
      };

      // Was `legend: { data }` against `grid: { top: 32 }` — five stacked categories wrapped the
      // legend onto a second line and the bars ran under it.
      expect(option.legend.type).toBe('scroll');
      expect(option.grid.top).toBeGreaterThan(32);
      expect(option.grid.top).toBeGreaterThan(option.legend.top);
    }
  });

  it("states each column's legend selection, and the two columns' filters stay apart (TICKET-STAT-27)", async () => {
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
        bookingDate: '2026-01-25',
        amount: 3000,
        currency: 'EUR',
        rawDescription: 'Payslip',
        fingerprint: 'fp-2',
        createdAt: '2026-01-25T00:00:00.000Z',
        categoryId: 2,
      },
    ]);
    const selectedOf = (key: 'expenseChartOption' | 'incomeChartOption'): Record<string, boolean> =>
      (fixture.componentInstance[key]() as { legend: { selected: Record<string, boolean> } }).legend
        .selected;

    fixture.componentInstance['onExpenseLegendSelectChanged']({ selected: { Groceries: false } });
    // The bucket change is what used to put it back: the option is rebuilt and applied notMerge.
    fixture.componentInstance['setGranularity']('day');
    TestBed.tick();

    expect(selectedOf('expenseChartOption')).toEqual({ Groceries: false });
    // The income column lists its own one series — whatever it's named, nothing there was toggled.
    expect(Object.values(selectedOf('incomeChartOption'))).toEqual([true]);
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
    fixture.componentInstance['setGranularity']('month');

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['onExpenseChartClick']({ seriesIndex: 0, dataIndex: 0 } as never);

    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['/transactions'], {
      queryParams: { from: '2026-01-01', to: '2026-01-31', categoryId: '1' },
    });
  });

  describe('accessible sr-only table (TICKET-STAT-20)', () => {
    beforeEach(async () => {
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
      fixture.componentInstance['setGranularity']('month');
    });

    it('exposes one accessible row per bucket, matching the same series signal the charts render from', () => {
      const rows = fixture.componentInstance['accessibleRows']();
      const bucketKeys = (
        fixture.componentInstance['expenseChartOption']()['xAxis'] as { data: string[] }
      ).data;

      expect(rows.map((row) => row.bucketKey)).toEqual(bucketKeys);
      const januaryRow = rows.find((row) => row.bucketKey === '2026-01');
      expect(januaryRow?.income).toContain('3.000');
      expect(januaryRow?.expense).toContain('50');
    });

    it('updates the accessible rows when granularity changes, just like the charts', () => {
      const monthRowCount = fixture.componentInstance['accessibleRows']().length;

      fixture.componentInstance['setGranularity']('day');
      const dayRowCount = fixture.componentInstance['accessibleRows']().length;

      expect(dayRowCount).not.toBe(monthRowCount);
    });

    it('renders a visually-hidden table and role="img" summaries on both chart hosts', () => {
      fixture.detectChanges();
      const table = fixture.nativeElement.querySelector('table.sr-only');
      expect(table).not.toBeNull();

      const rows = table!.querySelectorAll('tbody tr');
      expect(rows.length).toBe(fixture.componentInstance['accessibleRows']().length);

      const chartHosts = fixture.nativeElement.querySelectorAll('[echarts]');
      expect(chartHosts.length).toBe(2);
      chartHosts.forEach((host: Element) => {
        expect(host.getAttribute('role')).toBe('img');
        expect(host.getAttribute('aria-label')).toContain('table with values follows');
      });
    });
  });
});
