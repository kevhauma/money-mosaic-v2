import { Injectable, computed, inject, signal } from '@angular/core';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';

@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly categoriesRepository = inject(CategoriesRepository);
  private readonly transactionsStore = inject(TransactionsStore);

  private readonly categoriesSignal = signal<Category[]>([]);
  readonly categories = this.categoriesSignal.asReadonly();

  readonly activeCategories = computed(() =>
    this.categoriesSignal().filter((category) => !category.archived),
  );

  readonly archivedCategories = computed(() =>
    this.categoriesSignal().filter((category) => category.archived),
  );

  readonly categoriesById = computed(
    () => new Map(this.categoriesSignal().map((category) => [category.id!, category])),
  );

  readonly transactionCountById = computed(() => {
    const counts = new Map<number, number>();
    for (const transaction of this.transactionsStore.transactions()) {
      if (transaction.categoryId == null) continue;
      counts.set(transaction.categoryId, (counts.get(transaction.categoryId) ?? 0) + 1);
    }
    return counts;
  });

  hydrate = async (): Promise<void> => {
    this.categoriesSignal.set(await this.categoriesRepository.getAll());
  };

  addCategory = async (category: Category): Promise<void> => {
    const id = await this.categoriesRepository.add(category);
    this.categoriesSignal.update((categories) => [...categories, { ...category, id }]);
  };

  updateCategory = async (id: number, changes: Partial<Category>): Promise<void> => {
    await this.categoriesRepository.update(id, changes);
    this.categoriesSignal.update((categories) =>
      categories.map((category) => (category.id === id ? { ...category, ...changes } : category)),
    );
  };

  archiveCategory = (id: number): Promise<void> => this.updateCategory(id, { archived: true });

  unarchiveCategory = (id: number): Promise<void> => this.updateCategory(id, { archived: false });

  /** Clears the category off any transaction that referenced it before deleting, so nothing points at a dangling id. */
  removeCategory = async (id: number): Promise<void> => {
    const affectedIds = this.transactionsStore
      .transactions()
      .filter((transaction) => transaction.categoryId === id)
      .map((transaction) => transaction.id!);

    await Promise.all(
      affectedIds.map((transactionId) =>
        this.transactionsStore.updateTransaction(transactionId, {
          categoryId: undefined,
          categoryManual: false,
        }),
      ),
    );

    await this.categoriesRepository.remove(id);
    this.categoriesSignal.update((categories) =>
      categories.filter((category) => category.id !== id),
    );
  };
}
