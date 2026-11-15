import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  CategoriesRepository,
  TransactionsRepository,
  type Category,
  type Transaction,
} from '@/core/data-access';
import { TransactionsStore } from './transactions.store';
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

describe('CategoriesStore: removeCategory deletes on the server before touching local state (TICKET-CAT-12)', () => {
  const categoriesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    bulkUpdate: vi.fn().mockResolvedValue(2),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
    transactionsRepository.getAll.mockResolvedValue([
      transaction({ id: 1, categoryId: 7, categoryManual: true }),
      transaction({ id: 2, categoryId: 7, categoryManual: false }),
      transaction({ id: 3, categoryId: 8, categoryManual: true }),
    ]);
    categoriesRepository.getAll.mockResolvedValue([category({ id: 7 }), category({ id: 8 })]);
  });

  it('on success, clears the category off its transactions in memory with no request of its own — even when TransactionsStore has not hydrated yet (TICKET-PERF-05)', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    expect(transactionsStore.hydrated()).toBe(false);
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();

    await categoriesStore.removeCategory(7);

    // The server clears the transactions in the same transaction as the delete.
    expect(categoriesRepository.remove).toHaveBeenCalledWith(7);
    expect(transactionsRepository.bulkUpdate).not.toHaveBeenCalled();
    expect(transactionsRepository.update).not.toHaveBeenCalled();

    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(1)).toMatchObject({ categoryId: undefined, categoryManual: false });
    expect(byId.get(2)).toMatchObject({ categoryId: undefined, categoryManual: false });
    expect(byId.get(3)).toMatchObject({ categoryId: 8, categoryManual: true });
    expect(categoriesStore.categories().map((c) => c.id)).toEqual([8]);
  });

  it('on a refusal, rejects with the server message and changes nothing', async () => {
    categoriesRepository.remove.mockRejectedValueOnce(
      new Error('This category cannot be deleted while the rule "Delhaize" assigns it.'),
    );
    const transactionsStore = TestBed.inject(TransactionsStore);
    await transactionsStore.hydrate();
    const categoriesStore = TestBed.inject(CategoriesStore);
    await categoriesStore.hydrate();
    const before = transactionsStore.transactions();

    await expect(categoriesStore.removeCategory(7)).rejects.toThrow('"Delhaize"');

    expect(transactionsRepository.bulkUpdate).not.toHaveBeenCalled();
    expect(transactionsStore.transactions()).toEqual(before);
    expect(categoriesStore.categories().map((c) => c.id)).toEqual([7, 8]);
  });
});

describe('CategoriesStore: applicability window (TICKET-CAT-10)', () => {
  const categoriesRepository = {
    getAll: vi.fn().mockResolvedValue([category({ id: 1, name: 'Rent' })]),
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

  it('persists a window through the repository, not by calling the API directly', async () => {
    const store = TestBed.inject(CategoriesStore);
    await store.hydrate();

    await store.updateCategory(1, { activeFrom: '2020-01-01', activeUntil: '2023-06-30' });

    expect(categoriesRepository.update).toHaveBeenCalledWith(1, {
      activeFrom: '2020-01-01',
      activeUntil: '2023-06-30',
    });
    expect(store.categories()[0]).toMatchObject({
      activeFrom: '2020-01-01',
      activeUntil: '2023-06-30',
    });
  });

  it('leaves the window untouched across an archive/unarchive round trip', async () => {
    const store = TestBed.inject(CategoriesStore);
    await store.hydrate();
    await store.updateCategory(1, { activeFrom: '2020-01-01', activeUntil: '2023-06-30' });

    await store.archiveCategory(1);
    await store.unarchiveCategory(1);

    // Ended and archived are independent axes — neither operation may imply the other.
    expect(store.categories()[0]).toMatchObject({
      archived: false,
      activeFrom: '2020-01-01',
      activeUntil: '2023-06-30',
    });
  });

  it('clears a bound when it is set back to undefined', async () => {
    const store = TestBed.inject(CategoriesStore);
    await store.hydrate();
    await store.updateCategory(1, { activeUntil: '2023-06-30' });

    await store.updateCategory(1, { activeUntil: undefined });

    expect(store.categories()[0].activeUntil).toBeUndefined();
  });
});
