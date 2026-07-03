import { computed, inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
import { withArchivable } from '@/shared/utils';

const categoryConfig = entityConfig({
  entity: type<Category>(),
  selectId: (category) => category.id!,
});

export const CategoriesStore = signalStore(
  { providedIn: 'root' },
  withEntities(categoryConfig),
  withArchivable<Category>(),
  withComputed(({ entities, activeEntities, archivedEntities }) => {
    const transactionsStore = inject(TransactionsStore);

    return {
      categories: entities,
      activeCategories: activeEntities,
      archivedCategories: archivedEntities,
      categoriesById: computed(
        () => new Map(entities().map((category) => [category.id!, category])),
      ),
      transactionCountById: computed(() => {
        const counts = new Map<number, number>();
        for (const transaction of transactionsStore.transactions()) {
          if (transaction.categoryId == null) continue;
          counts.set(transaction.categoryId, (counts.get(transaction.categoryId) ?? 0) + 1);
        }
        return counts;
      }),
    };
  }),
  withMethods((store) => {
    const categoriesRepository = inject(CategoriesRepository);
    const transactionsStore = inject(TransactionsStore);

    return {
      hydrate: async (): Promise<void> => {
        patchState(store, setAllEntities(await categoriesRepository.getAll(), categoryConfig));
      },

      addCategory: async (category: Category): Promise<void> => {
        const id = await categoriesRepository.add(category);
        const added: Category = { ...category, id };
        patchState(store, addEntity(added, categoryConfig));
      },

      updateCategory: async (id: number, changes: Partial<Category>): Promise<void> => {
        await categoriesRepository.update(id, changes);
        patchState(store, updateEntity({ id, changes }, categoryConfig));
      },

      /** Clears the category off any transaction that referenced it before deleting, so nothing points at a dangling id. */
      removeCategory: async (id: number): Promise<void> => {
        const affectedIds = transactionsStore
          .transactions()
          .filter((transaction) => transaction.categoryId === id)
          .map((transaction) => transaction.id!);

        await Promise.all(
          affectedIds.map((transactionId) =>
            transactionsStore.updateTransaction(transactionId, {
              categoryId: undefined,
              categoryManual: false,
            }),
          ),
        );

        await categoriesRepository.remove(id);
        patchState(store, removeEntity(id));
      },
    };
  }),
  withMethods((store) => ({
    archiveCategory: (id: number): Promise<void> => store.updateCategory(id, { archived: true }),
    unarchiveCategory: (id: number): Promise<void> => store.updateCategory(id, { archived: false }),
  })),
);
