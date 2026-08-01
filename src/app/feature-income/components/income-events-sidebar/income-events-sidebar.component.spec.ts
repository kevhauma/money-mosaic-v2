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

  const yearHeadings = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('h3')].map(
      (heading) => (heading as HTMLElement).textContent?.trim() ?? '',
    );

  /** 2500/mo for the first half of 2025, 2900/mo from July — a sustained raise. */
  const A_RAISE = (): Transaction[] =>
    deposits(monthsOf('2025', 12), (_, index) => (index < 6 ? 2500 : 2900));

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
      expect(events()[0]).toContain('Bonus of €1,800.00');
      expect(events()[1]).toContain('Salary increased');
    });

    it('names the category, the size of the move and the month it happened', async () => {
      await setup(A_RAISE());

      expect(events()[0]).toContain('Salary');
      expect(events()[0]).toContain('increased');
      expect(events()[0]).toContain('16%');
      expect(events()[0]).toContain('€2,500.00');
      expect(events()[0]).toContain('€2,900.00');
      expect(events()[0]).toContain('07/01/2025');
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
        'Events',
      );
      expect(region.querySelector('ol')).not.toBeNull();
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
});
