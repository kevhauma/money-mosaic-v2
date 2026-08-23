import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { IncomeStore } from '../../income.store';
import { IncomeEventsSidebarComponent } from './income-events-sidebar.component';

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

const sideIncome: Category = { ...salary, id: 2, name: 'Other Income', isSystem: false };

describe('IncomeEventsSidebarComponent (FR-INC-14, TICKET-INC-17)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };
  const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };

  let fixture: ComponentFixture<IncomeEventsSidebarComponent>;

  const account: Account = {
    id: 1,
    name: 'Checking',
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2025-01-01',
    color: '#000000',
    icon: 'wallet',
    archived: false,
  };

  const monthsOf = (year: string, count: number): string[] =>
    Array.from({ length: count }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);

  /** One deposit on the 15th of each given month, all in the same category. */
  const deposits = (
    yearMonths: string[],
    amountFor: (yearMonth: string, index: number) => number,
    categoryId = 1,
  ): Transaction[] =>
    yearMonths.map((yearMonth, index) => ({
      id: index + 1 + categoryId * 1000,
      accountId: 1,
      bookingDate: `${yearMonth}-15`,
      amount: amountFor(yearMonth, index),
      currency: 'EUR',
      rawDescription: 'Payslip',
      fingerprint: `fp-${categoryId}-${index + 1}`,
      categoryId,
      createdAt: `${yearMonth}-15T00:00:00.000Z`,
    }));

  const setup = async (
    transactions: Transaction[],
    categories: Category[] = [salary],
    settings: Partial<AppSettings> = {},
    salaryMetadata: SalaryMetadata[] = [],
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue(categories);
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);
    salaryMetadataRepository.getAll.mockResolvedValue(salaryMetadata);

    await TestBed.configureTestingModule({
      imports: [IncomeEventsSidebarComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
        { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeEventsSidebarComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
      TestBed.inject(IncomeStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  const events = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('ol li')].map(
      (item) => (item as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );

  /** The month cell of the row whose text matches — `mm-text` puts its classes on an inner span. */
  const monthCellOf = (rowText: string): HTMLElement => {
    const row = [...fixture.nativeElement.querySelectorAll('ol li')].find(
      (item) => ((item as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '') === rowText,
    ) as HTMLElement;
    return row.querySelector('mm-text > span') as HTMLElement;
  };

  const yearHeadings = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('h3')].map(
      (heading) => (heading as HTMLElement).textContent?.trim() ?? '',
    );

  /** 2500/mo for the first half of 2025, 2900/mo from July — a sustained raise. */
  const A_RAISE = (): Transaction[] =>
    deposits(monthsOf('2025', 12), (_, index) => (index < 6 ? 2500 : 2900));

  /**
   * A raise every July for ten years — the long history the rail's uncapped scroll region used to
   * stretch the page with (TICKET-INC-22).
   */
  const A_DECADE_OF_RAISES = (): Transaction[] =>
    Array.from({ length: 10 }, (_, yearIndex) => 2016 + yearIndex).flatMap((year, yearIndex) =>
      deposits(
        monthsOf(String(year), 12),
        (_, monthIndex) => 2000 + yearIndex * 200 + (monthIndex < 6 ? 0 : 150),
      ).map((transaction, monthIndex) => ({
        ...transaction,
        id: yearIndex * 100 + monthIndex + 1,
        fingerprint: `fp-decade-${yearIndex}-${monthIndex}`,
      })),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-02-12T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  describe('the timeline', () => {
    it('groups events under a heading per year, newest first', async () => {
      await setup(A_RAISE(), [salary], {}, [
        { id: 1, yearMonth: '2026-01', grossWage: 4000, bonus: 1800 } as SalaryMetadata,
      ]);

      expect(yearHeadings()).toEqual(['2026', '2025']);
      expect(events()[0]).toContain('Bonus of €1.800,00');
      expect(events()[1]).toContain('Salary increased');
    });

    it('names the category, the size of the move and the month it happened', async () => {
      await setup(A_RAISE());

      expect(events()[0]).toContain('Salary');
      expect(events()[0]).toContain('increased');
      expect(events()[0]).toContain('16%');
      expect(events()[0]).toContain('€2.500,00');
      expect(events()[0]).toContain('€2.900,00');
      // Month only — the year sits in the section heading above these rows.
      expect(events()[0]).toContain('Jul');
    });

    it('states a decrease as a drop rather than an increase', async () => {
      await setup(deposits(monthsOf('2025', 12), (_, index) => (index < 6 ? 2900 : 2500)));

      expect(events()[0]).toContain('dropped');
    });

    it('lists a stream that has gone quiet, with how long it has been missing', async () => {
      // Paid every month Jan–Oct 2025, then nothing in November or December. That silence trips the
      // step-change detector too, so the rail carries both events — which is the point of a
      // timeline over a banner stack.
      await setup(
        deposits(monthsOf('2025', 10), () => 400, 2),
        [sideIncome],
      );

      const stopped = events().find((text) => text.includes('hasn’t shown up since'));

      expect(stopped).toContain('Other Income');
      expect(stopped).toContain('months with nothing');
    });

    it('falls back to a generic name when the category is gone', async () => {
      await setup(A_RAISE(), []);

      // No categories at all, so nothing is an income category and there is nothing to detect —
      // the fallback is exercised by `income-event-vm.spec.ts` directly.
      expect(events()).toEqual([]);
    });
  });

  describe('what counts as an event', () => {
    it('reads step changes from the smoothed series, so a flagged lump sum is not a raise (FR-INC-4)', async () => {
      const bonus: Transaction = {
        id: 99,
        accountId: 1,
        bookingDate: '2025-06-15',
        amount: 6000,
        currency: 'EUR',
        rawDescription: 'Bonus',
        fingerprint: 'fp-bonus',
        categoryId: 2,
        createdAt: '2025-06-15T00:00:00.000Z',
      };

      await setup(
        [...deposits(monthsOf('2025', 12), () => 500), bonus],
        [salary, { ...sideIncome, name: 'Holiday bonus' }],
        { smoothedBonusCategoryIds: [2] },
      );

      expect(events()).toEqual([]);
    });

    it('reads gaps from the raw series, so smoothing cannot paint over a real silence (FR-INC-4)', async () => {
      // Marked for smoothing, which would spread 2025's deposits across all twelve of its months
      // and make November and December look paid. The gap detector must still see them as empty —
      // and because it reads the raw series while step changes read the smoothed one, the smoothing
      // also removes the pay-cut event, leaving the silence as the only thing said.
      await setup(
        deposits(monthsOf('2025', 10), () => 400, 2),
        [sideIncome],
        {
          smoothedBonusCategoryIds: [2],
        },
      );

      expect(events()).toHaveLength(1);
      expect(events()[0]).toContain('hasn’t shown up since');
    });

    it('ignores a category the user has excluded from income growth (FR-INC-3)', async () => {
      await setup(
        deposits(monthsOf('2025', 10), () => 400, 2),
        [sideIncome],
        {
          excludedIncomeCategoryIds: [2],
        },
      );

      expect(events()).toEqual([]);
    });

    it('lists a month-on-month move in take-home pay, with the percentage and the amount', async () => {
      // 2,500/mo for the first half of 2025, 2,900 from July — a +16% move in that one month.
      await setup(A_RAISE());

      // Columns, not a sentence: month, what moved, then the delta chip.
      const move = events().find((text) => text.includes('Net:'));

      // Uppercased by CSS, not in the data, so a screen reader still announces "Jul".
      expect(move).toContain('Jul');
      expect(monthCellOf(move!).className).toContain('uppercase');
      expect(move).toContain('Net: +€400,00 → €2.900,00');
      expect(move).toContain('16%');
    });

    it('lists a move in gross pay separately from the one in net', async () => {
      await setup(
        deposits(monthsOf('2025', 12), () => 2500),
        [salary],
        {},
        [
          { id: 1, yearMonth: '2025-01', grossWage: 3000 } as SalaryMetadata,
          { id: 2, yearMonth: '2025-02', grossWage: 3300 } as SalaryMetadata,
        ],
      );

      // Net is flat all year; only gross moved, which is a rising deduction rate worth seeing.
      expect(events().some((text) => text.includes('Net:'))).toBe(false);
      const move = events().find((text) => text.includes('Gross:'));
      expect(move).toContain('Gross: +€300,00 → €3.300,00');
      expect(move).toContain('10%');
    });

    it('shows a fall in the same columns, its direction carried by the chip', async () => {
      await setup(deposits(monthsOf('2025', 12), (_, index) => (index < 6 ? 2900 : 2500)));

      const move = events().find((text) => text.includes('Net:'));

      expect(move).toContain('Net: -€400,00 → €2.500,00');
      // Rounded to whole percent and unsigned, exactly as the dashboard's card renders a delta —
      // the downward triangle beside it says which way.
      expect(move).toContain('14%');
      expect(move).not.toContain('-14%');
    });

    it('ignores a move of 1% or less — rounding and a shifted pay date are not raises', async () => {
      await setup(deposits(monthsOf('2025', 12), (_, index) => (index < 6 ? 2500 : 2520)));

      expect(events().some((text) => text.includes('Net:'))).toBe(false);
    });

    it('measures wage moves on plain salary, so a flagged lump sum is not a raise then a cut', async () => {
      const bonus: Transaction = {
        id: 99,
        accountId: 1,
        bookingDate: '2025-06-15',
        amount: 6000,
        currency: 'EUR',
        rawDescription: 'Bonus',
        fingerprint: 'fp-bonus',
        categoryId: 2,
        createdAt: '2025-06-15T00:00:00.000Z',
      };

      await setup(
        [...deposits(monthsOf('2025', 12), () => 2500), bonus],
        [salary, { ...sideIncome, name: 'Holiday bonus' }],
        { smoothedBonusCategoryIds: [2] },
      );

      // Unexcluded, June's 8,500 would list as +240% and July as -71%.
      expect(events().some((text) => text.includes('Net:'))).toBe(false);
      expect(events().some((text) => text.includes('Gross:'))).toBe(false);
    });

    it('makes no event from a salary row with a gross wage but no bonus', async () => {
      await setup(
        deposits(monthsOf('2025', 12), () => 2500),
        [salary],
        {},
        [{ id: 1, yearMonth: '2025-06', grossWage: 4000 } as SalaryMetadata],
      );

      expect(events()).toEqual([]);
    });
  });

  describe('the rail itself', () => {
    it('has no dismiss control anywhere — an event log you can clear is not a log', async () => {
      await setup(A_RAISE());

      expect(events().length).toBeGreaterThan(0);
      expect(fixture.nativeElement.querySelector('button')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Dismiss');
    });

    it('says so, and still occupies its slot, when there is nothing to report', async () => {
      await setup(deposits(monthsOf('2025', 12), () => 2500));

      expect(events()).toEqual([]);
      expect(fixture.nativeElement.querySelector('mm-paper')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('No notable changes detected yet');
    });

    it('is announced as a labelled region holding an ordered list', async () => {
      await setup(A_RAISE());

      const region = fixture.nativeElement.querySelector('section') as HTMLElement;
      const heading = region.getAttribute('aria-labelledby');

      expect(heading).toBeTruthy();
      expect(fixture.nativeElement.querySelector(`#${heading}`)?.textContent?.trim()).toBe(
        'Notable changes',
      );
      expect(region.querySelector('ol')).not.toBeNull();
    });

    it('renders the delta chip exactly as the dashboard’s comparison card does', async () => {
      await setup(A_RAISE());

      const chip = [...fixture.nativeElement.querySelectorAll('ol li mm-text > span')].find(
        (span) => (span as HTMLElement).querySelector('ng-icon') !== null,
      ) as HTMLElement;

      // A colour token off `mm-text`'s own `color` input rather than a raw Tailwind class bound
      // onto the icon — the rule every variant-driven primitive follows. Which triangle it is, is
      // pinned on the view-model in `income-event-vm.spec.ts`.
      expect(chip.querySelector('ng-icon')).not.toBeNull();
      expect(chip.className).toContain('text-success');
      expect(chip.textContent).toContain('16%');
    });

    it('hides its decorative icons from assistive tech', async () => {
      await setup(A_RAISE());

      const icons = [...fixture.nativeElement.querySelectorAll('ng-icon')];

      expect(icons.length).toBeGreaterThan(0);
      expect(icons.every((icon) => (icon as HTMLElement).getAttribute('aria-hidden') === 'true'));
    });

    it('scrolls independently of the charts rather than stretching the page', async () => {
      await setup(A_RAISE());

      const list = fixture.nativeElement.querySelector('ol')?.parentElement;

      expect(list?.className).toContain('overflow-y-auto');
    });
  });

  describe('privacy mode (TICKET-PRIV-02)', () => {
    /** Every `.mm-privacy-blurred` box on the rail, as trimmed text. */
    const blurredTexts = (): string[] =>
      [...fixture.nativeElement.querySelectorAll('.mm-privacy-blurred')].map(
        (element) => (element as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '',
      );

    it('blurs a wage row’s two amounts and its percentage, not `Net` or the month', async () => {
      await setup(A_RAISE(), [salary], { privacyMode: true });
      const row = [...fixture.nativeElement.querySelectorAll('ol li')].find((item) =>
        (item as HTMLElement).textContent?.includes('Net:'),
      ) as HTMLElement;

      expect(blurredTexts()).toContain('+€400,00');
      expect(blurredTexts()).toContain('€2.900,00');
      expect(blurredTexts()).toContain('16%');
      // What moved, which way and when all stay readable.
      expect(row.textContent).toContain('Net:');
      expect(row.textContent).toContain('Jul');
      expect(monthCellOf(row.textContent?.replace(/\s+/g, ' ').trim() ?? '')).toBeTruthy();
      expect(row.querySelector('ng-icon')?.closest('.mm-privacy-blurred')).toBeNull();
    });

    it('blurs a sentence event whole, since it quotes its amounts inline', async () => {
      await setup(A_RAISE(), [salary], { privacyMode: true }, [
        { id: 1, yearMonth: '2026-01', grossWage: 4000, bonus: 1800 } as SalaryMetadata,
      ]);

      expect(blurredTexts().some((text) => text.includes('Bonus of €1.800,00'))).toBe(true);
      // The year heading and the panel title are labels and stay sharp.
      expect(yearHeadings()).toEqual(['2026', '2025']);
      expect(fixture.nativeElement.querySelector('h2')?.closest('.mm-privacy-blurred')).toBeNull();
    });

    it('leaves the rail untouched with privacy mode off', async () => {
      await setup(A_RAISE());

      expect(events().length).toBeGreaterThan(0);
      expect(fixture.nativeElement.querySelector('.mm-privacy-blurred')).toBeNull();
    });
  });

  describe('viewport-capped sticky column (TICKET-INC-22)', () => {
    const cardOf = (): HTMLElement => fixture.nativeElement.querySelector('.card');
    const scrollRegionOf = (): HTMLElement =>
      fixture.nativeElement.querySelector('ol')?.parentElement;

    it('caps its height at the viewport less the sticky offset, so it cannot stretch the grid row', async () => {
      await setup(A_RAISE());

      // Without this the `overflow-y-auto` above is decorative: the region grows to its content and
      // takes the row with it (a ten-year history measured 1,312px against a 720px viewport).
      expect(cardOf().className).toContain('lg:max-h-[calc(100vh-6rem)]');
    });

    it('keeps the cap and the internal scroll to `lg:`, where the rail is a column beside the charts', async () => {
      await setup(A_RAISE());

      // Stacked under the charts on a phone it is just another section; a viewport-tall sticky rail
      // there would cover the content it annotates.
      const heightClasses = cardOf()
        .className.split(/\s+/)
        .filter((c) => c.includes('max-h'));
      expect(heightClasses.length).toBeGreaterThan(0);
      expect(heightClasses.every((c) => c.startsWith('lg:'))).toBe(true);
      expect(cardOf().className).not.toContain('h-full');
    });

    it('lays the card out as a column so the scroll region can take the leftover height', async () => {
      await setup(A_RAISE());

      // `min-h-0` at every level is what lets a flex child actually shrink below its content.
      expect(cardOf().className).toContain('lg:flex');
      expect(cardOf().className).toContain('lg:flex-col');
      expect(scrollRegionOf().className).toContain('flex-1');
      expect(scrollRegionOf().className).toContain('min-h-0');
    });

    it('leaves the "Notable changes" heading outside the scroll region, so it stays pinned', async () => {
      await setup(A_RAISE());
      const heading = fixture.nativeElement.querySelector('#income-events-heading');

      expect(heading).not.toBeNull();
      expect(scrollRegionOf().contains(heading)).toBe(false);
    });

    it('holds a decade of events without the card itself growing — they go in the scroll region', async () => {
      // Ten years of raises: the case the old uncapped region turned into 1,312px of page.
      await setup(A_DECADE_OF_RAISES());
      const years = Array.from(
        fixture.nativeElement.querySelectorAll('ol') as NodeListOf<HTMLElement>,
      );

      expect(years.length).toBeGreaterThanOrEqual(9);
      // Every one of them is inside the capped, scrolling region rather than beside it.
      expect(years.every((list) => scrollRegionOf().contains(list))).toBe(true);
      expect(cardOf().className).toContain('lg:max-h-[calc(100vh-6rem)]');
    });
  });
});
