import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  SalaryMetadataRepository,
  TransactionsRepository,
  type Account,
  type AppSettings,
  type Category,
  type SalaryMetadata,
  type Transaction,
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import type { GrossNetRatioPoint } from '@/core/stats';
import { echarts, resolveGrossSeriesColor } from '@/shared/echarts';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { IncomeStore } from '../../income.store';
import {
  buildGrossNetChartOption,
  IncomeGrossNetPanelComponent,
} from './income-gross-net-panel.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const point = (overrides: Partial<GrossNetRatioPoint> = {}): GrossNetRatioPoint => ({
  bucketKey: '2026-01',
  net: 2160,
  gross: 3000,
  ratio: 0.72,
  ...overrides,
});

describe('buildGrossNetChartOption (FR-INC-11, TICKET-INC-11/TICKET-INC-14)', () => {
  /** ECharts' option type indexes to `unknown`, so assertions narrow through a local shape. */
  type RatioOption = {
    series: {
      name: string;
      type: string;
      stack: string;
      areaStyle: object;
      itemStyle?: { color: string };
      data: (number | null)[];
      connectNulls: boolean;
    }[];
    tooltip: { formatter: (params: { dataIndex: number }[]) => string };
    xAxis: { data: string[] };
    yAxis: { min: number; max: number; axisLabel: { formatter: (value: number) => string } };
  };

  const GROSS = '#8451c9';

  const build = (points: GrossNetRatioPoint[], grossColor = GROSS) =>
    buildGrossNetChartOption(points, grossColor) as unknown as RatioOption;

  it('plots one point per month, as a kept/withheld pair', () => {
    const option = build([point({ bucketKey: '2026-01' }), point({ bucketKey: '2026-02' })]);

    expect(option.xAxis.data).toEqual(['2026-01', '2026-02']);
    expect(option.series[0].data).toEqual([0.72, 0.72]);
    expect(option.series[1].data).toEqual([0.28, 0.28]);
    expect(option.series[0].type).toBe('line');
  });

  it('pins the axis to a full 0–100% rather than letting echarts fit the data', () => {
    // Data that would otherwise auto-fit to a ~6-point axis and render as dramatic hills.
    const option = build([
      point({ bucketKey: '2026-01', ratio: 0.82 }),
      point({ bucketKey: '2026-02', ratio: 0.85 }),
      point({ bucketKey: '2026-03', ratio: 0.88 }),
    ]);

    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBe(1);
  });

  it('stacks two named area series that always fill the plot', () => {
    const option = build([point({ ratio: 0.6 }), point({ ratio: 0.9 }), point({ ratio: 0.72 })]);

    expect(option.series.map((entry) => entry.name)).toEqual(['Take-home', 'Withheld']);
    expect(option.series[0].stack).toBe(option.series[1].stack);
    expect(option.series.every((entry) => entry.areaStyle !== undefined)).toBe(true);
    option.series[0].data.forEach((kept, index) => {
      expect((kept as number) + (option.series[1].data[index] as number)).toBeCloseTo(1);
    });
  });

  it('clips a month over 100% to a full band and names the real figure in its tooltip', () => {
    const option = build([point({ net: 3120, gross: 3000, ratio: 1.04 })]);

    expect(option.series[0].data).toEqual([1]);
    expect(option.series[1].data).toEqual([0]);
    expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain('104%');
    expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain(
      'More reached the account than the gross entered',
    );
  });

  it('breaks both bands at a month with no gross wage rather than dipping to zero', () => {
    const option = build([
      point({ bucketKey: '2026-01' }),
      point({ bucketKey: '2026-02', gross: null, ratio: null }),
      point({ bucketKey: '2026-03' }),
    ]);

    expect(option.series[0].data).toEqual([0.72, null, 0.72]);
    expect(option.series[1].data).toEqual([0.28, null, 0.28]);
    expect(option.series.every((entry) => entry.connectNulls === false)).toBe(true);
  });

  it('takes the withheld band’s color from the gross-series resolver, not a literal', () => {
    expect(build([point()], '#8451c9').series[1].itemStyle?.color).toBe('#8451c9');
    expect(build([point()], '#e1af37').series[1].itemStyle?.color).toBe('#e1af37');
  });

  it('leaves the take-home band on the theme’s own categorical slot', () => {
    expect(build([point()]).series[0].itemStyle).toBeUndefined();
  });

  it('labels the axis as a percentage', () => {
    expect(build([point()]).yAxis.axisLabel.formatter(0.72)).toBe('72%');
  });

  it('spells out both figures behind a point in its tooltip', () => {
    const tooltip = build([point()]).tooltip.formatter([{ dataIndex: 0 }]);

    expect(tooltip).toContain('2,160');
    expect(tooltip).toContain('3,000');
    expect(tooltip).toContain('72%');
  });

  it('says why a gap is a gap', () => {
    const option = build([point({ gross: null, ratio: null })]);

    expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain('no gross wage entered');
  });
});

describe('IncomeGrossNetPanelComponent', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };
  const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };

  let fixture: ComponentFixture<IncomeGrossNetPanelComponent>;

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

  /** A second income category, for the annual-lump-sum exclusion (TICKET-INC-14). */
  const thirteenthMonth: Category = { ...salary, id: 2, name: '13th month', isSystem: false };

  const payslip = (
    id: number,
    bookingDate: string,
    amount: number,
    categoryId = 1,
  ): Transaction => ({
    id,
    accountId: 1,
    bookingDate,
    amount,
    currency: 'EUR',
    rawDescription: 'Payslip',
    fingerprint: `fp-${id}`,
    categoryId,
    createdAt: `${bookingDate}T00:00:00.000Z`,
  });

  const setup = async (
    transactions: Transaction[],
    salaryMetadata: SalaryMetadata[] = [],
    settings: Partial<AppSettings> = {},
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([salary, thirteenthMonth]);
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);
    salaryMetadataRepository.getAll.mockResolvedValue(salaryMetadata);

    await TestBed.configureTestingModule({
      imports: [IncomeGrossNetPanelComponent],
      providers: [
        provideEchartsCore({ echarts }),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
        { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeGrossNetPanelComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
      TestBed.inject(IncomeStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  /** Month / net / gross / rate, read off the visually-hidden companion table. */
  const rows = (): string[][] =>
    [...fixture.nativeElement.querySelectorAll('table.sr-only tbody tr')].map((row) =>
      [...(row as HTMLElement).querySelectorAll('th, td')].map(
        (cell) => cell.textContent?.trim() ?? '',
      ),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-12T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('reports the take-home rate for a month with a gross wage entered', async () => {
    await setup(
      [payslip(1, '2026-01-25', 2160)],
      [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
    );

    expect(rows()[0]).toEqual(['2026-01', '€2,160.00', '€3,000.00', '72%']);
  });

  it('leaves a month with no gross wage as a gap, not a zero', async () => {
    await setup(
      [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 2160)],
      [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
    );

    expect(rows()[1]).toEqual(['2026-02', '€2,160.00', '—', '—']);
  });

  it('subtracts an embedded bonus before the ratio, so a bonus month isn’t a false raise in take-home', async () => {
    // February's deposit was 4160, of which 2000 was holiday pay.
    await setup(
      [payslip(1, '2026-02-25', 4160)],
      [{ id: 1, yearMonth: '2026-02', grossWage: 3000, bonus: 2000 }],
    );

    expect(rows()[1]).toEqual(['2026-02', '€2,160.00', '€3,000.00', '72%']);
  });

  it('drops a deselected category from net (FR-INC-3)', async () => {
    await setup(
      [payslip(1, '2026-01-25', 2160)],
      [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      { excludedIncomeCategoryIds: [1] },
    );

    expect(rows()[0]).toEqual(['2026-01', '€0.00', '€3,000.00', '0%']);
  });

  it('keeps a lump sum in its real month rather than the smoothed average (FR-INC-4)', async () => {
    await setup(
      [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 12000)],
      [{ id: 1, yearMonth: '2026-02', grossWage: 3000 }],
    );

    // Smoothed, February would be the year's average; raw, it is the 12,000 that actually landed.
    expect(rows()[1][1]).toBe('€12,000.00');
  });

  it('leaves an annual lump-sum category out of the take-home basis entirely (TICKET-INC-14)', async () => {
    // February pays the regular 2,160 salary plus a separately-categorised 12,000 13th month.
    await setup(
      [payslip(1, '2026-02-25', 2160), payslip(2, '2026-02-26', 12000, 2)],
      [{ id: 1, yearMonth: '2026-02', grossWage: 3000 }],
      { smoothedBonusCategoryIds: [2] },
    );

    // Without the exclusion February's 14,160 against a 3,000 gross would read as 472%.
    expect(rows()[1]).toEqual(['2026-02', '€2,160.00', '€3,000.00', '72%']);
  });

  it('prints the true, unclipped rate in the companion table even when the band clips', async () => {
    await setup(
      [payslip(1, '2026-01-25', 3120)],
      [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
    );

    expect(rows()[0]).toEqual(['2026-01', '€3,120.00', '€3,000.00', '104%']);
  });

  it('colors the withheld band with the picked gross color (TICKET-SET-08)', async () => {
    await setup(
      [payslip(1, '2026-01-25', 2160)],
      [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      { grossColor: 'violet' },
    );

    const option = fixture.componentInstance['chartOption']() as unknown as {
      series: { itemStyle?: { color: string } }[];
    };

    expect(option.series[1].itemStyle?.color).toBe(resolveGrossSeriesColor('violet'));
  });

  it('says what to do instead of drawing an empty chart when no gross wage exists yet', async () => {
    await setup([payslip(1, '2026-01-25', 2160)]);

    expect(fixture.nativeElement.querySelector('[echarts]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Salary details');
  });
});
