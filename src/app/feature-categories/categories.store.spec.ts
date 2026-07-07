import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoriesRepository, TransactionsRepository, type Category } from '@/core/data-access';
import { CategoriesStore } from './categories.store';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#ffffff',
  icon: 'cart',
  archived: false,
  isSystem: false,
  ...overrides,
});

describe('CategoriesStore: archive/unarchive round-trip (TICKET-NG-04)', () => {
  const categoriesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('persists archiveCategory through the repository and updates the active/archived filters', async () => {
    categoriesRepository.getAll.mockResolvedValue([category({ id: 1, archived: false })]);
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();

    await categoriesStore.archiveCategory(1);

    expect(categoriesRepository.update).toHaveBeenCalledWith(1, { archived: true });
    expect(categoriesStore.activeCategories()).toHaveLength(0);
    expect(categoriesStore.archivedCategories()).toHaveLength(1);
  });

  it('persists unarchiveCategory through the repository and updates the active/archived filters', async () => {
    categoriesRepository.getAll.mockResolvedValue([category({ id: 1, archived: true })]);
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();

    await categoriesStore.unarchiveCategory(1);

    expect(categoriesRepository.update).toHaveBeenCalledWith(1, { archived: false });
    expect(categoriesStore.activeCategories()).toHaveLength(1);
    expect(categoriesStore.archivedCategories()).toHaveLength(0);
  });
});
