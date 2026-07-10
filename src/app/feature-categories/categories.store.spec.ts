import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  CategoriesRepository,
  TransactionsRepository,
  type Category,
  type Transaction,
} from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
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

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: -12,
  currency: 'EUR',
  rawDescription: 'Coffee',
  fingerprint: `fp-${overrides.id ?? 1}`,
  createdAt: '2026-06-01T00:00:00.000Z',
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

describe('CategoriesStore: manual category ordering (TICKET-CAT-03)', () => {
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

  it('sorts categories by sortOrder, with categories missing one falling after those that have it', async () => {
    categoriesRepository.getAll.mockResolvedValue([
      category({ id: 1, name: 'No order A' }),
      category({ id: 2, name: 'Second', sortOrder: 10 }),
      category({ id: 3, name: 'No order B' }),
      category({ id: 4, name: 'First', sortOrder: 0 }),
    ]);
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();

    expect(categoriesStore.categories().map((c) => c.id)).toEqual([4, 2, 1, 3]);
  });

  it('persists moveCategory as a sortOrder swap through the repository and reorders the computed list', async () => {
    categoriesRepository.getAll.mockResolvedValue([
      category({ id: 1, name: 'A', sortOrder: 0 }),
      category({ id: 2, name: 'B', sortOrder: 10 }),
      category({ id: 3, name: 'C', sortOrder: 20 }),
    ]);
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();

    await categoriesStore.moveCategory(3, 'up');

    expect(categoriesRepository.update).toHaveBeenCalledWith(3, { sortOrder: 10 });
    expect(categoriesRepository.update).toHaveBeenCalledWith(2, { sortOrder: 20 });
    expect(categoriesStore.categories().map((c) => c.id)).toEqual([1, 3, 2]);
  });

  it('does nothing when moving the last category down', async () => {
    categoriesRepository.getAll.mockResolvedValue([
      category({ id: 1, sortOrder: 0 }),
      category({ id: 2, sortOrder: 10 }),
    ]);
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();

    await categoriesStore.moveCategory(2, 'down');

    expect(categoriesRepository.update).not.toHaveBeenCalled();
  });
});

describe('CategoriesStore: removeCategory clears the category off referencing transactions before deleting it (TICKET-TEST-01)', () => {
  const categoriesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('clears categoryId and categoryManual on referencing transactions, persists via the repository, and leaves non-referencing rows untouched', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    transactionsStore.addMany([
      transaction({ id: 1, categoryId: 7, categoryManual: true }),
      transaction({ id: 2, categoryId: 7, categoryManual: false }),
      transaction({ id: 3, categoryId: 8, categoryManual: true }),
    ]);

    categoriesRepository.getAll.mockResolvedValue([category({ id: 7 }), category({ id: 8 })]);
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();

    await categoriesStore.removeCategory(7);

    expect(transactionsRepository.update).toHaveBeenCalledTimes(2);
    expect(transactionsRepository.update).toHaveBeenCalledWith(1, {
      categoryId: undefined,
      categoryManual: false,
    });
    expect(transactionsRepository.update).toHaveBeenCalledWith(2, {
      categoryId: undefined,
      categoryManual: false,
    });

    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(1)).toMatchObject({ categoryId: undefined, categoryManual: false });
    expect(byId.get(2)).toMatchObject({ categoryId: undefined, categoryManual: false });
    // Untouched — referenced a different category.
    expect(byId.get(3)).toMatchObject({ categoryId: 8, categoryManual: true });

    expect(categoriesRepository.remove).toHaveBeenCalledWith(7);
    expect(categoriesStore.categories().some((c) => c.id === 7)).toBe(false);
    expect(categoriesStore.categories().some((c) => c.id === 8)).toBe(true);
  });
});
