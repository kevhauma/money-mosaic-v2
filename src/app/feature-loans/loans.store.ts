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
import { LoansRepository, type Loan } from '@/core/data-access';
import { sortedBySortOrder, withArchivable } from '@/shared/utils';

const loanConfig = entityConfig({
  entity: type<Loan>(),
  selectId: (loan) => loan.id!,
});

/**
 * Every tracked loan (TICKET-LOAN-02, FR-LOAN-2) — a mortgage, a car loan, a personal loan, or
 * anything else amortized on a fixed principal/rate/term. `CategoriesStore`'s shape: entities +
 * `withArchivable`, sorted by manual `sortOrder` for display, same as `Account`/`Category`.
 */
export const LoansStore = signalStore(
  { providedIn: 'root' },
  withEntities(loanConfig),
  withArchivable<Loan>(),
  withComputed(({ entities, activeEntities, archivedEntities }) => ({
    loans: sortedBySortOrder(entities),
    activeLoans: sortedBySortOrder(activeEntities),
    archivedLoans: archivedEntities,
  })),
  withState({ hydrated: false }),
  withMethods((store) => {
    const loansRepository = inject(LoansRepository);
    let hydration: Promise<void> | null = null;

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = loansRepository.getAll().then((loans) => {
          patchState(store, setAllEntities(loans, loanConfig), { hydrated: true });
        });
      }
      return hydration;
    };

    return {
      hydrate,

      /** Appends the loan to the end of the display order, same convention as `GoalsStore.addGoal`. */
      addLoan: async (loan: Loan): Promise<Loan> => {
        const highest = store
          .loans()
          .reduce((max, existing) => Math.max(max, existing.sortOrder), -1);
        const positioned: Loan = { ...loan, sortOrder: highest + 1 };
        const id = await loansRepository.add(positioned);
        const added: Loan = { ...positioned, id };
        patchState(store, addEntity(added, loanConfig));
        return added;
      },

      updateLoan: async (id: number, changes: Partial<Loan>): Promise<void> => {
        await loansRepository.update(id, changes);
        patchState(store, updateEntity({ id, changes }, loanConfig));
      },

      removeLoan: async (id: number): Promise<void> => {
        await loansRepository.remove(id);
        patchState(store, removeEntity(id));
      },
    };
  }),
  withMethods((store) => ({
    archiveLoan: (id: number): Promise<void> => store.updateLoan(id, { archived: true }),
    unarchiveLoan: (id: number): Promise<void> => store.updateLoan(id, { archived: false }),
  })),
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment anything first injects this store — the
      // `/loans` page container, in practice (TICKET-PERF-07). Idempotent, so flows that read
      // `loans()` synchronously can still `await store.hydrate()` as a guard.
      void store.hydrate();
    },
  }),
);
