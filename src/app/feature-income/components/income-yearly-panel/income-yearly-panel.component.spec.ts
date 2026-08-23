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
  buildMultiYearIncomeHeadline,
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
    expect(formatYearOverYearChange(0.082)).toBe('+8,2%');
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

describe('buildMultiYearIncomeHeadline (FR-INC-7, TICKET-INC-07)', () => {
  const comparison = {
    firstYear: '2023',
    firstYearTotal: 20000,
    lastYear: '2025',
    lastYearTotal: 23600,
    pctChange: 0.18,
  };

  it('names the span the user picked', () => {
    expect(buildMultiYearIncomeHeadline(comparison, 3).label).toBe('Change over the last 3 years');
    expect(buildMultiYearIncomeHeadline(comparison, 'all-time').label).toBe('Change over all time');
  });

  it('renders the aggregate change with an explicit sign', () => {
    expect(buildMultiYearIncomeHeadline(comparison, 3).value).toBe('+18%');
  });

  it('states the two years actually compared, not the span requested', () => {
    // A 5-year span truncated to three years of history still says which three.
    expect(buildMultiYearIncomeHeadline(comparison, 5).subLabel).toBe('2023 → 2025');
  });

  it('colours a rise as growth and a decline as a loss', () => {
    expect(buildMultiYearIncomeHeadline(comparison, 3).color).toBe('success');
    expect(buildMultiYearIncomeHeadline({ ...comparison, pctChange: -0.1 }, 3).color).toBe('error');
  });

  it('carries both years’ totals in the tooltip, so the % can be checked against real figures', () => {
    const { tooltip } = buildMultiYearIncomeHeadline(comparison, 3);

    expect(tooltip.split('\n')).toHaveLength(2);
    expect(tooltip).toContain('2023');
    expect(tooltip).toContain('2025');
  });

  it('falls back to a dash and says why when a single year is all there is to compare', () => {
    const single = buildMultiYearIncomeHeadline(
      {
        firstYear: '2025',
        firstYearTotal: 20000,
        lastYear: '2025',
        lastYearTotal: 20000,
        pctChange: null,
      },
      3,
    );

    expect(single.value).toBe('—');
    expect(single.subLabel).toContain('nothing to compare against');
    expect(single.color).toBeUndefined();
  });

  it('says no complete year exists yet rather than showing an empty card', () => {
    const empty = buildMultiYearIncomeHeadline(null, 'all-time');

    expect(empty.value).toBe('—');
    expect(empty.subLabel).toBe('No complete calendar year yet');
    expect(empty.tooltip).toBe('');
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
    careerStartDate?: string,
    privacyMode?: boolean,
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([salary]);
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({
      id: 1,
      excludedIncomeCategoryIds,
      careerStartDate,
      privacyMode,
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

  it('starts at the career start date instead of the first transaction, dropping pre-career zero bars (FR-INC-12)', async () => {
    await setup(
      [payslip(1, '2024-06-01', 20000), payslip(2, '2026-06-01', 24000)],
      undefined,
      '2026-01-01',
    );

    const years = accessibleRows().map((row) => row[0]);

    expect(years).toEqual(['2026']);
  });

  it("spans the full history regardless of another page's narrower range (FR-INC-6)", async () => {
    await setup([payslip(1, '2024-06-01', 20000), payslip(2, '2026-06-01', 24000)]);
    TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-01-01', '2026-01-31');
    fixture.detectChanges();

    // Not an exact year list — `computeFullHistoryRange` runs to the real today, so the tail grows
    // with the calendar. What matters is that the other page's range isn't what came back.
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
    expect(accessibleRows().every((row) => row[1].includes('0,00'))).toBe(true);
    expect(accessibleRows().every((row) => !row[1].includes('20.000'))).toBe(true);
  });

  it('renders the chart host with an accessible label pointing at the table', async () => {
    await setup([payslip(1, '2024-06-01', 20000)]);

    const host = fixture.nativeElement.querySelector('[echarts]');

    expect(host).not.toBeNull();
    expect(host.getAttribute('aria-label')).toContain('Income per calendar year');
  });

  describe('multi-year comparison headline (FR-INC-7)', () => {
    /** The `<button>`s of the span picker, in render order: 3y / 5y / All-time. */
    const spanButtons = (): HTMLButtonElement[] => [
      ...fixture.nativeElement.querySelectorAll('[role="group"] button'),
    ];

    const clickSpan = (label: string): void => {
      spanButtons()
        .find((button) => button.textContent?.trim() === label)!
        .click();
      fixture.detectChanges();
    };

    const headline = (): { label: string; value: string; subLabel: string } => {
      const card = fixture.nativeElement.querySelector('mm-stat-card');
      const text = (selector: string): string =>
        card.querySelector(selector)?.textContent?.trim() ?? '';
      return {
        label: text('.stat-title'),
        value: text('.stat-value'),
        subLabel: text('.stat-desc'),
      };
    };

    /**
     * Four complete calendar years (2022–2025) plus the in-progress current one. The first payslip
     * is dated 1 January so `computeFullHistoryRange`'s `from` covers all of 2022 — a history
     * starting mid-year would make 2022 partial, and therefore not comparable.
     */
    const fourYears = [
      payslip(1, '2022-01-01', 10000),
      payslip(2, '2023-06-01', 12000),
      payslip(3, '2024-06-01', 14000),
      payslip(4, '2025-06-01', 15000),
    ];

    it('defaults to the 3-year span, comparing the last three complete years', async () => {
      await setup(fourYears);

      expect(headline().label).toBe('Change over the last 3 years');
      // 2023 → 2025: 12000 → 15000.
      expect(headline().subLabel).toBe('2023 → 2025');
      expect(headline().value).toBe('+25%');
    });

    it('updates the headline when the span changes, without re-rendering the page', async () => {
      await setup(fourYears);
      clickSpan('All-time');

      // 2022 → 2025: 10000 → 15000.
      expect(headline().label).toBe('Change over all time');
      expect(headline().subLabel).toBe('2022 → 2025');
      expect(headline().value).toBe('+50%');
    });

    it('marks the selected span as pressed', async () => {
      await setup(fourYears);
      clickSpan('5y');

      const pressed = spanButtons().filter(
        (button) => button.getAttribute('aria-pressed') === 'true',
      );

      expect(pressed).toHaveLength(1);
      expect(pressed[0].textContent?.trim()).toBe('5y');
    });

    it('compares whatever history exists when the span asks for more years than there are', async () => {
      await setup([payslip(1, '2024-06-01', 20000), payslip(2, '2025-06-01', 24000)]);
      clickSpan('5y');

      expect(headline().subLabel).toBe('2024 → 2025');
      expect(headline().value).toBe('+20%');
    });

    it('leaves the in-progress current year out of the comparison', async () => {
      await setup(fourYears);
      clickSpan('All-time');

      // `computeFullHistoryRange` runs to today, so the newest year is always partial and would
      // read as a collapse if it anchored the span.
      expect(headline().subLabel).not.toContain(String(new Date().getFullYear()));
    });
  });

  describe('privacy mode (TICKET-PRIV-02)', () => {
    const twoYears = [payslip(1, '2024-06-01', 20000), payslip(2, '2025-06-01', 24000)];

    it('blurs the headline card while leaving its label and the span picker alone', async () => {
      await setup(twoYears, undefined, undefined, true);
      const card = fixture.nativeElement.querySelector('mm-stat-card') as HTMLElement;

      expect(card.querySelector('.stat-value .mm-privacy-blurred')).not.toBeNull();
      expect(card.querySelector('.stat-desc .mm-privacy-blurred')).not.toBeNull();
      expect(card.querySelector('.stat-title .mm-privacy-blurred')).toBeNull();
      expect(card.querySelector('.stat-title')?.textContent).toContain('Change over the last');
      // The picker stays interactive — blur is visual, not a lock.
      expect(fixture.nativeElement.querySelectorAll('[role="group"] button')).toHaveLength(3);
    });

    it('blurs the headline tooltip, which is where the year totals are spelled out', async () => {
      await setup(twoYears, undefined, undefined, true);
      const tooltip = fixture.nativeElement.querySelector('.tooltip-content') as HTMLElement;

      expect(tooltip.textContent).toContain('2024');
      expect(tooltip.querySelector('.mm-privacy-blurred')).not.toBeNull();
    });

    it('withholds the companion table’s totals rather than blurring them', async () => {
      // `sr-only` is clipped to a 1px box, so a CSS blur hides nothing from a screen reader
      // (TICKET-STAT-29's rule).
      await setup(twoYears, undefined, undefined, true);
      // Three rows, not two: `computeFullHistoryRange` runs to today, so the in-progress current
      // year is always a row of its own.
      const rows = accessibleRows();

      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.every((row) => row[1] === 'hidden')).toBe(true);
      // The year and the year-over-year change stay: a percentage is not the amount.
      expect(rows[0][0]).toBe('2024');
      expect(rows[1][2]).toBe('+20%');
    });

    it('leaves both the card and the table plain with privacy mode off', async () => {
      await setup(twoYears);

      expect(fixture.nativeElement.querySelector('.mm-privacy-blurred')).toBeNull();
      expect(accessibleRows()[0][1]).toContain('20.000');
    });

    it('never blurs the chart itself — the shape stays readable, the figures do not', async () => {
      await setup(twoYears, undefined, undefined, true);

      expect(
        fixture.nativeElement.querySelector(
          '.mm-privacy-blurred [echarts], .mm-privacy-blurred canvas',
        ),
      ).toBeNull();
    });
  });
});
