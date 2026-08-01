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
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { buildIncomeGrowthCard, IncomeGrowthPanelComponent } from './income-growth-panel.component';

const comparisonWindow = (from: string, to: string, total: number, pct: number | null) => ({
  from,
  to,
  total,
  pct,
});

describe('buildIncomeGrowthCard (FR-INC-5, TICKET-INC-05)', () => {
  it('renders the delta with an explicit sign and both figures beneath it', () => {
    const card = buildIncomeGrowthCard(
      'vs. previous month',
      2200,
      comparisonWindow('2026-05-01', '2026-05-31', 2000, 0.1),
      'n/a',
    );

    expect(card.value).toBe('+10%');
    expect(card.subLabel).toContain('2,000');
    expect(card.subLabel).toContain('2,200');
  });

  it('colours a rise as growth and a decline as a loss', () => {
    const rise = comparisonWindow('2026-05-01', '2026-05-31', 2000, 0.1);
    const fall = comparisonWindow('2026-05-01', '2026-05-31', 2000, -0.1);
    const flat = comparisonWindow('2026-05-01', '2026-05-31', 2000, 0);

    expect(buildIncomeGrowthCard('x', 2200, rise, 'n/a').color).toBe('success');
    expect(buildIncomeGrowthCard('x', 1800, fall, 'n/a').color).toBe('error');
    expect(buildIncomeGrowthCard('x', 2000, flat, 'n/a').color).toBeUndefined();
  });

  it('shows a dash rather than ±∞% when the compared window earned nothing', () => {
    const card = buildIncomeGrowthCard(
      'vs. previous month',
      2200,
      comparisonWindow('2026-05-01', '2026-05-31', 0, null),
      'n/a',
    );

    expect(card.value).toBe('—');
    expect(card.color).toBeUndefined();
  });

  it('says why there is no comparison at all, rather than showing an empty card', () => {
    const card = buildIncomeGrowthCard(
      'vs. same month last year',
      2200,
      null,
      'no data from a year ago yet',
    );

    expect(card.value).toBe('—');
    expect(card.subLabel).toBe('no data from a year ago yet');
    expect(card.tooltip).toBe('');
  });
});

describe('IncomeGrowthPanelComponent', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };

  let fixture: ComponentFixture<IncomeGrowthPanelComponent>;

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
    settings: Partial<AppSettings> = {},
  ): Promise<void> => {
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);

    await TestBed.configureTestingModule({
      imports: [IncomeGrowthPanelComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeGrowthPanelComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  /** The two comparison cards, as `{ label, value }` pairs. */
  const cards = (): { label: string; value: string }[] =>
    [...fixture.nativeElement.querySelectorAll('mm-stat-card')].map((card) => ({
      label: (card as HTMLElement).querySelector('.stat-title')?.textContent?.trim() ?? '',
      value: (card as HTMLElement).querySelector('.stat-value')?.textContent?.trim() ?? '',
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    // `IncomeStore.incomeRange` runs to *today*, and which month is "the last complete one" flips
    // on the last day of every month — so the clock is pinned mid-month rather than left to decide
    // once a month whether these assertions hold. Only `Date` is faked; timers stay real, so
    // TestBed's own async plumbing is untouched.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([salary]);
  });

  // Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are
  // process-global module signals (Vitest runs with isolate:false) — reset them so specs that
  // assume the default symbol/locale don't depend on this file's run order.
  afterEach(() => {
    vi.useRealTimers();
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('compares the last complete month against the month before and the same month a year back', async () => {
    await setup([
      payslip(1, '2025-07-15', 2000),
      payslip(2, '2026-06-15', 2500),
      payslip(3, '2026-07-15', 3000),
    ]);

    expect(cards()).toEqual([
      { label: 'vs. previous month', value: '+20%' },
      { label: 'vs. same month last year', value: '+50%' },
    ]);
  });

  it('names the month it compared, so the two deltas are unambiguous', async () => {
    await setup([payslip(1, '2026-06-15', 2500), payslip(2, '2026-07-15', 3000)]);

    // August is in progress on the pinned clock, so July is the month under comparison.
    expect(fixture.nativeElement.textContent).toContain('07/01/2026');
    expect(fixture.nativeElement.textContent).toContain('07/31/2026');
    expect(fixture.nativeElement.textContent).toContain('last complete month');
  });

  it('shows no percentage rather than ±∞% when the compared month earned nothing', async () => {
    await setup([payslip(1, '2026-07-15', 3000)]);

    expect(cards()[0].value).toBe('—');
    expect(fixture.nativeElement.textContent).not.toContain('Infinity');
    expect(fixture.nativeElement.textContent).not.toContain('NaN');
  });

  it('drops a deselected category from both sides of the comparison (FR-INC-3)', async () => {
    await setup([payslip(1, '2026-06-15', 2500), payslip(2, '2026-07-15', 3000)], {
      excludedIncomeCategoryIds: [1],
    });

    // With the only income category excluded, both windows are zero — so there is no % to state.
    expect(cards()[0].value).toBe('—');
  });

  it('spreads a smoothed bonus over its year instead of reading it as a raise (FR-INC-4)', async () => {
    categoriesRepository.getAll.mockResolvedValue([
      salary,
      { ...salary, id: 2, name: 'Holiday bonus' },
    ]);

    await setup(
      [
        payslip(1, '2026-06-15', 2000),
        payslip(2, '2026-07-15', 2000),
        payslip(3, '2026-07-20', 6000, 2),
      ],
      { smoothedBonusCategoryIds: [2] },
    );

    // Unsmoothed, July would be 8000 against June's 2000 — a +300% "raise". Smoothed, the bonus is
    // spread across 2026's eight rendered months, so both windows carry the same share of it.
    expect(cards()[0].value).toBe('0%');
  });

  it('reads the bonus as a spike when it is not marked for smoothing', async () => {
    categoriesRepository.getAll.mockResolvedValue([
      salary,
      { ...salary, id: 2, name: 'Holiday bonus' },
    ]);

    await setup([
      payslip(1, '2026-06-15', 2000),
      payslip(2, '2026-07-15', 2000),
      payslip(3, '2026-07-20', 6000, 2),
    ]);

    expect(cards()[0].value).toBe('+300%');
  });

  it('says so when the history holds no complete month yet', async () => {
    accountsRepository.getAll.mockResolvedValue([{ ...account, openingBalanceDate: '2026-08-01' }]);

    await setup([payslip(1, '2026-08-05', 2000)]);

    expect(fixture.nativeElement.querySelector('mm-stat-card')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No complete calendar month');
  });
});
