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
import { createHydration, registerStoreReset, withHydrationState } from '@/core/store-reset';

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
  withHydrationState(),
  withMethods((store) => {
    const categoriesRepository = inject(CategoriesRepository);
    const transactionsStore = inject(TransactionsStore);

    /**
     * `hydrate` is idempotent and triggered on first injection (`withHooks` below,
     * TICKET-PERF-07); `retry` re-reads after a failed load and `reset` empties the store when the
     * signed-in user changes (TICKET-SRV-06, TICKET-AUTH-02).
     */
    const { hydrate, retry, reset } = createHydration(store, () =>
      categoriesRepository.getAll().then((categories) => {
        patchState(store, setAllEntities(categories, categoryConfig), { hydrated: true });
      }),
    );

    return {
      reset,
      hydrate,
      retry,

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
       * Deletes on the server **first** (TICKET-CAT-12): the server refuses while a loan or rule
       * targets the category, and otherwise clears it off its transactions in the same transaction.
       * Only once it has said yes does local state follow — the category goes, and the affected
       * transactions are patched in memory with no second request. A refusal rejects with the
       * server's message and leaves both stores untouched. Awaits `TransactionsStore`'s hydration
       * (idempotent) so the affected-ids scan never runs against an empty map (TICKET-PERF-05).
       */
      removeCategory: async (id: number): Promise<void> => {
        await categoriesRepository.remove(id);
        await transactionsStore.hydrate();
        const changes = { categoryId: undefined, categoryManual: false };
        transactionsStore.patchMany(
          transactionsStore
            .transactions()
            .filter((transaction) => transaction.categoryId === id)
            .map((transaction) => ({ id: transaction.id!, changes })),
        );
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
      // Registers this store for the sign-out wipe (TICKET-AUTH-02), before hydration starts.
      registerStoreReset('CategoriesStore', store.reset, store.hydrate);

      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `categories()` synchronously can still `await store.hydrate()` as a guard.
      // `.catch` because nothing awaits this: the failure is already on the store's `error` for the
      // page to render, and un-caught it would be an unhandled rejection too (TICKET-SRV-06).
      void store.hydrate().catch(() => undefined);
    },
  }),
);
