import { inject } from '@angular/core';
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
import { GoalsRepository, type SavingsGoal } from '@/core/data-access';
import { computeReorderUpdates, sortedBySortOrder, withArchivable } from '@/shared/utils';

const goalConfig = entityConfig({
  entity: type<SavingsGoal>(),
  selectId: (goal) => goal.id!,
});

/**
 * The user's savings goals in **funding order** (TICKET-FUT-02, FR-FUT-2) — `CategoriesStore`'s
 * shape, but the order here is load-bearing rather than cosmetic: goals are paid for top-down, so
 * moving one up pushes every goal below it further out (TICKET-FUT-05).
 */
export const GoalsStore = signalStore(
  { providedIn: 'root' },
  withEntities(goalConfig),
  withArchivable<SavingsGoal>(),
  withComputed(({ entities, activeEntities, archivedEntities }) => ({
    goals: sortedBySortOrder(entities),
    activeGoals: sortedBySortOrder(activeEntities),
    archivedGoals: archivedEntities,
  })),
  withState({ hydrated: false }),
  withMethods((store) => {
    const goalsRepository = inject(GoalsRepository);
    let hydration: Promise<void> | null = null;

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = goalsRepository.getAll().then((goals) => {
          patchState(store, setAllEntities(goals, goalConfig), { hydrated: true });
        });
      }
      return hydration;
    };

    /** One bulk write, then one patch per moved row — shared by both reorder paths. */
    const applyOrder = async (updates: { id: number; sortOrder: number }[]): Promise<void> => {
      if (updates.length === 0) return;
      await goalsRepository.bulkUpdateSortOrder(updates);
      for (const update of updates) {
        patchState(
          store,
          updateEntity({ id: update.id, changes: { sortOrder: update.sortOrder } }, goalConfig),
        );
      }
    };

    return {
      hydrate,

      /**
       * Appends the goal to the end of the queue: a new want does not get to jump ahead of the
       * ones already being saved for, so it takes the next `sortOrder` rather than `undefined`.
       */
      addGoal: async (goal: SavingsGoal): Promise<SavingsGoal> => {
        const highest = store
          .goals()
          .reduce((max, existing) => Math.max(max, existing.sortOrder ?? -1), -1);
        const positioned: SavingsGoal = { ...goal, sortOrder: highest + 1 };
        const id = await goalsRepository.add(positioned);
        const added: SavingsGoal = { ...positioned, id };
        patchState(store, addEntity(added, goalConfig));
        return added;
      },

      updateGoal: async (id: number, changes: Partial<SavingsGoal>): Promise<void> => {
        await goalsRepository.update(id, changes);
        patchState(store, updateEntity({ id, changes }, goalConfig));
      },

      removeGoal: async (id: number): Promise<void> => {
        await goalsRepository.remove(id);
        patchState(store, removeEntity(id));
      },

      /** Moves a goal one slot up/down the funding queue, persisted as one bulk `sortOrder` write. */
      reorder: async (id: number, direction: 'up' | 'down'): Promise<void> => {
        const updates = computeReorderUpdates(store.goals(), id, direction);
        await applyOrder(updates);
      },

      /**
       * Rewrites the whole queue from an explicit id order — what a drag produces, since dropping a
       * goal three slots down is not expressible as a neighbour swap (TICKET-FUT-04). Renumbers
       * from 0 so the stored order can't drift into ties.
       */
      setGoalOrder: async (orderedIds: number[]): Promise<void> => {
        await applyOrder(orderedIds.map((id, index) => ({ id, sortOrder: index })));
      },
    };
  }),
  withMethods((store) => ({
    archiveGoal: (id: number): Promise<void> => store.updateGoal(id, { archived: true }),
    unarchiveGoal: (id: number): Promise<void> => store.updateGoal(id, { archived: false }),
  })),
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read `goals()`
      // synchronously can still `await store.hydrate()` as a guard.
      void store.hydrate();
    },
  }),
);
