import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import {
  computeCategoryBreakdown,
  computeNetWorthTrend,
  computePeriodStats,
  computeTrendBuckets,
  RangeStore,
} from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore } from '@/feature-categories';
import { TransactionsStore } from '@/feature-transactions';

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
    const rangeStore = inject(RangeStore);

    const ownSavingsIbans = computed(() => savingsAccountIbans(accountsStore.accounts()));

    const periodStats = computed(() =>
      computePeriodStats(
        transactionsStore.transactions(),
        rangeStore.from(),
        rangeStore.to(),
        ownSavingsIbans(),
      ),
    );

    const categoryBreakdown = computed(() =>
      computeCategoryBreakdown(
        transactionsStore.transactions(),
        categoriesStore.categoriesById(),
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
      ),
    );

    return { periodStats, categoryBreakdown, trendBuckets, netWorthTrend };
  }),
);
