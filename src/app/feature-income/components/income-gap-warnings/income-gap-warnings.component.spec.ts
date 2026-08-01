import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import type { IncomeGap } from '@/core/stats';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { buildGapWarning, IncomeGapWarningsComponent } from './income-gap-warnings.component';

const sideIncome: Category = {
  id: 1,
  name: 'Other Income',
  kind: 'income',
  color: '#34d399',
  icon: 'cash',
  archived: false,
  isSystem: false,
  sortOrder: 1,
};

describe('buildGapWarning (FR-INC-9, TICKET-INC-09)', () => {
  const categoriesById = new Map<number, Category>([[1, sideIncome]]);

  const gap = (overrides: Partial<IncomeGap> = {}): IncomeGap => ({
    categoryId: 1,
    lastSeenBucketKey: '2026-04',
    monthsMissing: 3,
    ...overrides,
  });

  it('names the category and when it was last seen', () => {
    const { message } = buildGapWarning(gap(), categoriesById);

    expect(message).toContain('Other Income');
    expect(message).toContain('04/01/2026');
    expect(message).toContain('3 months');
  });

  it('formats the date through the locale setting, not a hardcoded month name', () => {
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: 'en-BE',
    });

    expect(buildGapWarning(gap(), categoriesById).message).toContain('01/04/2026');

    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('says "month" rather than "months" for a single missing month', () => {
    expect(buildGapWarning(gap({ monthsMissing: 1 }), categoriesById).message).toContain(
      '1 month ',
    );
  });

  it('falls back to a generic name when the category is gone', () => {
    expect(buildGapWarning(gap(), new Map()).message).toContain('An income category');
  });
});

describe('IncomeGapWarningsComponent', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };

  let fixture: ComponentFixture<IncomeGapWarningsComponent>;

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

  /** One deposit on the 15th of each named month. */
  const deposits = (yearMonths: string[], amount = 300, categoryId = 1): Transaction[] =>
    yearMonths.map((yearMonth, index) => ({
      id: index + 1,
      accountId: 1,
      bookingDate: `${yearMonth}-15`,
      amount,
      currency: 'EUR',
      rawDescription: 'Side gig',
      fingerprint: `fp-${categoryId}-${index + 1}`,
      categoryId,
      createdAt: `${yearMonth}-15T00:00:00.000Z`,
    }));

  const monthsOf2025 = (count: number): string[] =>
    Array.from({ length: count }, (_, index) => `2025-${String(index + 1).padStart(2, '0')}`);

  const setup = async (
    transactions: Transaction[],
    categories: Category[] = [sideIncome],
    settings: Partial<AppSettings> = {},
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue(categories);
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);

    await TestBed.configureTestingModule({
      imports: [IncomeGapWarningsComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeGapWarningsComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  const alerts = (): HTMLElement[] => [...fixture.nativeElement.querySelectorAll('mm-alert')];

  beforeEach(() => {
    vi.clearAllMocks();
    // Pinned mid-month: the current bucket is always in progress, which is what the detector's
    // "newest complete month" rule exists to handle.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-12T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('warns when a monthly income stream stops for two months', async () => {
    // Paid every month Jan–Oct 2025, then nothing in November or December.
    await setup(deposits(monthsOf2025(10)));

    expect(alerts()).toHaveLength(1);
    expect(alerts()[0].textContent).toContain('Other Income hasn’t shown up since');
  });

  it('renders nothing at all while every stream is still arriving', async () => {
    await setup(deposits(monthsOf2025(12)));

    expect(alerts()).toHaveLength(0);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('does not warn about the in-progress month, where a late payslip is not a lost stream', async () => {
    // Paid every month of 2025 and nothing yet in January 2026 — which is still in progress.
    await setup(deposits(monthsOf2025(12)));

    expect(alerts()).toHaveLength(0);
  });

  it('ignores a category the user has excluded from income growth (FR-INC-3)', async () => {
    await setup(deposits(monthsOf2025(10)), [sideIncome], { excludedIncomeCategoryIds: [1] });

    expect(alerts()).toHaveLength(0);
  });

  it('reads the raw series, so smoothing cannot paint over a real silence (FR-INC-4)', async () => {
    // Marked for smoothing, which would spread 2025's deposits across all twelve of its months and
    // make November and December look paid. The detector must still see them as empty.
    await setup(deposits(monthsOf2025(10)), [sideIncome], { smoothedBonusCategoryIds: [1] });

    expect(alerts()).toHaveLength(1);
  });
});
