import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AppSettingsRepository,
  CategoriesRepository,
  type AppSettings,
  type Category,
} from '@/core/data-access';
import { AppSettingsStore, CategoriesStore } from '@/core/state';
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

const categoriesRepository = { getAll: vi.fn(), add: vi.fn() };
const appSettingsRepository = {
  get: vi.fn(),
  setExcludedIncomeCategoryIds: vi.fn(),
};

/** Seeds both collaborator repositories, then awaits the (idempotent) hydrations so the derived
 * lists are readable synchronously in the assertions. */
const setup = async (
  categories: Category[],
  excludedIncomeCategoryIds?: number[],
): Promise<InstanceType<typeof IncomeStore>> => {
  categoriesRepository.getAll.mockResolvedValue(categories);
  appSettingsRepository.get.mockResolvedValue({ id: 1, excludedIncomeCategoryIds } as AppSettings);
  appSettingsRepository.setExcludedIncomeCategoryIds.mockResolvedValue(1);
  TestBed.configureTestingModule({
    providers: [
      { provide: CategoriesRepository, useValue: categoriesRepository },
      { provide: AppSettingsRepository, useValue: appSettingsRepository },
    ],
  });

  const store = TestBed.inject(IncomeStore);
  await TestBed.inject(CategoriesStore).hydrate();
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
      [2],
    );

    expect([...store.selectedIncomeCategoryIds()]).toEqual([1]);
  });

  it('defaults a newly added income category to selected without any extra action', async () => {
    const store = await setup(
      [category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')],
      [2],
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
      [2],
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
      [2],
    );

    await store.toggleIncomeCategory(3);

    expect(appSettingsRepository.setExcludedIncomeCategoryIds).toHaveBeenCalledExactlyOnceWith([
      2, 3,
    ]);
  });
});
