import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { SalaryMetadataRepository, type SalaryMetadata } from '@/core/data-access';
import {
  computeFullHistoryRange,
  computeIncomeCategorySeries,
  smoothAnnualLumpSums,
  smoothEmbeddedBonuses,
} from '@/core/stats';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import type { AccentColorId } from '@/core/theme';
import { savingsAccountIbans } from '@/core/transfers';
import {
  clampRangeToCareerStart,
  validateCareerStartDate,
  type CareerStartDateRejection,
} from './career-start-date';
import { INCOME_GRANULARITY } from './income-granularity';

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
 * clamped span the page's aggregates take.
 *
 * Its one piece of genuine *entity* state is the salary metadata (FR-INC-10, TICKET-INC-10) — gross
 * wage and embedded bonus per month, the only figures on this page a bank CSV can never supply.
 * Those live in their own table behind `SalaryMetadataRepository`, hydrated on first injection.
 */
export const IncomeStore = signalStore(
  { providedIn: 'root' },
  // The page's one piece of *entity* state (FR-INC-10) — every other figure here is derived. Hydrated
  // from `SalaryMetadataRepository` on first injection, below.
  withState<{ salaryMetadata: SalaryMetadata[] }>({ salaryMetadata: [] }),
  withComputed((store) => {
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

    /**
     * The span every panel on `/income` actually covers (FR-INC-12): the data's full history,
     * clamped to start where the user says their working life did. Unset — the default — leaves
     * it identical to `fullHistoryRange`, so nothing changes for anyone who never sets a date.
     */
    const incomeRange = computed(() =>
      clampRangeToCareerStart(fullHistoryRange(), appSettingsStore.careerStartDate()),
    );

    /**
     * The income categories that count toward growth (FR-INC-3) — every active income category
     * minus the user's persisted exclusions. Derived subtractively (rather than reading a stored
     * selection) so a newly created income category is selected by default and an archived one
     * drops out, both without any sync effect.
     */
    const selectedIncomeCategoryIds = computed(() => {
      const excluded = new Set(appSettingsStore.excludedIncomeCategoryIds() ?? []);
      return new Set(
        incomeCategories()
          .map((category) => category.id!)
          .filter((id) => !excluded.has(id)),
      );
    });

    /**
     * The income categories the user has marked as an annual lump sum (FR-INC-4) — an *inclusion*
     * list, unlike the exclusion list above: smoothing is opt-in per category, so an unset field
     * means nothing is smoothed. `toggleIncomeCategory` prunes this list when a category leaves the
     * growth selection, so an id in here is always one the settings popup still shows.
     */
    const smoothedBonusCategoryIds = computed(
      () => new Set(appSettingsStore.smoothedBonusCategoryIds() ?? []),
    );

    /**
     * The page's monthly income series as the transactions actually record it: per-category totals
     * over `incomeRange` (FR-INC-2), scoped to the growth selection (FR-INC-3), **unsmoothed**.
     *
     * Lives on the store rather than on a component because every panel derives from it — one
     * `computed()` re-buckets the user's whole transaction history once per change instead of once
     * per panel, and no two panels can drift apart by passing slightly different arguments.
     *
     * Read this one only where a real deposit in a real month is the question — gap detection
     * (FR-INC-9), which must not let display smoothing manufacture a non-zero month over a genuine
     * silence. Everything else wants `incomeTrend` below.
     */
    const rawIncomeTrend = computed(() =>
      computeIncomeCategorySeries(
        transactionsStore.transactions(),
        categoriesStore.categoriesById(),
        selectedIncomeCategoryIds(),
        incomeRange().from,
        incomeRange().to,
        INCOME_GRANULARITY,
        savingsAccountIbans(accountsStore.accounts()),
        accountsStore.accountsById(),
      ),
    );

    /** The salary metadata keyed by `YYYY-MM` (FR-INC-10) — how every consumer actually reads it: one month at a time. */
    const salaryMetadataByMonth = computed(
      () => new Map(store.salaryMetadata().map((entry) => [entry.yearMonth, entry])),
    );

    return {
      incomeCategories,
      fullHistoryRange,
      latestTransactionDate,
      incomeRange,
      selectedIncomeCategoryIds,
      smoothedBonusCategoryIds,
      rawIncomeTrend,
      salaryMetadataByMonth,

      /** The user's career start date (FR-INC-12), or `undefined` while unset. */
      careerStartDate: computed(() => appSettingsStore.careerStartDate()),

      /**
       * The preset this page's gross-pay series take (TICKET-SET-08), or `undefined` for the active
       * theme's own chart palette. Exposed here rather than read from `AppSettingsStore` at each
       * chart, so every gross series on the page can't drift apart.
       */
      grossColor: computed(() => appSettingsStore.grossColor()),

      /**
       * `rawIncomeTrend` with both lump-sum smoothing passes applied — what the trend chart draws,
       * and what the growth-rate panel (FR-INC-5) and step-change detector (FR-INC-8) measure, so a
       * 13th month never reads as a raise however it was paid:
       * - `smoothAnnualLumpSums` (FR-INC-4) for a bonus with its *own* category, flagged in settings;
       * - `smoothEmbeddedBonuses` (TICKET-INC-13) for one baked into the regular salary deposit,
       *   where the only record is the `bonus` figure on that month's salary details (FR-INC-10).
       *
       * Order matters only in that the second pass reads bucket totals: it removes each month's
       * declared bonus from whatever the first pass left, so the two can't double-count a category
       * that is both flagged and carrying a recorded bonus.
       */
      incomeTrend: computed(() =>
        smoothEmbeddedBonuses(
          smoothAnnualLumpSums(rawIncomeTrend(), smoothedBonusCategoryIds(), INCOME_GRANULARITY),
          salaryMetadataByMonth(),
          INCOME_GRANULARITY,
        ),
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

      /** Persists the gross-series colour (TICKET-SET-08), or clears it back to the theme's palette. */
      setGrossColor: (grossColor: AccentColorId | undefined): Promise<void> =>
        appSettingsStore.setGrossColor(grossColor),
    };
  }),
  withMethods((store) => {
    const salaryMetadataRepository = inject(SalaryMetadataRepository);
    let hydration: Promise<void> | null = null;

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      hydration ??= salaryMetadataRepository.getAll().then((salaryMetadata) => {
        patchState(store, { salaryMetadata });
      });
      return hydration;
    };

    const reload = async (): Promise<void> => {
      patchState(store, { salaryMetadata: await salaryMetadataRepository.getAll() });
    };

    return {
      hydrate,

      /**
       * Writes one month's gross wage / embedded bonus (FR-INC-10), replacing whatever that month
       * held. Re-reads the table afterwards rather than patching in place: `upsert` resolves the
       * row's `id` inside the repository, and a round-trip is cheap for a table with one row per
       * month.
       */
      setSalaryMetadata: async (entry: SalaryMetadata): Promise<void> => {
        await salaryMetadataRepository.upsert(entry);
        await reload();
      },

      /** Deletes a month's row outright — what clearing both amounts means (see `resolveSalaryMetadataWrite`). */
      removeSalaryMetadata: async (id: number): Promise<void> => {
        await salaryMetadataRepository.remove(id);
        await reload();
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Fire-and-forget on first injection rather than at app bootstrap (TICKET-PERF-07) — nothing
      // outside `/income` reads salary metadata.
      void store.hydrate();
    },
  }),
);
