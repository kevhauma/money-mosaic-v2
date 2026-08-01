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
  formatCurrency,
  syncFormatSettings,
} from '@/shared/utils';
import {
  bucketKeyForChartClick,
  buildIncomeTrendChartOption,
  IncomeOverviewComponent,
} from './income-overview.component';

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

describe('bucketKeyForChartClick (FR-INC-10, TICKET-INC-10)', () => {
  const bucketKeys = ['2026-01', '2026-02', '2026-03'];

  it('resolves a clicked point’s dataIndex to its month', () => {
    expect(bucketKeyForChartClick({ dataIndex: 1 }, bucketKeys)).toBe('2026-02');
  });

  it('resolves the first and last points', () => {
    expect(bucketKeyForChartClick({ dataIndex: 0 }, bucketKeys)).toBe('2026-01');
    expect(bucketKeyForChartClick({ dataIndex: 2 }, bucketKeys)).toBe('2026-03');
  });

  it('is undefined for a click that carries no usable index — the legend, or empty canvas', () => {
    expect(bucketKeyForChartClick({ dataIndex: 9 }, bucketKeys)).toBeUndefined();
    expect(bucketKeyForChartClick({ dataIndex: -1 }, bucketKeys)).toBeUndefined();
    expect(bucketKeyForChartClick({ dataIndex: 0 }, [])).toBeUndefined();
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
    extra: { smoothedBonusCategoryIds?: number[]; transactions?: Transaction[] } = {},
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue(categories);
    transactionsRepository.getAll.mockResolvedValue(extra.transactions ?? [payslip]);
    appSettingsRepository.get.mockResolvedValue({
      id: 1,
      excludedIncomeCategoryIds,
      careerStartDate,
      smoothedBonusCategoryIds: extra.smoothedBonusCategoryIds,
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
   * The monthly chart's own visually-hidden mirror table. Tightly scoped on purpose: the yearly
   * panel (TICKET-INC-06) and the "Net vs gross" section's four cells (TICKET-INC-16) each render
   * a `table.sr-only` of their own, so an unscoped query would silently mix their rows into these
   * monthly-bucket assertions. The path is the page's two-column grid (TICKET-INC-17) → the charts
   * column → the chart's own `mm-paper`, which is that column's only direct `mm-paper` child.
   */
  const monthlyBucketRows = (selector: string): HTMLElement[] => [
    ...fixture.nativeElement.querySelectorAll(
      `:scope > div > div > mm-paper:first-of-type table.sr-only ${selector}`,
    ),
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

  it('renders the chart panel once a category is selected', async () => {
    await setup([salary]);

    expect(fixture.nativeElement.querySelector('[echarts]')).not.toBeNull();
  });

  it('renders the yearly panel beneath the monthly chart (FR-INC-6, TICKET-INC-06)', async () => {
    await setup([salary]);

    expect(fixture.nativeElement.querySelector('app-income-yearly-panel')).not.toBeNull();
  });

  it('has exactly one gross-vs-net surface on the page (TICKET-INC-16)', async () => {
    await setup([salary]);

    // The standalone take-home `mm-paper` row is gone: its chart is now one cell of the section.
    expect(fixture.nativeElement.querySelectorAll('app-income-gross-net-section')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('app-income-gross-net-panel')).toBeNull();
  });

  it('mounts every page setting behind the header’s settings popup (TICKET-INC-04)', async () => {
    await setup([salary]);

    // Career start and the category filter used to sit in the header and beside the chart; both
    // now live inside `app-income-settings`, and neither has a second mounting point.
    expect(
      fixture.nativeElement.querySelector('mm-page-header app-income-settings'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-income-career-start')).toHaveLength(1);
    expect(
      fixture.nativeElement.querySelector('app-income-settings app-income-career-start'),
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

  describe('annual lump-sum smoothing (FR-INC-4, TICKET-INC-04)', () => {
    const bonusCategory: Category = { ...salary, id: 2, name: 'Holiday bonus' };

    const bonusDeposit: Transaction = {
      ...payslip,
      id: 2,
      bookingDate: '2026-03-20',
      amount: 800,
      fingerprint: 'fp-2',
      categoryId: 2,
    };

    /** Every monthly bucket's total, as rendered in the chart's companion table. */
    const monthlyTotals = (): string[] =>
      monthlyBucketRows('tbody td').map((cell) => cell.textContent?.trim() ?? '');

    it('draws an unflagged bonus as the single-month spike it really was', async () => {
      await setup([salary, bonusCategory], undefined, undefined, {
        transactions: [payslip, bonusDeposit],
      });

      expect(monthlyTotals()[2]).toContain('800');
    });

    it('spreads a flagged bonus across the year instead of spiking one month', async () => {
      await setup([salary, bonusCategory], undefined, undefined, {
        transactions: [payslip, bonusDeposit],
        smoothedBonusCategoryIds: [2],
      });

      const totals = monthlyTotals();

      // History runs 2026-01 through today's month, so the 800 splits evenly across those buckets.
      // March keeps only its share; February and the last month, previously empty, carry the rest.
      const perMonth = 800 / totals.length;
      expect(totals[2]).toBe(formatCurrency(perMonth));
      expect(totals[1]).toBe(formatCurrency(perMonth));
      expect(totals.at(-1)).toBe(formatCurrency(perMonth));
      // Only January also holds real salary.
      expect(totals[0]).toBe(formatCurrency(2000 + perMonth));
    });

    it('keeps the year’s total unchanged — smoothing redistributes, it never adds or removes income', async () => {
      await setup([salary, bonusCategory], undefined, undefined, {
        transactions: [payslip, bonusDeposit],
        smoothedBonusCategoryIds: [2],
      });

      const total = monthlyTotals().reduce(
        (sum, text) => sum + Number(text.replace(/[^0-9.-]/g, '')),
        0,
      );

      // The two deposits, unchanged: 2000 salary + 800 bonus.
      expect(total).toBeCloseTo(2800, 1);
    });
  });

  describe('salary details modal (FR-INC-10, TICKET-INC-10)', () => {
    /** The component's own handlers, which the template wires to the header button and the chart. */
    type SalaryDetailsHost = {
      openSalaryDetails: () => void;
      onChartClick: (event: { dataIndex: number }) => void;
      salaryDetailsOpen: () => boolean;
      salaryDetailsFocusMonth: () => string | undefined;
    };

    const host = (): SalaryDetailsHost => fixture.componentInstance as unknown as SalaryDetailsHost;

    it('is closed until asked for, so the page isn’t hosting a data-entry form every visit', async () => {
      await setup([salary]);

      expect(host().salaryDetailsOpen()).toBe(false);
      expect(fixture.nativeElement.querySelector('app-salary-metadata-table')).toBeNull();
    });

    it('opens from the header button, with no month singled out', async () => {
      await setup([salary]);

      host().openSalaryDetails();
      fixture.detectChanges();

      expect(host().salaryDetailsOpen()).toBe(true);
      expect(host().salaryDetailsFocusMonth()).toBeUndefined();
      expect(fixture.nativeElement.querySelector('app-salary-metadata-table')).not.toBeNull();
    });

    it('opens on the clicked month when the trend chart is clicked', async () => {
      await setup([salary]);

      host().onChartClick({ dataIndex: 0 });
      fixture.detectChanges();

      expect(host().salaryDetailsOpen()).toBe(true);
      // The seeded history starts 2026-01, which is the chart's first bucket.
      expect(host().salaryDetailsFocusMonth()).toBe('2026-01');
    });

    it('ignores a click that resolves to no bucket', async () => {
      await setup([salary]);

      host().onChartClick({ dataIndex: 999 });
      fixture.detectChanges();

      expect(host().salaryDetailsOpen()).toBe(false);
    });
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
