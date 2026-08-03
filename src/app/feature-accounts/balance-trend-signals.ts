import { computed, inject, type Signal } from '@angular/core';
import type { Account } from '@/core/data-access';
import {
  computeAccountBalanceTrends,
  computeFullHistoryRange,
  computeZoomWindow,
  pickGranularityForSpan,
  type AccountBalanceSeries,
  type ChartZoomWindow,
} from '@/core/stats';
import {
  chartGranularity,
  RangeStore,
  TransactionsStore,
  type ChartOptionsKey,
} from '@/core/state';
import type { Granularity } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export type BalanceTrendSignals = {
  /** Seeds from the Accounts page's date range the first time this chart is mounted (TICKET-STAT-15), then keeps the user's pick for the session (TICKET-STAT-27). */
  granularity: Signal<Granularity>;
  setGranularity: (granularity: Granularity) => void;
  series: Signal<AccountBalanceSeries[]>;
  zoomWindow: Signal<ChartZoomWindow>;
};

/**
 * The reactive scaffolding shared by `AccountBalanceChartComponent` and
 * `AccountBalanceHistoryChartComponent` (CR3-2.3): both wire the same range/granularity/zoom
 * chain around `computeAccountBalanceTrends`, differing only in which accounts they scope to (one
 * account vs. every active account) and their final ECharts option builder. Must be called from an
 * injection context (a component field initializer), since it injects its own store dependencies
 * rather than taking them as parameters.
 *
 * `chart` is the id the session-scoped bucket size is keyed by — the two callers pass different
 * ones, so the overview's bucket size and the detail page's are still independent choices. The
 * hand-dragged zoom window (TICKET-STAT-27) is deliberately *not* wired here: it belongs to the one
 * caller that has a single instance, and is composed there (`chartZoomControl`).
 */
export const balanceTrendSignals = (
  accounts: Signal<Account[]>,
  chart: ChartOptionsKey,
): BalanceTrendSignals => {
  const transactionsStore = inject(TransactionsStore);
  // Always the `accounts` range (TICKET-UI-23): both callers are Accounts routes — the overview's
  // stacked chart and the account-detail chart — and the detail route deliberately has no range
  // control of its own, so it scrubs from whatever the overview's header was left on.
  const rangeStore = inject(RangeStore);

  const range = computed(() =>
    computeFullHistoryRange(accounts(), transactionsStore.transactions(), todayIso()),
  );

  const { value: granularity, set: setGranularity } = chartGranularity(chart, () =>
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

  return { granularity, setGranularity, series, zoomWindow };
};
