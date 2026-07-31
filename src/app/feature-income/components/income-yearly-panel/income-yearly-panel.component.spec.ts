import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import type { YearlyIncomeEntry } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import {
  buildYearlyIncomeChartOption,
  describeYearOverYearChange,
  formatYearOverYearChange,
  IncomeYearlyPanelComponent,
} from './income-yearly-panel.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const entry = (overrides: Partial<YearlyIncomeEntry> = {}): YearlyIncomeEntry => ({
  year: '2025',
  total: 24000,
  isPartialYear: false,
  pctVsPriorYear: null,
  ...overrides,
});

describe('formatYearOverYearChange (FR-INC-6, TICKET-INC-06)', () => {
  it('renders a rise with an explicit +, so a standalone bar label reads as a change', () => {
    expect(formatYearOverYearChange(0.082)).toBe('+8.2%');
  });

  it('renders a drop with a -', () => {
    expect(formatYearOverYearChange(-0.25)).toBe('-25%');
  });

  it('renders an em dash rather than a percentage when there is no prior year to compare', () => {
    expect(formatYearOverYearChange(null)).toBe('—');
  });
});

describe('describeYearOverYearChange (FR-INC-6, TICKET-INC-06)', () => {
  it('says why an incomplete year carries no percentage, rather than a bare dash', () => {
    expect(describeYearOverYearChange(entry({ isPartialYear: true, pctVsPriorYear: null }))).toBe(
      'incomplete year — not comparable',
    );
  });

  it('falls back to the bare dash when the year is complete but has nothing to compare against', () => {
    expect(describeYearOverYearChange(entry({ isPartialYear: false, pctVsPriorYear: null }))).toBe(
      '—',
    );
  });

  it('reads as the percentage whenever there is one', () => {
    expect(describeYearOverYearChange(entry({ pctVsPriorYear: 0.2 }))).toBe('+20%');
  });
});

describe('buildYearlyIncomeChartOption (FR-INC-6, TICKET-INC-06)', () => {
  /** ECharts' option type is deliberately loose (`EChartsCoreOption` indexes to `unknown`), so the
   * assertions below narrow through a local shape rather than sprinkling casts. */
  type YearlyOption = {
    series: {
      type: string;
      data: number[];
      label: {
        show: boolean;
        color: string;
        formatter: (params: { dataIndex: number }) => string;
      };
    }[];
    tooltip: { formatter: (params: { dataIndex: number; value: number }[]) => string };
    xAxis: { data: string[] };
    dataZoom?: unknown;
  };

  const build = (entries: YearlyIncomeEntry[]) =>
    buildYearlyIncomeChartOption(entries) as unknown as YearlyOption;

  const threeYears = [
    entry({ year: '2024', total: 20000, pctVsPriorYear: null }),
    entry({ year: '2025', total: 0, pctVsPriorYear: -1 }),
    entry({ year: '2026', total: 24000, pctVsPriorYear: null }),
  ];

  it('renders one bar per calendar year, in the order given', () => {
    const option = build(threeYears);

    expect(option.series).toHaveLength(1);
    expect(option.series[0].type).toBe('bar');
    expect(option.xAxis.data).toEqual(['2024', '2025', '2026']);
    expect(option.series[0].data).toEqual([20000, 0, 24000]);
  });

  it('labels each bar with its own %-change vs. the prior year', () => {
    const { formatter } = build(threeYears).series[0].label;

    expect(formatter({ dataIndex: 0 })).toBe('—');
    expect(formatter({ dataIndex: 1 })).toBe('-100%');
    expect(formatter({ dataIndex: 2 })).toBe('—');
  });

  it('repeats the change beneath the amount in the tooltip', () => {
    const option = build([
      entry({ year: '2025', total: 20000, pctVsPriorYear: null }),
      entry({ year: '2026', total: 24000, pctVsPriorYear: 0.2 }),
    ]);

    expect(option.tooltip.formatter([{ dataIndex: 1, value: 24000 }])).toContain(
      'vs. prior year: +20%',
    );
  });

  it('inherits the bar colour for its label, so the text follows the theme palette on dark themes', () => {
    expect(build(threeYears).series[0].label.color).toBe('inherit');
  });

  it('keeps the bar label compact on an incomplete year but explains it in the tooltip', () => {
    const option = build([
      entry({ year: '2025', total: 24000, pctVsPriorYear: null }),
      entry({ year: '2026', total: 11000, isPartialYear: true, pctVsPriorYear: null }),
    ]);

    expect(option.series[0].label.formatter({ dataIndex: 1 })).toBe('—');
    expect(option.tooltip.formatter([{ dataIndex: 1, value: 11000 }])).toContain('incomplete year');
  });

  it('has no dataZoom — a full history is a handful of bars, all of which fit on the axis', () => {
    expect(build(threeYears).dataZoom).toBeUndefined();
  });
});

describe('IncomeYearlyPanelComponent', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn(), setExcludedIncomeCategoryIds: vi.fn() };

  let fixture: ComponentFixture<IncomeYearlyPanelComponent>;

  const account: Account = {
    id: 1,
    name: 'Checking',
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2024-01-01',
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

  const payslip = (id: number, bookingDate: string, amount: number): Transaction => ({
    id,
    accountId: 1,
    bookingDate,
    amount,
    currency: 'EUR',
    rawDescription: 'Payslip',
    fingerprint: `fp-${id}`,
    categoryId: 1,
    createdAt: `${bookingDate}T00:00:00.000Z`,
  });

  const setup = async (
    transactions: Transaction[],
    excludedIncomeCategoryIds?: number[],
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([salary]);
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({
      id: 1,
      excludedIncomeCategoryIds,
    } as AppSettings);

    await TestBed.configureTestingModule({
      imports: [IncomeYearlyPanelComponent],
      providers: [
        provideEchartsCore({ echarts }),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeYearlyPanelComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  /** Year / income / change, read off the visually-hidden companion table the chart mirrors into. */
  const accessibleRows = (): string[][] =>
    [...fixture.nativeElement.querySelectorAll('table.sr-only tbody tr')].map((row) =>
      [...(row as HTMLElement).querySelectorAll('th, td')].map(
        (cell) => cell.textContent?.trim() ?? '',
      ),
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are
  // process-global module signals (Vitest runs with isolate:false) — reset them so specs that
  // assume the default symbol/locale don't depend on this file's run order.
  afterEach(() => {
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('renders one row per calendar year of history, with the %-change against the year before', async () => {
    await setup([payslip(1, '2024-06-01', 20000), payslip(2, '2025-06-01', 24000)]);

    const rows = accessibleRows();

    expect(rows[0][0]).toBe('2024');
    expect(rows[0][2]).toBe('—');
    expect(rows[1][0]).toBe('2025');
    expect(rows[1][2]).toBe('+20%');
  });

  it('spans the full history regardless of a narrower topbar range (FR-INC-6)', async () => {
    await setup([payslip(1, '2024-06-01', 20000), payslip(2, '2026-06-01', 24000)]);
    TestBed.inject(RangeStore).setCustomRange('2026-01-01', '2026-01-31');
    fixture.detectChanges();

    // Not an exact year list — `computeFullHistoryRange` runs to the real today, so the tail grows
    // with the calendar. What matters is that the range the topbar asked for isn't what came back.
    const years = accessibleRows().map((row) => row[0]);

    expect(years[0]).toBe('2024');
    expect(years).toContain('2026');
    expect(years.length).toBeGreaterThan(1);
  });

  it('keeps a year with no income as a zero row rather than dropping it off the axis', async () => {
    await setup([payslip(1, '2024-06-01', 20000), payslip(2, '2026-06-01', 24000)]);

    const gapYear = accessibleRows()[1];

    expect(gapYear[0]).toBe('2025');
    expect(gapYear[1]).toContain('0');
    expect(gapYear[2]).toBe('-100%');
  });

  it('shows no percentage for the in-progress current year, which runs only to today', async () => {
    await setup([payslip(1, '2024-06-01', 20000), payslip(2, '2025-06-01', 24000)]);

    // The last row is always the current calendar year: `computeFullHistoryRange` ends at today.
    const currentYear = accessibleRows().at(-1)!;

    expect(currentYear[2]).toBe('incomplete year — not comparable');
  });

  it('counts nothing once every income category is deselected (FR-INC-3)', async () => {
    await setup([payslip(1, '2024-06-01', 20000), payslip(2, '2025-06-01', 24000)], [1]);

    // Every year's total, not its change label — the last row is the in-progress year, which is
    // suppressed for its own reason and would pass a change-label assertion for free.
    expect(accessibleRows().every((row) => row[1].includes('0.00'))).toBe(true);
    expect(accessibleRows().every((row) => !row[1].includes('20,000'))).toBe(true);
  });

  it('renders the chart host with an accessible label pointing at the table', async () => {
    await setup([payslip(1, '2024-06-01', 20000)]);

    const host = fixture.nativeElement.querySelector('[echarts]');

    expect(host).not.toBeNull();
    expect(host.getAttribute('aria-label')).toContain('Income per calendar year');
  });
});
