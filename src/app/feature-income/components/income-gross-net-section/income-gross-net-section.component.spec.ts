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
import { echarts, resolveGrossSeriesColor } from '@/shared/echarts';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { IncomeStore } from '../../income.store';
import { IncomeGrossNetSectionComponent } from './income-gross-net-section.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

describe('IncomeGrossNetSectionComponent (FR-INC-13, TICKET-INC-16)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };
  const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };

  let fixture: ComponentFixture<IncomeGrossNetSectionComponent>;

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
      imports: [IncomeGrossNetSectionComponent],
      providers: [
        provideEchartsCore({ echarts }),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
        { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeGrossNetSectionComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
      TestBed.inject(IncomeStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  const cells = (): HTMLElement[] => [
    ...fixture.nativeElement.querySelectorAll('app-income-chart-cell'),
  ];

  /** One cell's visually-hidden companion table, as rows of cell text. */
  const rowsOf = (cellIndex: number): string[][] =>
    [...cells()[cellIndex].querySelectorAll('table.sr-only tbody tr')].map((row) =>
      [...(row as HTMLElement).querySelectorAll('th, td')].map(
        (cell) => cell.textContent?.trim() ?? '',
      ),
    );

  /** The take-home cell, in the grid's reading order: absolute, take-home, % from start, from start. */
  const TAKE_HOME = 1;
  const ABSOLUTE = 0;
  const PCT_FROM_START = 2;
  const FROM_START = 3;

  const optionOf = (name: 'takeHomeOption' | 'absoluteOption' | 'pctFromStartOption') =>
    (fixture.componentInstance as unknown as Record<string, () => unknown>)[name]() as {
      series: { data: (number | null)[]; itemStyle?: { color: string } }[];
    };

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

  describe('the grid', () => {
    it('renders four chart cells under one “Net vs gross” heading', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(cells()).toHaveLength(4);
      expect(fixture.nativeElement.querySelector('h2')?.textContent?.trim()).toBe('Net vs gross');
    });

    it('names each cell, since one section heading cannot name four charts', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(cells().map((cell) => cell.querySelector('h3')?.textContent?.trim())).toEqual([
        'Gross and net per month',
        'Take-home rate',
        'Change since your first recorded month, in %',
        'Change since your first recorded month',
      ]);
    });

    it('is one column when its column is narrow and two when it is wide', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      const grid = cells()[0].closest('.grid');

      expect(grid?.classList.contains('grid-cols-1')).toBe(true);
      // A *container* query, not a viewport one (TICKET-INC-17): from `lg:` this section shares the
      // page with the events rail, so its own width is what decides whether two cells fit.
      expect(grid?.classList.contains('@2xl:grid-cols-2')).toBe(true);
      expect(grid?.parentElement?.classList.contains('@container')).toBe(true);
    });

    it('sizes each cell from its grid track rather than a fixed width', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      const chart = cells()[0].querySelector('[echarts]');

      expect(chart?.classList.contains('w-full')).toBe(true);
    });

    it('shows one empty state for the whole section, not four, when no gross wage exists yet', async () => {
      await setup([payslip(1, '2026-01-25', 2160)]);

      expect(cells()).toHaveLength(0);
      expect(fixture.nativeElement.textContent).toContain('Salary details');
    });

    it('gives every cell an sr-only companion table', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(cells().every((cell) => cell.querySelector('table.sr-only') !== null)).toBe(true);
    });
  });

  describe('the take-home cell (moved from TICKET-INC-14)', () => {
    it('reports the take-home rate for a month with a gross wage entered', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(rowsOf(TAKE_HOME)[0]).toEqual(['2026-01', '€2,160.00', '€3,000.00', '72%']);
    });

    it('leaves a month with no gross wage as a gap, not a zero', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 2160)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(rowsOf(TAKE_HOME)[1]).toEqual(['2026-02', '€2,160.00', '—', '—']);
      expect(optionOf('takeHomeOption').series[0].data[1]).toBeNull();
    });

    it('subtracts an embedded bonus before the ratio, so a bonus month isn’t a false raise', async () => {
      // February's deposit was 4160, of which 2000 was holiday pay. (January has no income at all,
      // so it is skipped entirely — February is the first row.)
      await setup(
        [payslip(1, '2026-02-25', 4160)],
        [{ id: 1, yearMonth: '2026-02', grossWage: 3000, bonus: 2000 }],
      );

      expect(rowsOf(TAKE_HOME)[0]).toEqual(['2026-02', '€2,160.00', '€3,000.00', '72%']);
    });

    it('drops a deselected category from net (FR-INC-3)', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-01-26', 500, 2)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
        { excludedIncomeCategoryIds: [2] },
      );

      // The 500 side income is out of the selection, so it never reaches `net`.
      expect(rowsOf(TAKE_HOME)[0]).toEqual(['2026-01', '€2,160.00', '€3,000.00', '72%']);
    });

    it('keeps a lump sum in its real month rather than the smoothed average (FR-INC-4)', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 12000)],
        [{ id: 1, yearMonth: '2026-02', grossWage: 3000 }],
      );

      // Smoothed, February would be the year's average; raw, it is the 12,000 that actually landed.
      expect(rowsOf(TAKE_HOME)[1][1]).toBe('€12,000.00');
    });

    it('leaves an annual lump-sum category out of the take-home basis entirely (TICKET-INC-14)', async () => {
      // February pays the regular 2,160 salary plus a separately-categorised 12,000 13th month.
      await setup(
        [payslip(1, '2026-02-25', 2160), payslip(2, '2026-02-26', 12000, 2)],
        [{ id: 1, yearMonth: '2026-02', grossWage: 3000 }],
        { smoothedBonusCategoryIds: [2] },
      );

      // Without the exclusion February's 14,160 against a 3,000 gross would read as 472%.
      expect(rowsOf(TAKE_HOME)[0]).toEqual(['2026-02', '€2,160.00', '€3,000.00', '72%']);
    });

    it('prints the true, unclipped rate in the companion table even when the band clips', async () => {
      await setup(
        [payslip(1, '2026-01-25', 3120)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(rowsOf(TAKE_HOME)[0]).toEqual(['2026-01', '€3,120.00', '€3,000.00', '104%']);
      expect(optionOf('takeHomeOption').series[0].data[0]).toBe(1);
    });
  });

  describe('the growth cells', () => {
    /** January 2,160 net on a 3,000 gross; February raised to 2,300 on 3,300. */
    const A_RAISE = async (settings: Partial<AppSettings> = {}): Promise<void> =>
      setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 2300)],
        [
          { id: 1, yearMonth: '2026-01', grossWage: 3000 },
          { id: 2, yearMonth: '2026-02', grossWage: 3300 },
        ],
        settings,
      );

    it('plots both levels on the absolute cell', async () => {
      await A_RAISE();

      expect(rowsOf(ABSOLUTE)[0]).toEqual(['2026-01', '€2,160.00', '€3,000.00']);
      expect(rowsOf(ABSOLUTE)[1]).toEqual(['2026-02', '€2,300.00', '€3,300.00']);
    });

    it('starts both from-start cells at zero on the shared baseline month', async () => {
      await A_RAISE();

      expect(rowsOf(FROM_START)[0]).toEqual(['2026-01', '€0.00', '€0.00']);
      expect(rowsOf(PCT_FROM_START)[0]).toEqual(['2026-01', '0%', '0%']);
    });

    it('shows gross outrunning net when the deduction rate climbs', async () => {
      await A_RAISE();

      // Gross +10%, net +6.5% — the raise did not pass through intact.
      expect(rowsOf(PCT_FROM_START)[1]).toEqual(['2026-02', '6.5%', '10%']);
      expect(rowsOf(FROM_START)[1]).toEqual(['2026-02', '€140.00', '€300.00']);
    });

    it('breaks only the gross line over a month with no wage entered', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 2300)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(rowsOf(ABSOLUTE)[1]).toEqual(['2026-02', '€2,300.00', '—']);
      const option = optionOf('absoluteOption');
      expect(option.series[1].data[1]).toBeNull();
      expect(option.series[0].data[1]).toBe(2300);
    });

    it('keeps a flagged bonus category out of the growth basis, so it cannot read as a raise', async () => {
      await setup(
        [
          payslip(1, '2026-01-25', 2160),
          payslip(2, '2026-02-25', 2160),
          payslip(3, '2026-02-26', 12000, 2),
        ],
        [
          { id: 1, yearMonth: '2026-01', grossWage: 3000 },
          { id: 2, yearMonth: '2026-02', grossWage: 3000 },
        ],
        { smoothedBonusCategoryIds: [2] },
      );

      // February's 12,000 13th month is excluded, so the percentage line stays flat across it.
      expect(rowsOf(PCT_FROM_START)[0]).toEqual(['2026-01', '0%', '0%']);
      expect(rowsOf(PCT_FROM_START)[1]).toEqual(['2026-02', '0%', '0%']);
    });
  });

  describe('months with nothing to compare', () => {
    it('skips a month where no counted income landed, rather than dragging net to the floor', async () => {
      // February has no payslip at all; without the filter its net would plot as a zero.
      await setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-03-25', 2300)],
        [
          { id: 1, yearMonth: '2026-01', grossWage: 3000 },
          { id: 2, yearMonth: '2026-03', grossWage: 3300 },
        ],
      );

      expect(rowsOf(ABSOLUTE).map((row) => row[0])).toEqual(['2026-01', '2026-03']);
    });

    it('skips a month whose entered gross was zero', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 2300)],
        [
          { id: 1, yearMonth: '2026-01', grossWage: 3000 },
          { id: 2, yearMonth: '2026-02', grossWage: 0 },
        ],
      );

      expect(rowsOf(ABSOLUTE).map((row) => row[0])).toEqual(['2026-01']);
    });

    it('keeps a month with income but no gross entered — “not entered” is not “zero”', async () => {
      await setup(
        [payslip(1, '2026-01-25', 2160), payslip(2, '2026-02-25', 2300)],
        [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      );

      expect(rowsOf(ABSOLUTE).map((row) => row[0])).toEqual(['2026-01', '2026-02']);
      expect(rowsOf(ABSOLUTE)[1]).toEqual(['2026-02', '€2,300.00', '—']);
    });

    it('measures growth from the first *shown* month, so a skipped one cannot be the baseline', async () => {
      await setup(
        [payslip(1, '2026-02-25', 2000), payslip(2, '2026-03-25', 2200)],
        [
          { id: 1, yearMonth: '2026-02', grossWage: 3000 },
          { id: 2, yearMonth: '2026-03', grossWage: 3300 },
        ],
      );

      // January has no income and is skipped; February is the baseline, so it reads 0%.
      expect(rowsOf(PCT_FROM_START)[0]).toEqual(['2026-02', '0%', '0%']);
      expect(rowsOf(PCT_FROM_START)[1]).toEqual(['2026-03', '10%', '10%']);
    });
  });

  it('draws gross in the picked color across every cell (TICKET-SET-08)', async () => {
    await setup(
      [payslip(1, '2026-01-25', 2160)],
      [{ id: 1, yearMonth: '2026-01', grossWage: 3000 }],
      { grossColor: 'violet' },
    );

    const expected = resolveGrossSeriesColor('violet');

    expect(optionOf('takeHomeOption').series[1].itemStyle?.color).toBe(expected);
    expect(optionOf('absoluteOption').series[1].itemStyle?.color).toBe(expected);
    expect(optionOf('pctFromStartOption').series[1].itemStyle?.color).toBe(expected);
  });
});
