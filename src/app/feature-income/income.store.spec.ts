import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { CategoriesStore } from '@/core/state';
import { IncomeStore } from './income.store';

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

describe('IncomeStore: incomeCategories', () => {
  const categoriesRepository = { getAll: vi.fn() };

  /** Seeds CategoriesStore's repository, then awaits its (idempotent) hydration so the derived
   * list is readable synchronously in the assertion. */
  const setup = async (categories: Category[]): Promise<InstanceType<typeof IncomeStore>> => {
    categoriesRepository.getAll.mockResolvedValue(categories);
    TestBed.configureTestingModule({
      providers: [{ provide: CategoriesRepository, useValue: categoriesRepository }],
    });

    const store = TestBed.inject(IncomeStore);
    await TestBed.inject(CategoriesStore).hydrate();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
