import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods } from '@ngrx/signals';
import { computeFullHistoryRange } from '@/core/stats';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import {
  clampRangeToCareerStart,
  validateCareerStartDate,
  type CareerStartDateRejection,
} from './career-start-date';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * State for the `/income` page (FR-INC-1, TICKET-INC-01).
 *
 * Mostly derived: every income figure v1.6 shows is a reading of `Transaction`/`Category` data the
 * entity stores in `@/core/state` already own (TICKET-SOLID-05 moved them there). Its genuine
 * state — which income categories count toward "my income growth" (FR-INC-3, TICKET-INC-03), which
 * of those are an annual lump sum to smooth out (FR-INC-4, TICKET-INC-04), and where the user's
 * career started (FR-INC-12, TICKET-INC-12) — is persisted on the `appSettings` singleton rather
 * than held here, so it survives a reload; this store only projects it into the id sets and the
 * clamped span the page's aggregates take. The gross-wage entries (INC-10, through their own
 * repository) are still to come.
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

    /**
     * The span the user's data covers: earliest account/transaction date through today, across all
     * active accounts. Page-level rather than per-panel because the Income page is deliberately
     * topbar-range-independent (see `IncomeOverviewComponent`'s class doc and FR-INC-6) — one
     * growth story, one span, so the monthly and yearly views can't disagree about where history
     * starts. Panels read `incomeRange` below, not this: this is the *data's* span, that one is
     * the span the user says their career covers.
     */
    const fullHistoryRange = computed(() =>
      computeFullHistoryRange(
        accountsStore.activeAccounts(),
        transactionsStore.transactions(),
        todayIso(),
      ),
    );

    /**
     * The most recent booking date across active accounts, or `undefined` for a user with no
     * transactions — the upper bound a career start date is validated against (FR-INC-12): a date
     * past it is a real date, but leaves the page with nothing to render.
     */
    const latestTransactionDate = computed(() => {
      const activeAccountIds = new Set(accountsStore.activeAccounts().map((account) => account.id));
      const bookingDates = transactionsStore
        .transactions()
        .filter((transaction) => activeAccountIds.has(transaction.accountId))
        .map((transaction) => transaction.bookingDate);
      // ISO dates compare as strings, so `reduce` over them needs no parsing.
      return bookingDates.reduce<string | undefined>(
        (latest, date) => (latest === undefined || date > latest ? date : latest),
        undefined,
      );
    });

    return {
      incomeCategories,
      fullHistoryRange,
      latestTransactionDate,

      /** The user's career start date (FR-INC-12), or `undefined` while unset. */
      careerStartDate: computed(() => appSettingsStore.careerStartDate()),

      /**
       * The span every panel on `/income` actually covers (FR-INC-12): the data's full history,
       * clamped to start where the user says their working life did. Unset — the default — leaves
       * it identical to `fullHistoryRange`, so nothing changes for anyone who never sets a date.
       */
      incomeRange: computed(() =>
        clampRangeToCareerStart(fullHistoryRange(), appSettingsStore.careerStartDate()),
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

      /**
       * The income categories the user has marked as an annual lump sum (FR-INC-4) — an
       * *inclusion* list, unlike the exclusion list above: smoothing is opt-in per category, so an
       * unset field means nothing is smoothed. `toggleIncomeCategory` prunes this list when a
       * category leaves the growth selection, so an id in here is always one the settings popup
       * still shows.
       */
      smoothedBonusCategoryIds: computed(
        () => new Set(appSettingsStore.smoothedBonusCategoryIds() ?? []),
      ),
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
       *
       * Deselecting also drops the category from the smoothing list (FR-INC-4): the settings popup
       * only offers smoothing for categories that count toward income, so a lingering id would be a
       * setting the user can no longer see, let alone turn off.
       */
      toggleIncomeCategory: async (categoryId: number): Promise<void> => {
        const excluded = new Set(appSettingsStore.excludedIncomeCategoryIds() ?? []);
        const deselecting = store.selectedIncomeCategoryIds().has(categoryId);
        if (deselecting) excluded.add(categoryId);
        else excluded.delete(categoryId);

        if (deselecting && store.smoothedBonusCategoryIds().has(categoryId)) {
          const smoothed = new Set(store.smoothedBonusCategoryIds());
          smoothed.delete(categoryId);
          await appSettingsStore.setSmoothedBonusCategoryIds([...smoothed]);
        }
        await appSettingsStore.setExcludedIncomeCategoryIds([...excluded]);
      },

      /** Flips one income category's annual-lump-sum smoothing (FR-INC-4), persisting the inclusion list. */
      toggleSmoothedBonusCategory: (categoryId: number): Promise<void> => {
        const smoothed = new Set(store.smoothedBonusCategoryIds());
        if (smoothed.has(categoryId)) smoothed.delete(categoryId);
        else smoothed.add(categoryId);
        return appSettingsStore.setSmoothedBonusCategoryIds([...smoothed]);
      },

      /**
       * Why the given date can't be a career start date, or `null` when it can (FR-INC-12). Lives
       * here rather than on the control so the bounds it checks — today, and the last transaction —
       * come from the same signals the page's range does. `fullHistoryRange().to` *is* today by
       * construction (see `computeFullHistoryRange`), so there's no second clock to disagree with.
       */
      rejectCareerStartDate: (value: string): CareerStartDateRejection =>
        validateCareerStartDate(value, store.fullHistoryRange().to, store.latestTransactionDate()),

      /** Persists the career start date, or clears it when given `undefined`. */
      setCareerStartDate: (careerStartDate: string | undefined): Promise<void> =>
        appSettingsStore.setCareerStartDate(careerStartDate),
    };
  }),
);
