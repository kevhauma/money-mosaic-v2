import { computed, inject, signal, type Signal, type WritableSignal } from '@angular/core';
import type { Account } from '@/core/data-access';
import {
  computeAccountBalanceTrends,
  computeFullHistoryRange,
  computeZoomWindow,
  pickGranularityForSpan,
  RangeStore,
  type AccountBalanceSeries,
  type ChartZoomWindow,
  type JointLegContext,
} from '@/core/stats';
import { AccountsStore, CategoriesStore, TransactionsStore, TransfersStore } from '@/core/state';
import type { Granularity } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export type BalanceTrendSignals = {
  /** Defaults from the current shared date range on first render (TICKET-STAT-15); independent of every other chart's control thereafter. */
  granularity: WritableSignal<Granularity>;
  series: Signal<AccountBalanceSeries[]>;
  zoomWindow: Signal<ChartZoomWindow>;
};

/**
 * The reactive scaffolding shared by `AccountBalanceChartComponent` and
 * `NetWorthHistoryChartComponent` (CR3-2.3): both wire the same range/granularity/jointLegContext/
 * zoomWindow chain around `computeAccountBalanceTrends`, differing only in which accounts they
 * scope to (one account vs. every active account) and their final ECharts option builder. Must be
 * called from an injection context (a component field initializer), since it injects its own
 * store dependencies rather than taking them as parameters.
 */
export const balanceTrendSignals = (accounts: Signal<Account[]>): BalanceTrendSignals => {
  const accountsStore = inject(AccountsStore);
  const transactionsStore = inject(TransactionsStore);
  const transfersStore = inject(TransfersStore);
  const categoriesStore = inject(CategoriesStore);
  const rangeStore = inject(RangeStore);

  const range = computed(() =>
    computeFullHistoryRange(accounts(), transactionsStore.transactions(), todayIso()),
  );

  const granularity = signal<Granularity>(
    pickGranularityForSpan(rangeStore.from(), rangeStore.to()),
  );

  // Cross-account lookups a joint account's stake needs (TICKET-STAT-03) — `accountsById` spans
  // every account so a linked transfer's other leg always resolves, even outside the scoped
  // `accounts()` list (e.g. to an archived account, or one outside a single-account detail chart).
  const jointLegContext = computed((): JointLegContext => ({
    transactionsById: new Map(transactionsStore.transactions().map((t) => [t.id!, t])),
    accountsById: accountsStore.accountsById(),
    transfersById: transfersStore.transferByTransactionId(),
    categoriesById: categoriesStore.categoriesById(),
  }));

  const series = computed(() =>
    computeAccountBalanceTrends(
      transactionsStore.transactions(),
      accounts(),
      range().from,
      range().to,
      granularity(),
      jointLegContext(),
    ),
  );

  const zoomWindow = computed(() =>
    computeZoomWindow(
      series()[0]?.points.map((point) => point.bucketKey) ?? [],
      rangeStore.from(),
      rangeStore.to(),
      granularity(),
    ),
  );

  return { granularity, series, zoomWindow };
};
