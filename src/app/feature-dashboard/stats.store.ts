import { computed, inject, type Provider } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import {
  computeCategoryBreakdown,
  computeCategoryPeriodComparison,
  computeComparisonWindow,
  computePeriodStats,
  computeTopTransactions,
  computeTransferFlows,
  computeWeekdayWeekendSplit,
  computeYearOverYearComparison,
} from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { AccountsStore, CategoriesStore, RangeStore, TransactionsStore } from '@/core/state';
import type { TransactionDrilldownParams } from '@/shared/utils';
import { CategoryComparisonSettingsStore } from './category-comparison-settings.store';
import { STATS_SCOPE, type StatsScope } from './stats-scope';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * Range-scoped statistics for the Dashboard (FR-STAT-2..4), wiring the pure aggregation
 * functions in `core/stats` to the entity stores + the global `RangeStore`. Pure `computed()`
 * derivation only (no local state/methods): editing a transaction updates `TransactionsStore`,
 * which flows straight through with no manual invalidation (FR-STAT-5).
 *
 * NFR-PERF-1 note: each aggregate below is one shared O(n) (or O(n log n) for net-worth) pass
 * rather than one pass per bucket/consumer. True per-(accountId,granularity,bucketKey)
 * incremental caching is intentionally not implemented here — it's overkill for realistic v1
 * dataset sizes (a full grouping pass over 10k transactions is sub-millisecond work).
 *
 * Lives in `feature-dashboard` rather than `core/stats` because it's dashboard-specific composition
 * (range-scoped, wires `RangeStore` + `CategoryComparisonSettingsStore` together); the entity stores
 * it injects (`TransactionsStore`/`AccountsStore`/`CategoriesStore`) live in `core/state` themselves.
 *
 * What it is a picture *of* comes from `STATS_SCOPE` (TICKET-ACC-14): the root instance reads the
 * Dashboard's default — every account, the `'dashboard'` range, `'share'` joint mode — and a page
 * provides a scoped instance with `provideStatsScope` below. Scoping filters the transaction list
 * *before* it reaches the `core/stats` functions, so those stay exactly the functions the Dashboard
 * calls.
 */
export const StatsStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const transactionsStore = inject(TransactionsStore);
    const accountsStore = inject(AccountsStore);
    const categoriesStore = inject(CategoriesStore);
    const rangeStore = inject(RangeStore);
    const categoryComparisonSettingsStore = inject(CategoryComparisonSettingsStore);
    const scope = inject(STATS_SCOPE);

    const ownSavingsIbans = computed(() => savingsAccountIbans(accountsStore.accounts()));

    const from = computed(() => rangeStore.from(scope.rangePage));
    const to = computed(() => rangeStore.to(scope.rangePage));

    /** Unscoped, this is `TransactionsStore`'s own array — same reference, so the Dashboard's figures can't move. */
    const transactions = computed(() => {
      const all = transactionsStore.transactions();
      const accountId = scope.accountId();
      return accountId == null ? all : all.filter((t) => t.accountId === accountId);
    });

    const periodStats = computed(() =>
      computePeriodStats(
        transactions(),
        from(),
        to(),
        ownSavingsIbans(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
        scope.jointMode,
      ),
    );

    const categoryBreakdown = computed(() =>
      computeCategoryBreakdown(
        transactions(),
        categoriesStore.categoriesById(),
        from(),
        to(),
        ownSavingsIbans(),
        accountsStore.accountsById(),
        scope.jointMode,
      ),
    );

    const weekdayWeekendSplit = computed(() =>
      computeWeekdayWeekendSplit(
        transactions(),
        from(),
        to(),
        ownSavingsIbans(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
        scope.jointMode,
      ),
    );

    const topTransactions = computed(() =>
      computeTopTransactions(transactions(), from(), to(), ownSavingsIbans()),
    );

    const yearOverYear = computed(() =>
      computeYearOverYearComparison(
        transactions(),
        from(),
        to(),
        ownSavingsIbans(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
        undefined,
        scope.jointMode,
      ),
    );

    const comparisonWindow = computed(() =>
      computeComparisonWindow(
        {
          preset: rangeStore.preset(scope.rangePage),
          from: from(),
          to: to(),
        },
        todayIso(),
      ),
    );

    const categoryPeriodComparison = computed(() => {
      const window = comparisonWindow();
      if (!window) return null;

      return computeCategoryPeriodComparison(
        transactions(),
        categoriesStore.categoriesById(),
        window,
        ownSavingsIbans(),
        accountsStore.accountsById(),
        new Set(categoryComparisonSettingsStore.excludedCategoryIds()),
        scope.jointMode,
      );
    });

    /**
     * Money moved between my own accounts (TICKET-ACC-14) — what income/expense leave out. Always
     * zero-sum across the household, so only a scoped page shows it.
     */
    const transferFlows = computed(() =>
      computeTransferFlows(transactions(), from(), to(), ownSavingsIbans()),
    );

    /**
     * Whether any live scoped transaction falls in the range — false means an empty range, not
     * zeros. A `nullified` row counts for nothing anywhere in the stats, so it doesn't count here.
     */
    const hasTransactionsInRange = computed(() =>
      transactions().some(
        (transaction) =>
          !transaction.nullified &&
          transaction.bookingDate >= from() &&
          transaction.bookingDate <= to(),
      ),
    );

    /**
     * What every drill-down to `/transactions` starts from: this scope's range, plus its account when
     * it has one. A panel spreads it into `buildTransactionDrilldownParams` and overrides what it
     * narrows (a category, a bucket's dates). That helper drops an undefined `accountId`, so the
     * Dashboard's links are exactly what they were.
     */
    const drilldownScope = computed<TransactionDrilldownParams>(() => ({
      from: from(),
      to: to(),
      accountId: scope.accountId() ?? undefined,
    }));

    return {
      from,
      to,
      transactions,
      transferFlows,
      hasTransactionsInRange,
      drilldownScope,
      periodStats,
      categoryBreakdown,
      weekdayWeekendSplit,
      topTransactions,
      yearOverYear,
      categoryPeriodComparison,
      /**
       * `TransactionsStore` hydrates in the background without blocking app bootstrap
       * (TICKET-PERF-05) — dashboard panels gate on this so a still-loading transaction set
       * doesn't briefly read as "no data for this range" rather than "still loading".
       */
      dataReady: transactionsStore.hydrated,
    };
  }),
);

/**
 * A component-level `StatsStore` reading `scope` instead of the Dashboard's (TICKET-ACC-14): put
 * the result in a component's `providers`, and every Dashboard panel rendered under it resolves the
 * scoped instance while the rest of the app keeps the root one.
 *
 * `scope` is a factory, run lazily the first time something under that component injects the
 * store — late enough that it may `inject()` the host component itself to read one of its signals
 * (account detail reads its account id this way). The host must therefore not inject `StatsStore`
 * in its own constructor: let a child component read it.
 */
export const provideStatsScope = (scope: () => StatsScope): Provider[] => [
  { provide: STATS_SCOPE, useFactory: scope },
  StatsStore,
];
