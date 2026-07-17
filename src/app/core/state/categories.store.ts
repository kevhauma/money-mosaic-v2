import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { TransactionsStore } from './transactions.store';
import { computeReorderUpdates, sortedBySortOrder, withArchivable } from '@/shared/utils';

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
      categories: sortedBySortOrder(entities),
      activeCategories: sortedBySortOrder(activeEntities),
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
  withState({ hydrated: false }),
  withMethods((store) => {
    const categoriesRepository = inject(CategoriesRepository);
    const transactionsStore = inject(TransactionsStore);
    let hydration: Promise<void> | null = null;

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = categoriesRepository.getAll().then((categories) => {
          patchState(store, setAllEntities(categories, categoryConfig), { hydrated: true });
        });
      }
      return hydration;
    };

    return {
      hydrate,

      addCategory: async (category: Category): Promise<Category> => {
        const id = await categoriesRepository.add(category);
        const added: Category = { ...category, id };
        patchState(store, addEntity(added, categoryConfig));
        return added;
      },

      updateCategory: async (id: number, changes: Partial<Category>): Promise<void> => {
        await categoriesRepository.update(id, changes);
        patchState(store, updateEntity({ id, changes }, categoryConfig));
      },

      /**
       * Clears the category off any transaction that referenced it before deleting, so nothing
       * points at a dangling id. Awaits `TransactionsStore`'s own hydration first (idempotent) so
       * the affected-ids scan below never runs against a not-yet-hydrated entity map
       * (TICKET-PERF-05).
       */
      removeCategory: async (id: number): Promise<void> => {
        await transactionsStore.hydrate();
        const affectedIds = transactionsStore
          .transactions()
          .filter((transaction) => transaction.categoryId === id)
          .map((transaction) => transaction.id!);

        await transactionsStore.bulkClearCategory(affectedIds);

        await categoriesRepository.remove(id);
        patchState(store, removeEntity(id));
      },
    };
  }),
  withMethods((store) => ({
    archiveCategory: (id: number): Promise<void> => store.updateCategory(id, { archived: true }),
    unarchiveCategory: (id: number): Promise<void> => store.updateCategory(id, { archived: false }),

    /** Moves a category earlier/later in display order by swapping its sortOrder with its neighbour (TICKET-CAT-03). */
    moveCategory: async (id: number, direction: 'up' | 'down'): Promise<void> => {
      const updates = computeReorderUpdates(store.categories(), id, direction);
      await Promise.all(
        updates.map((update) => store.updateCategory(update.id, { sortOrder: update.sortOrder })),
      );
    },
  })),
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `categories()` synchronously can still `await store.hydrate()` as a guard.
      void store.hydrate();
    },
  }),
);
