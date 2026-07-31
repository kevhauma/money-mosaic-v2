import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods } from '@ngrx/signals';
import { computeFullHistoryRange } from '@/core/stats';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * State for the `/income` page (FR-INC-1, TICKET-INC-01).
 *
 * Mostly derived: every income figure v1.6 shows is a reading of `Transaction`/`Category` data the
 * entity stores in `@/core/state` already own (TICKET-SOLID-05 moved them there). Its one piece of
 * genuine state — which income categories count toward "my income growth" (FR-INC-3,
 * TICKET-INC-03) — is persisted on the `appSettings` singleton rather than held here, so it
 * survives a reload; this store only projects it into the selected-id set the page's aggregates
 * take. The gross-wage entries (INC-10, through their own repository) are still to come.
 */
export const IncomeStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const accountsStore = inject(AccountsStore);
    const categoriesStore = inject(CategoriesStore);
    const transactionsStore = inject(TransactionsStore);
    const appSettingsStore = inject(AppSettingsStore);

    /**
     * The income categories the rest of the page reasons about — the shared read every later
     * FR-INC ticket builds on. Archived categories are excluded (`activeCategories`), so a
     * category the user retired stops contributing to the income view the same way it already
     * stops contributing everywhere else.
     */
    const incomeCategories = computed(() =>
      categoriesStore.activeCategories().filter((category) => category.kind === 'income'),
    );

    return {
      incomeCategories,

      /**
       * The span every chart on the page covers: earliest account/transaction date through today,
       * across all active accounts. Page-level rather than per-panel because the Income page is
       * deliberately topbar-range-independent (see `IncomeOverviewComponent`'s class doc and
       * FR-INC-6) — one growth story, one span, so the monthly and yearly views can't disagree
       * about where history starts.
       */
      fullHistoryRange: computed(() =>
        computeFullHistoryRange(
          accountsStore.activeAccounts(),
          transactionsStore.transactions(),
          todayIso(),
        ),
      ),

      /**
       * The income categories that count toward growth (FR-INC-3) — every active income category
       * minus the user's persisted exclusions. Derived subtractively (rather than reading a stored
       * selection) so a newly created income category is selected by default and an archived one
       * drops out, both without any sync effect.
       */
      selectedIncomeCategoryIds: computed(() => {
        const excluded = new Set(appSettingsStore.excludedIncomeCategoryIds() ?? []);
        return new Set(
          incomeCategories()
            .map((category) => category.id!)
            .filter((id) => !excluded.has(id)),
        );
      }),
    };
  }),
  withMethods((store) => {
    const appSettingsStore = inject(AppSettingsStore);

    return {
      /**
       * Flips one income category's membership of the growth selection. Writes the *exclusion*
       * list back through `AppSettingsStore` (which persists it), keeping ids for categories that
       * aren't currently active — archiving and un-archiving a deselected category shouldn't
       * silently re-select it.
       */
      toggleIncomeCategory: (categoryId: number): Promise<void> => {
        const excluded = new Set(appSettingsStore.excludedIncomeCategoryIds() ?? []);
        if (store.selectedIncomeCategoryIds().has(categoryId)) excluded.add(categoryId);
        else excluded.delete(categoryId);
        return appSettingsStore.setExcludedIncomeCategoryIds([...excluded]);
      },
    };
  }),
);
