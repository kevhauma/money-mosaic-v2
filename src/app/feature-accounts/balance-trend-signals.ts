import { computed, inject, signal, type Signal, type WritableSignal } from '@angular/core';
import type { Account } from '@/core/data-access';
import {
  computeAccountBalanceTrends,
  computeFullHistoryRange,
  computeZoomWindow,
  pickGranularityForSpan,
  type AccountBalanceSeries,
  type ChartZoomWindow,
} from '@/core/stats';
import { RangeStore, TransactionsStore } from '@/core/state';
import type { Granularity } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export type BalanceTrendSignals = {
  /** Defaults from the Accounts page's date range on first render (TICKET-STAT-15); independent of every other chart's control thereafter. */
  granularity: WritableSignal<Granularity>;
  series: Signal<AccountBalanceSeries[]>;
  zoomWindow: Signal<ChartZoomWindow>;
};

/**
 * The reactive scaffolding shared by `AccountBalanceChartComponent` and
 * `AccountBalanceHistoryChartComponent` (CR3-2.3): both wire the same range/granularity/zoomWindow
 * chain around `computeAccountBalanceTrends`, differing only in which accounts they scope to (one
 * account vs. every active account) and their final ECharts option builder. Must be called from an
 * injection context (a component field initializer), since it injects its own store dependencies
 * rather than taking them as parameters.
 */
export const balanceTrendSignals = (accounts: Signal<Account[]>): BalanceTrendSignals => {
  const transactionsStore = inject(TransactionsStore);
  // Always the `accounts` range (TICKET-UI-23): both callers are Accounts routes — the overview's
  // stacked chart and the account-detail chart — and the detail route deliberately has no range
  // control of its own, so it scrubs from whatever the overview's header was left on.
  const rangeStore = inject(RangeStore);

  const range = computed(() =>
    computeFullHistoryRange(accounts(), transactionsStore.transactions(), todayIso()),
  );

  const granularity = signal<Granularity>(
    pickGranularityForSpan(rangeStore.from('accounts'), rangeStore.to('accounts')),
  );

  // No joint-leg context here by design (TICKET-ACC-07): these series are raw account balances, so
  // the cross-account transfer/category lookups the contribution model needs are irrelevant.
  const series = computed(() =>
    computeAccountBalanceTrends(
      transactionsStore.transactions(),
      accounts(),
      range().from,
      range().to,
      granularity(),
    ),
  );

  const zoomWindow = computed(() =>
    computeZoomWindow(
      series()[0]?.points.map((point) => point.bucketKey) ?? [],
      rangeStore.from('accounts'),
      rangeStore.to('accounts'),
      granularity(),
    ),
  );

  return { granularity, series, zoomWindow };
};
