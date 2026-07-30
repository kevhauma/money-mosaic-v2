import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import { CategoriesStore } from '@/core/state';

/**
 * State for the `/income` page (FR-INC-1, TICKET-INC-01).
 *
 * Purely derived for now: it holds no state and touches no repository, because every income
 * figure v1.6 shows is a reading of `Transaction`/`Category` data the entity stores in
 * `@/core/state` already own (TICKET-SOLID-05 moved them there). Later FR-INC tickets add the
 * bits that genuinely are this feature's own state — the income-category selection (INC-03) and
 * the gross-wage entries (INC-10, through its own repository).
 */
// Genuinely unconsumed for now, not a false positive: TICKET-INC-01 is the page scaffold, and the
// first panel to inject this store lands in TICKET-INC-02. The suppression goes stale (and fallow
// reports it as such) the moment that panel imports it — delete this line then.
// fallow-ignore-next-line unused-export
export const IncomeStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const categoriesStore = inject(CategoriesStore);

    return {
      /**
       * The income categories the rest of the page reasons about — the shared read every later
       * FR-INC ticket builds on. Archived categories are excluded (`activeCategories`), so a
       * category the user retired stops contributing to the income view the same way it already
       * stops contributing everywhere else.
       */
      incomeCategories: computed(() =>
        categoriesStore.activeCategories().filter((category) => category.kind === 'income'),
      ),
    };
  }),
);
