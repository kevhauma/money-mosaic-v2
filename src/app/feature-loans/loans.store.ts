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
import { LoansRepository, type Loan } from '@/core/data-access';
import { computeLoanProgress, type LoanProgress } from '@/core/loans';
import { TransactionsStore } from '@/core/state';
import { sortedBySortOrder, withArchivable } from '@/shared/utils';

const loanConfig = entityConfig({
  entity: type<Loan>(),
  selectId: (loan) => loan.id!,
});

/**
 * Every tracked loan (TICKET-LOAN-02, FR-LOAN-2) — a mortgage, a car loan, a personal loan, or
 * anything else amortized on a fixed principal/rate/term. `CategoriesStore`'s shape: entities +
 * `withArchivable`, sorted by manual `sortOrder` for display, same as `Account`/`Category`.
 * `progressById` (TICKET-LOAN-06) adds each loan's real payoff position, derived from
 * `TransactionsStore` alongside it.
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
  withComputed((store) => {
    const transactionsStore = inject(TransactionsStore);

    return {
      /**
       * Every loan's real payoff position (TICKET-LOAN-06, FR-LOAN-6) — a plain `computed()`, so it
       * recomputes automatically whenever either `loans()` or `TransactionsStore.transactions()`
       * changes, with no manual subscription/effect wiring. Filtering transactions down to each
       * loan's own `categoryId` is this store's job, not `computeLoanProgress`'s (TICKET-LOAN-05's
       * Notes) — the function itself stays pure over an already-scoped payment list.
       */
      progressById: computed(() => {
        const transactions = transactionsStore.transactions();
        const map = new Map<number, LoanProgress>();
        for (const loan of store.loans()) {
          if (loan.id == null) continue;
          const payments = transactions.filter(
            (transaction) => transaction.categoryId === loan.categoryId,
          );
          map.set(loan.id, computeLoanProgress(loan, payments));
        }
        return map;
      }),
    };
  }),
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

      /**
       * Appends the loan to the end of the display order, same convention as `GoalsStore.addGoal`.
       * Takes `sortOrder` out of the caller's hands entirely (unlike `addGoal`, which accepts a full
       * `SavingsGoal` because `sortOrder` is optional there) — `Loan.sortOrder` is a required field,
       * and this method always overwrites whatever value it's given, so callers (the create form)
       * never need to invent a placeholder just to satisfy the type.
       */
      addLoan: async (loan: Omit<Loan, 'sortOrder'>): Promise<Loan> => {
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
