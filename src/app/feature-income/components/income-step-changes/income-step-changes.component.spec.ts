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
import type { IncomeStepChange } from '@/core/stats';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import {
  buildStepChangeCallout,
  IncomeStepChangesComponent,
} from './income-step-changes.component';

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

const change = (overrides: Partial<IncomeStepChange> = {}): IncomeStepChange => ({
  categoryId: 1,
  changedAtBucketKey: '2026-03',
  direction: 'increase',
  fromAvg: 2500,
  toAvg: 2800,
  pctChange: 0.12,
  ...overrides,
});

describe('buildStepChangeCallout (FR-INC-8, TICKET-INC-08)', () => {
  const categoriesById = new Map<number, Category>([[1, salary]]);

  it('names the category, the size of the move and roughly when it happened', () => {
    const { message } = buildStepChangeCallout(change(), categoriesById);

    expect(message).toContain('Salary');
    expect(message).toContain('increased');
    expect(message).toContain('12%');
    expect(message).toContain('03/01/2026');
  });

  it('formats both amounts through formatCurrency — no hardcoded symbol or separator', () => {
    const { message } = buildStepChangeCallout(change(), categoriesById);

    expect(message).toContain('€2,500.00');
    expect(message).toContain('€2,800.00');
  });

  it('follows the currency setting rather than printing a euro sign', () => {
    syncFormatSettings({
      currencySymbol: '$',
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });

    const { message } = buildStepChangeCallout(change(), categoriesById);

    expect(message).toContain('$2,500.00');
    expect(message).not.toContain('€');

    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('states a decrease as a drop, and warns rather than celebrates', () => {
    const callout = buildStepChangeCallout(
      change({ direction: 'decrease', fromAvg: 2800, toAvg: 2400, pctChange: -0.143 }),
      categoriesById,
    );

    expect(callout.message).toContain('dropped');
    expect(callout.message).toContain('14.3%');
    expect(callout.status).toBe('warning');
  });

  it('marks a raise as good news', () => {
    expect(buildStepChangeCallout(change(), categoriesById).status).toBe('success');
  });

  it('falls back to a generic name when the category is gone', () => {
    expect(buildStepChangeCallout(change(), new Map()).message).toContain('Income');
  });

  it('keys a callout by category and month, so two changes never collide', () => {
    const first = buildStepChangeCallout(change(), categoriesById).key;
    const second = buildStepChangeCallout(
      change({ changedAtBucketKey: '2026-09' }),
      categoriesById,
    ).key;

    expect(first).not.toBe(second);
  });
});

describe('IncomeStepChangesComponent', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };

  let fixture: ComponentFixture<IncomeStepChangesComponent>;

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

  /** One payslip on the 15th of each month in `yearMonths`, all in the same category. */
  const payslips = (
    yearMonths: string[],
    amountFor: (yearMonth: string, index: number) => number,
    categoryId = 1,
  ): Transaction[] =>
    yearMonths.map((yearMonth, index) => ({
      id: index + 1,
      accountId: 1,
      bookingDate: `${yearMonth}-15`,
      amount: amountFor(yearMonth, index),
      currency: 'EUR',
      rawDescription: 'Payslip',
      fingerprint: `fp-${index + 1}`,
      categoryId,
      createdAt: `${yearMonth}-15T00:00:00.000Z`,
    }));

  const MONTHS_2025 = Array.from(
    { length: 12 },
    (_, index) => `2025-${String(index + 1).padStart(2, '0')}`,
  );

  const setup = async (
    transactions: Transaction[],
    categories: Category[] = [salary],
    settings: Partial<AppSettings> = {},
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue(categories);
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);

    await TestBed.configureTestingModule({
      imports: [IncomeStepChangesComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeStepChangesComponent);
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

  it('renders a callout for a sustained raise partway through the history', async () => {
    // 2500/mo for the first half of 2025, 2900/mo from July.
    await setup(payslips(MONTHS_2025, (_, index) => (index < 6 ? 2500 : 2900)));

    expect(alerts()).toHaveLength(1);
    expect(alerts()[0].textContent).toContain('Salary increased');
  });

  it('renders nothing at all for a flat income history', async () => {
    await setup(payslips(MONTHS_2025, () => 2500));

    expect(alerts()).toHaveLength(0);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('produces no callout for an annual lump sum the user has flagged for smoothing (FR-INC-4)', async () => {
    const bonusCategory: Category = { ...salary, id: 2, name: 'Holiday bonus' };
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

    await setup([...payslips(MONTHS_2025, () => 500), bonus], [salary, bonusCategory], {
      smoothedBonusCategoryIds: [2],
    });

    expect(alerts()).toHaveLength(0);
  });

  it('drops a callout once it is dismissed', async () => {
    await setup(payslips(MONTHS_2025, (_, index) => (index < 6 ? 2500 : 2900)));

    (alerts()[0].querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(alerts()).toHaveLength(0);
  });
});
