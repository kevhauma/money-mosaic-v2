import { TestBed } from '@angular/core/testing';
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
import { IncomeStore } from './income.store';

// Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are process-global
// module signals (Vitest runs with isolate:false) — reset them so specs that assume the default
// symbol/locale don't depend on this file's run order (same guard as `app-settings.store.spec.ts`).
const restoreFormatSettings = (): void =>
  syncFormatSettings({
    currencySymbol: DEFAULT_CURRENCY_SYMBOL,
    currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
    locale: DEFAULT_LOCALE,
  });

const category = (
  id: number,
  name: string,
  kind: Category['kind'],
  overrides: Partial<Category> = {},
): Category => ({
  id,
  name,
  kind,
  color: '#0ea5e9',
  icon: 'tablerTag',
  archived: false,
  isSystem: false,
  sortOrder: id,
  ...overrides,
});

const account = (id: number, openingBalanceDate: string): Account => ({
  id,
  name: `Account ${id}`,
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate,
  color: '#000000',
  icon: 'wallet',
  archived: false,
});

const transaction = (
  id: number,
  accountId: number,
  bookingDate: string,
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id,
  accountId,
  bookingDate,
  amount: 100,
  currency: 'EUR',
  rawDescription: 'Payslip',
  fingerprint: `fp-${id}`,
  categoryId: 1,
  createdAt: `${bookingDate}T00:00:00.000Z`,
  ...overrides,
});

const categoriesRepository = { getAll: vi.fn(), add: vi.fn() };
const accountsRepository = { getAll: vi.fn() };
const transactionsRepository = { getAll: vi.fn() };
const appSettingsRepository = {
  get: vi.fn(),
  setExcludedIncomeCategoryIds: vi.fn(),
  setCareerStartDate: vi.fn(),
  setSmoothedBonusCategoryIds: vi.fn(),
};
const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };

type SetupOptions = {
  excludedIncomeCategoryIds?: number[];
  smoothedBonusCategoryIds?: number[];
  careerStartDate?: string;
  accounts?: Account[];
  transactions?: Transaction[];
  salaryMetadata?: SalaryMetadata[];
};

/** Seeds every collaborator repository, then awaits the (idempotent) hydrations so the derived
 * lists are readable synchronously in the assertions. */
const setup = async (
  categories: Category[],
  options: SetupOptions = {},
): Promise<InstanceType<typeof IncomeStore>> => {
  const {
    excludedIncomeCategoryIds,
    smoothedBonusCategoryIds,
    careerStartDate,
    accounts = [],
    transactions = [],
    salaryMetadata = [],
  } = options;
  categoriesRepository.getAll.mockResolvedValue(categories);
  accountsRepository.getAll.mockResolvedValue(accounts);
  transactionsRepository.getAll.mockResolvedValue(transactions);
  salaryMetadataRepository.getAll.mockResolvedValue(salaryMetadata);
  appSettingsRepository.get.mockResolvedValue({
    id: 1,
    excludedIncomeCategoryIds,
    smoothedBonusCategoryIds,
    careerStartDate,
  } as AppSettings);
  appSettingsRepository.setExcludedIncomeCategoryIds.mockResolvedValue(1);
  appSettingsRepository.setCareerStartDate.mockResolvedValue(1);
  appSettingsRepository.setSmoothedBonusCategoryIds.mockResolvedValue(1);
  TestBed.configureTestingModule({
    providers: [
      { provide: CategoriesRepository, useValue: categoriesRepository },
      { provide: AccountsRepository, useValue: accountsRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: AppSettingsRepository, useValue: appSettingsRepository },
      { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
    ],
  });

  const store = TestBed.inject(IncomeStore);
  await store.hydrate();
  await TestBed.inject(CategoriesStore).hydrate();
  await TestBed.inject(AccountsStore).hydrate();
  await TestBed.inject(TransactionsStore).hydrate();
  await TestBed.inject(AppSettingsStore).hydrate();
  return store;
};

describe('IncomeStore: incomeCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(restoreFormatSettings);

  it('keeps only categories with kind "income"', async () => {
    const store = await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Groceries', 'expense'),
      category(3, 'Partner contribution', 'neutral'),
      category(4, 'Other Income', 'income'),
    ]);

    expect(store.incomeCategories().map((c) => c.name)).toEqual(['Salary', 'Other Income']);
  });

  it('excludes archived income categories, since it reads activeCategories', async () => {
    const store = await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Old side gig', 'income', { archived: true }),
    ]);

    expect(store.incomeCategories().map((c) => c.name)).toEqual(['Salary']);
  });

  it('is empty when the user has no income categories', async () => {
    const store = await setup([category(1, 'Groceries', 'expense')]);

    expect(store.incomeCategories()).toEqual([]);
  });
});

describe('IncomeStore: selectedIncomeCategoryIds (FR-INC-3, TICKET-INC-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(restoreFormatSettings);

  it('selects every income category when nothing has been excluded yet', async () => {
    const store = await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Other Income', 'income'),
      category(3, 'Groceries', 'expense'),
    ]);

    expect([...store.selectedIncomeCategoryIds()]).toEqual([1, 2]);
  });

  it('drops the ids the user has excluded', async () => {
    const store = await setup(
      [category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')],
      { excludedIncomeCategoryIds: [2] },
    );

    expect([...store.selectedIncomeCategoryIds()]).toEqual([1]);
  });

  it('defaults a newly added income category to selected without any extra action', async () => {
    const store = await setup(
      [category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')],
      { excludedIncomeCategoryIds: [2] },
    );
    categoriesRepository.add.mockResolvedValue(9);

    await TestBed.inject(CategoriesStore).addCategory(category(9, 'Side gig', 'income'));

    expect(store.selectedIncomeCategoryIds().has(9)).toBe(true);
  });

  it('drops an archived category from the selection, since it derives from incomeCategories', async () => {
    const store = await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Old side gig', 'income', { archived: true }),
    ]);

    expect([...store.selectedIncomeCategoryIds()]).toEqual([1]);
  });

  it('toggleIncomeCategory deselects a selected category, persisting the exclusion', async () => {
    const store = await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Other Income', 'income'),
    ]);

    await store.toggleIncomeCategory(2);

    expect(appSettingsRepository.setExcludedIncomeCategoryIds).toHaveBeenCalledExactlyOnceWith([2]);
    expect([...store.selectedIncomeCategoryIds()]).toEqual([1]);
  });

  it('toggleIncomeCategory reselects an excluded category', async () => {
    const store = await setup(
      [category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')],
      { excludedIncomeCategoryIds: [2] },
    );

    await store.toggleIncomeCategory(2);

    expect(appSettingsRepository.setExcludedIncomeCategoryIds).toHaveBeenCalledExactlyOnceWith([]);
    expect([...store.selectedIncomeCategoryIds()]).toEqual([1, 2]);
  });

  it('keeps an archived category’s exclusion, so un-archiving it does not silently re-select it', async () => {
    const store = await setup(
      [
        category(1, 'Salary', 'income'),
        category(2, 'Old side gig', 'income', { archived: true }),
        category(3, 'Other Income', 'income'),
      ],
      { excludedIncomeCategoryIds: [2] },
    );

    await store.toggleIncomeCategory(3);

    expect(appSettingsRepository.setExcludedIncomeCategoryIds).toHaveBeenCalledExactlyOnceWith([
      2, 3,
    ]);
  });
});

describe('IncomeStore: smoothedBonusCategoryIds (FR-INC-4, TICKET-INC-04)', () => {
  const TWO_INCOME_CATEGORIES = [
    category(1, 'Salary', 'income'),
    category(2, 'Holiday bonus', 'income'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(restoreFormatSettings);

  it('is empty for a fresh appSettings row — smoothing is opt-in, never a default', async () => {
    const store = await setup(TWO_INCOME_CATEGORIES);

    expect([...store.smoothedBonusCategoryIds()]).toEqual([]);
  });

  it('reads the persisted inclusion list', async () => {
    const store = await setup(TWO_INCOME_CATEGORIES, { smoothedBonusCategoryIds: [2] });

    expect([...store.smoothedBonusCategoryIds()]).toEqual([2]);
  });

  it('toggleSmoothedBonusCategory marks a category, persisting the list', async () => {
    const store = await setup(TWO_INCOME_CATEGORIES);

    await store.toggleSmoothedBonusCategory(2);

    expect(appSettingsRepository.setSmoothedBonusCategoryIds).toHaveBeenCalledExactlyOnceWith([2]);
    expect([...store.smoothedBonusCategoryIds()]).toEqual([2]);
  });

  it('toggleSmoothedBonusCategory unmarks a marked category', async () => {
    const store = await setup(TWO_INCOME_CATEGORIES, { smoothedBonusCategoryIds: [1, 2] });

    await store.toggleSmoothedBonusCategory(2);

    expect(appSettingsRepository.setSmoothedBonusCategoryIds).toHaveBeenCalledExactlyOnceWith([1]);
  });

  it('deselecting a category from the growth selection also drops it from the smoothing list', async () => {
    const store = await setup(TWO_INCOME_CATEGORIES, { smoothedBonusCategoryIds: [2] });

    await store.toggleIncomeCategory(2);

    expect(appSettingsRepository.setSmoothedBonusCategoryIds).toHaveBeenCalledExactlyOnceWith([]);
    expect([...store.smoothedBonusCategoryIds()]).toEqual([]);
    expect([...store.selectedIncomeCategoryIds()]).toEqual([1]);
  });

  it('leaves the smoothing list alone when the deselected category was never marked', async () => {
    const store = await setup(TWO_INCOME_CATEGORIES, { smoothedBonusCategoryIds: [1] });

    await store.toggleIncomeCategory(2);

    expect(appSettingsRepository.setSmoothedBonusCategoryIds).not.toHaveBeenCalled();
    expect([...store.smoothedBonusCategoryIds()]).toEqual([1]);
  });

  it('re-selecting a category does not re-mark it for smoothing', async () => {
    const store = await setup(TWO_INCOME_CATEGORIES, { excludedIncomeCategoryIds: [2] });

    await store.toggleIncomeCategory(2);

    expect(appSettingsRepository.setSmoothedBonusCategoryIds).not.toHaveBeenCalled();
    expect([...store.smoothedBonusCategoryIds()]).toEqual([]);
  });
});

describe('IncomeStore: incomeTrend composes both smoothing passes (TICKET-INC-13)', () => {
  const CATEGORIES = [category(1, 'Salary', 'income'), category(2, 'Holiday bonus', 'income')];
  const ACCOUNTS = [account(1, '2025-01-01')];

  /** 1,000/month of salary through 2025, plus a separate 1,200 bonus deposit in March. */
  const TRANSACTIONS: Transaction[] = [
    ...Array.from({ length: 12 }, (_, index) =>
      transaction(index + 1, 1, `2025-${String(index + 1).padStart(2, '0')}-25`, { amount: 1000 }),
    ),
    transaction(20, 1, '2025-03-20', { amount: 1200, categoryId: 2 }),
  ];

  const sumOf = (store: InstanceType<typeof IncomeStore>, seriesIndex: number): number =>
    store.incomeTrend().series[seriesIndex].values.reduce((total, value) => total + value, 0);

  const monthIndex = (store: InstanceType<typeof IncomeStore>, bucketKey: string): number =>
    store.incomeTrend().bucketKeys.indexOf(bucketKey);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(restoreFormatSettings);

  it('spreads a recorded embedded bonus across its year on incomeTrend', async () => {
    const store = await setup(CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
      salaryMetadata: [{ yearMonth: '2025-07', grossWage: 1800, bonus: 600 }],
    });

    const july = monthIndex(store, '2025-07');
    const august = monthIndex(store, '2025-08');
    const salary = store.incomeTrend().series[0];

    // July's 1,000 loses the 600 it declared, then every month of 2025 gets 600/12 back.
    expect(salary.values[july]).toBeCloseTo(400 + 50);
    expect(salary.values[august]).toBeCloseTo(1000 + 50);
  });

  it("preserves the year's total when a flagged category and an embedded bonus both apply", async () => {
    const store = await setup(CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
      smoothedBonusCategoryIds: [2],
      salaryMetadata: [{ yearMonth: '2025-07', grossWage: 1800, bonus: 600 }],
    });

    // 12 × 1,000 salary + one 1,200 bonus deposit — both passes only reshape, never add or remove,
    // and each series keeps its own annual total too.
    expect(sumOf(store, 0) + sumOf(store, 1)).toBeCloseTo(13_200);
    expect(sumOf(store, 0)).toBeCloseTo(12_000);
    expect(sumOf(store, 1)).toBeCloseTo(1200);

    // Both passes genuinely fired: March's 1,200 spike is gone (FR-INC-4), and July's declared 600
    // is off the salary line (TICKET-INC-13) — the second pass reads what the first one left, so it
    // takes its pro-rata share from the already-flattened bonus category too.
    const march = monthIndex(store, '2025-03');
    const july = monthIndex(store, '2025-07');
    expect(store.incomeTrend().series[1].values[march]).toBeLessThan(200);
    expect(store.incomeTrend().series[0].values[july]).toBeLessThan(1000);
  });

  it('leaves rawIncomeTrend showing the real deposit in its real month', async () => {
    const store = await setup(CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
      salaryMetadata: [{ yearMonth: '2025-07', grossWage: 1800, bonus: 600 }],
    });

    const raw = store.rawIncomeTrend();
    const july = raw.bucketKeys.indexOf('2025-07');

    expect(raw.series[0].values[july]).toBe(1000);
  });

  it('leaves incomeTrend untouched when no bonus is recorded at all', async () => {
    const store = await setup(CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
    });

    expect(store.incomeTrend()).toBe(store.rawIncomeTrend());
  });
});

describe('IncomeStore: incomeRange (FR-INC-12, TICKET-INC-12)', () => {
  const INCOME_CATEGORIES = [category(1, 'Salary', 'income')];
  const ACCOUNTS = [account(1, '2019-03-14')];
  const TRANSACTIONS = [transaction(1, 1, '2019-04-01'), transaction(2, 1, '2026-07-20')];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(restoreFormatSettings);

  it('is the full history range untouched while no career start date is set', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
    });

    expect(store.incomeRange()).toEqual(store.fullHistoryRange());
    expect(store.incomeRange().from).toBe('2019-03-14');
  });

  it('starts at the career start date when it falls after the first transaction', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
      careerStartDate: '2022-06-01',
    });

    expect(store.incomeRange().from).toBe('2022-06-01');
    expect(store.incomeRange().to).toBe(store.fullHistoryRange().to);
  });

  it('leaves the range alone when the career start date is before the first transaction — it narrows, never invents history', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
      careerStartDate: '2015-01-01',
    });

    expect(store.incomeRange()).toEqual(store.fullHistoryRange());
  });

  it('re-clamps as soon as the date is set, without a reload', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
    });

    await store.setCareerStartDate('2023-01-01');

    expect(appSettingsRepository.setCareerStartDate).toHaveBeenCalledExactlyOnceWith('2023-01-01');
    expect(store.incomeRange().from).toBe('2023-01-01');
  });

  it('restores the full span when the date is cleared', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
      careerStartDate: '2023-01-01',
    });

    await store.setCareerStartDate(undefined);

    expect(appSettingsRepository.setCareerStartDate).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(store.incomeRange()).toEqual(store.fullHistoryRange());
  });
});

describe('IncomeStore: rejectCareerStartDate (FR-INC-12, TICKET-INC-12)', () => {
  const INCOME_CATEGORIES = [category(1, 'Salary', 'income')];
  const ACCOUNTS = [account(1, '2019-03-14')];

  /** One day past whatever "today" is when the suite runs — the store reads the real clock. */
  const dayAfter = (isoDate: string): string => {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(restoreFormatSettings);

  it('rejects a date in the future', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: [transaction(1, 1, '2019-04-01')],
    });

    const tomorrow = dayAfter(store.fullHistoryRange().to);

    expect(store.rejectCareerStartDate(tomorrow)).not.toBeNull();
  });

  it('rejects a past date that sits after the most recent transaction', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: [transaction(1, 1, '2019-04-01'), transaction(2, 1, '2020-05-05')],
    });

    expect(store.rejectCareerStartDate('2021-01-01')).toMatch(/most recent transaction/);
  });

  it('accepts a date inside the history', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: ACCOUNTS,
      transactions: [transaction(1, 1, '2019-04-01'), transaction(2, 1, '2020-05-05')],
    });

    expect(store.rejectCareerStartDate('2020-01-01')).toBeNull();
  });
});

describe('IncomeStore: latestTransactionDate (FR-INC-12, TICKET-INC-12)', () => {
  const INCOME_CATEGORIES = [category(1, 'Salary', 'income')];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(restoreFormatSettings);

  it('reads the last transaction from active accounts only', async () => {
    const store = await setup(INCOME_CATEGORIES, {
      accounts: [account(1, '2019-03-14'), { ...account(2, '2019-03-14'), archived: true }],
      transactions: [transaction(1, 1, '2020-05-05'), transaction(2, 2, '2024-09-09')],
    });

    expect(store.latestTransactionDate()).toBe('2020-05-05');
  });

  it('is undefined for a user with no transactions yet', async () => {
    const store = await setup(INCOME_CATEGORIES, { accounts: [account(1, '2019-03-14')] });

    expect(store.latestTransactionDate()).toBeUndefined();
  });
});
