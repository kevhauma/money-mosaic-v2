import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import {
  computeCategoryBreakdown,
  computeCategoryPeriodComparison,
  computeComparisonWindow,
  computeNetWorthTrend,
  computePeriodStats,
  computeSpendingRate,
  computeTopTransactions,
  computeTrendBuckets,
  computeWeekdayWeekendSplit,
  computeYearOverYearComparison,
  RangeStore,
  type JointLegContext,
} from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore } from '@/feature-categories';
import { TransactionsStore, TransfersStore } from '@/feature-transactions';
import { CategoryComparisonSettingsStore } from './category-comparison-settings.store';

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
 * Lives in `feature-dashboard` rather than `core/stats` because it depends on feature-level
 * entity stores (`TransactionsStore`/`AccountsStore`/`CategoriesStore`) — `core/` stays UI/feature-free,
 * matching the rest of this codebase (no existing `core/*` file imports from a `feature-*` module).
 */
export const StatsStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const transactionsStore = inject(TransactionsStore);
    const accountsStore = inject(AccountsStore);
    const categoriesStore = inject(CategoriesStore);
    const transfersStore = inject(TransfersStore);
    const rangeStore = inject(RangeStore);
    const categoryComparisonSettingsStore = inject(CategoryComparisonSettingsStore);

    const ownSavingsIbans = computed(() => savingsAccountIbans(accountsStore.accounts()));

    // Shared lookup context for classifying a joint account's own transaction legs
    // (TICKET-STAT-03), reused by every aggregate below so they can't disagree on the maths.
    const jointLegContext = computed((): JointLegContext => ({
      transactionsById: new Map(transactionsStore.transactions().map((t) => [t.id!, t])),
      accountsById: accountsStore.accountsById(),
      transfersById: transfersStore.transferByTransactionId(),
      categoriesById: categoriesStore.categoriesById(),
    }));

    const periodStats = computed(() =>
      computePeriodStats(
        transactionsStore.transactions(),
        rangeStore.from(),
        rangeStore.to(),
        ownSavingsIbans(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
      ),
    );

    const categoryBreakdown = computed(() =>
      computeCategoryBreakdown(
        transactionsStore.transactions(),
        categoriesStore.categoriesById(),
        rangeStore.from(),
        rangeStore.to(),
        ownSavingsIbans(),
        accountsStore.accountsById(),
      ),
    );

    const spendingRate = computed(() =>
      computeSpendingRate(
        transactionsStore.transactions(),
        rangeStore.from(),
        rangeStore.to(),
        ownSavingsIbans(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
      ),
    );

    const weekdayWeekendSplit = computed(() =>
      computeWeekdayWeekendSplit(
        transactionsStore.transactions(),
        rangeStore.from(),
        rangeStore.to(),
        ownSavingsIbans(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
      ),
    );

    const topTransactions = computed(() =>
      computeTopTransactions(
        transactionsStore.transactions(),
        rangeStore.from(),
        rangeStore.to(),
        ownSavingsIbans(),
      ),
    );

    const trendBuckets = computed(() =>
      computeTrendBuckets(
        transactionsStore.transactions(),
        rangeStore.from(),
        rangeStore.to(),
        rangeStore.groupBy(),
      ),
    );

    const netWorthTrend = computed(() =>
      computeNetWorthTrend(
        transactionsStore.transactions(),
        accountsStore.accounts(),
        rangeStore.from(),
        rangeStore.to(),
        rangeStore.groupBy(),
        jointLegContext(),
      ),
    );

    const yearOverYear = computed(() =>
      computeYearOverYearComparison(
        transactionsStore.transactions(),
        rangeStore.from(),
        rangeStore.to(),
        ownSavingsIbans(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
      ),
    );

    const comparisonWindow = computed(() =>
      computeComparisonWindow(
        { preset: rangeStore.preset(), from: rangeStore.from(), to: rangeStore.to() },
        todayIso(),
      ),
    );

    const categoryPeriodComparison = computed(() => {
      const window = comparisonWindow();
      if (!window) return null;

      return computeCategoryPeriodComparison(
        transactionsStore.transactions(),
        categoriesStore.categoriesById(),
        window,
        ownSavingsIbans(),
        accountsStore.accountsById(),
        new Set(categoryComparisonSettingsStore.excludedCategoryIds()),
      );
    });

    return {
      periodStats,
      categoryBreakdown,
      spendingRate,
      weekdayWeekendSplit,
      topTransactions,
      trendBuckets,
      netWorthTrend,
      yearOverYear,
      categoryPeriodComparison,
    };
  }),
);
