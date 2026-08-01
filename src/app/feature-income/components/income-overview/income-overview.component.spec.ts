import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type Account,
  type AppSettings,
  type Category,
  type Transaction,
} from '@/core/data-access';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import type { CategorySeriesEntry, ChartZoomWindow } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { buildIncomeTrendChartOption, IncomeOverviewComponent } from './income-overview.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const seriesEntry = (overrides: Partial<CategorySeriesEntry> = {}): CategorySeriesEntry => ({
  categoryId: 1,
  name: 'Salary',
  color: '#34d399',
  values: [2000, 2100],
  ...overrides,
});

describe('buildIncomeTrendChartOption (FR-INC-2, TICKET-INC-02)', () => {
  const zoomWindow = { startValue: 0, endValue: 1 };

  /** ECharts' option type is deliberately loose (`EChartsCoreOption` indexes to `unknown`), so the
   * assertions below narrow through a local shape rather than sprinkling casts. */
  type IncomeTrendOption = {
    series: { name: string; type: string; stack: string; color: string; data: number[] }[];
    legend: { data: string[] };
    dataZoom: { type: string; startValue: number; endValue: number }[];
    xAxis: { data: string[] };
  };

  const build = (series: CategorySeriesEntry[], bucketKeys = ['2026-01', '2026-02']) =>
    buildIncomeTrendChartOption(bucketKeys, series, zoomWindow) as unknown as IncomeTrendOption;

  it('renders one line/area series per selected category, coloured by the category colour', () => {
    const option = build([
      seriesEntry({ categoryId: 1, name: 'Salary', color: '#34d399', values: [2000, 2100] }),
      seriesEntry({ categoryId: 2, name: 'Other Income', color: '#2dd4bf', values: [150, 0] }),
    ]);

    expect(option.series).toHaveLength(2);
    expect(option.series.map((s) => s.color)).toEqual(['#34d399', '#2dd4bf']);
    expect(option.series.every((s) => s.type === 'line')).toBe(true);
    expect(option.series[1].data).toEqual([150, 0]);
  });

  it('lists every series in the legend, so a click can toggle a category off (native echarts)', () => {
    const option = build([
      seriesEntry({ categoryId: 1, name: 'Salary' }),
      seriesEntry({ categoryId: 2, name: 'Other Income' }),
    ]);

    expect(option.legend.data).toEqual(['Salary', 'Other Income']);
  });

  it('applies no top-N cap of its own: 7 series in, 7 series out', () => {
    const option = build(
      Array.from({ length: 7 }, (_, i) =>
        seriesEntry({ categoryId: i + 1, name: `Income${i + 1}` }),
      ),
    );

    expect(option.series).toHaveLength(7);
  });

  it('seeds both dataZoom controls from the given window rather than trimming the data', () => {
    const bucketKeys = ['2026-01', '2026-02', '2026-03'];
    const option = buildIncomeTrendChartOption(bucketKeys, [seriesEntry({ values: [1, 2, 3] })], {
      startValue: 1,
      endValue: 2,
    }) as unknown as IncomeTrendOption;

    expect(option.xAxis.data).toEqual(bucketKeys);
    expect(option.series[0].data).toEqual([1, 2, 3]);
    expect(option.dataZoom.map((zoom) => zoom.type)).toEqual(['inside', 'slider']);
    expect(option.dataZoom.every((zoom) => zoom.startValue === 1 && zoom.endValue === 2)).toBe(
      true,
    );
  });
});

describe('IncomeOverviewComponent', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn(), setExcludedIncomeCategoryIds: vi.fn() };

  let fixture: ComponentFixture<IncomeOverviewComponent>;

  const account: Account = {
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

  const salary: Category = {
    id: 1,
    name: 'Salary',
    kind: 'income',
    color: '#34d399',
    icon: 'cash',
    archived: false,
    isSystem: true,
    sortOrder: 1,
  };

  const payslip: Transaction = {
    id: 1,
    accountId: 1,
    bookingDate: '2026-01-25',
    amount: 2000,
    currency: 'EUR',
    rawDescription: 'Payslip',
    fingerprint: 'fp-1',
    categoryId: 1,
    createdAt: '2026-01-25T00:00:00.000Z',
  };

  const setup = async (
    categories: Category[],
    excludedIncomeCategoryIds?: number[],
    careerStartDate?: string,
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue(categories);
    transactionsRepository.getAll.mockResolvedValue([payslip]);
    appSettingsRepository.get.mockResolvedValue({
      id: 1,
      excludedIncomeCategoryIds,
      careerStartDate,
    } as AppSettings);

    await TestBed.configureTestingModule({
      imports: [IncomeOverviewComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeOverviewComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  /**
   * The monthly chart's own visually-hidden mirror table. Scoped with `:scope >` on purpose: the
   * yearly panel (TICKET-INC-06) renders a `table.sr-only` of its own, so an unscoped
   * `table.sr-only` query would silently mix that panel's `YYYY` rows into these monthly-bucket
   * assertions.
   */
  const monthlyBucketRows = (selector: string): HTMLElement[] => [
    ...fixture.nativeElement.querySelectorAll(`:scope > mm-paper table.sr-only ${selector}`),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are
  // process-global module signals (Vitest runs with isolate:false) — reset them so specs that
  // assume the default symbol/locale don't depend on this file's run order (same guard as
  // `app-settings.store.spec.ts`).
  afterEach(() => {
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('renders the Income page header', async () => {
    await setup([salary]);

    expect(fixture.nativeElement.textContent).toContain('Income');
  });

  it('renders the chart panel and the category filter once a category is selected', async () => {
    await setup([salary]);

    expect(fixture.nativeElement.querySelector('[echarts]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-income-category-filter')).not.toBeNull();
  });

  it('renders the yearly panel beneath the monthly chart (FR-INC-6, TICKET-INC-06)', async () => {
    await setup([salary]);

    expect(fixture.nativeElement.querySelector('app-income-yearly-panel')).not.toBeNull();
  });

  it('renders the career-start control in the page header (FR-INC-12, TICKET-INC-12)', async () => {
    await setup([salary]);

    expect(
      fixture.nativeElement.querySelector('mm-page-header app-income-career-start'),
    ).not.toBeNull();
  });

  it('starts the monthly chart at the career start date rather than the first transaction (FR-INC-12)', async () => {
    await setup([salary], undefined, '2026-04-01');

    const rows = monthlyBucketRows('tbody th').map((cell) => cell.textContent?.trim() ?? '');

    expect(rows[0]).toBe('2026-04');
    expect(rows).not.toContain('2026-01');
  });

  it('offers no granularity control — the page is fixed to calendar months (TICKET-INC-02 divergence)', async () => {
    await setup([salary]);

    expect(fixture.nativeElement.querySelector('mm-granularity-picker')).toBeNull();
  });

  it('always opens on its full monthly history, ignoring a narrow topbar range (TICKET-INC-02 divergence)', async () => {
    await setup([salary]);
    // Narrower than the seeded history on purpose: once buckets are monthly, honouring this would
    // collapse the zoom window to a single bucket and open the trend chart on one dot.
    TestBed.inject(RangeStore).setCustomRange('2026-01-01', '2026-01-31');
    fixture.detectChanges();

    const option = (
      fixture.componentInstance as unknown as { chartOption: () => { dataZoom: ChartZoomWindow[] } }
    ).chartOption();
    const bucketCount = monthlyBucketRows('tbody tr').length;

    expect(bucketCount).toBeGreaterThan(1);
    expect(option.dataZoom.every((zoom) => zoom.startValue === 0)).toBe(true);
    expect(option.dataZoom.every((zoom) => zoom.endValue === bucketCount - 1)).toBe(true);
  });

  it('buckets by calendar month regardless of the topbar range, so bucket keys are YYYY-MM', async () => {
    await setup([salary]);

    const rows = monthlyBucketRows('tbody th').map((cell) => cell.textContent?.trim() ?? '');

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((key) => /^\d{4}-\d{2}$/.test(key))).toBe(true);
    expect(rows).toContain('2026-01');
  });

  it('falls back to the empty state when every income category is deselected', async () => {
    await setup([salary], [1]);

    expect(fixture.nativeElement.querySelector('[echarts]')).toBeNull();
    expect(fixture.nativeElement.querySelector('mm-empty-state')).not.toBeNull();
  });

  it('falls back to the empty state when the user has no income categories at all', async () => {
    await setup([
      {
        id: 2,
        name: 'Groceries',
        kind: 'expense',
        color: '#4ade80',
        icon: 'cart',
        archived: false,
        isSystem: true,
        sortOrder: 2,
      },
    ]);

    expect(fixture.nativeElement.querySelector('mm-empty-state')).not.toBeNull();
  });
});
