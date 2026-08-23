import { computed, inject, type Signal } from '@angular/core';
import type { Account } from '@/core/data-access';
import {
  buildDayTransactionIndex,
  computeAccountBalanceTrends,
  computeFullHistoryRange,
  computeZoomWindow,
  type AccountBalanceSeries,
  type ChartZoomWindow,
  type DayTransactionIndex,
} from '@/core/stats';
import { RangeStore, TransactionsStore } from '@/core/state';
import type { Granularity } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * Every balance chart in this feature buckets by day, always (TICKET-ACC-10) — and offers no picker
 * to change it.
 *
 * A balance is a **level, not a period sum**: "March's balance" is only ever the balance on one
 * particular day of March, so a coarser bucket samples one day and silently discards the rest — a
 * month with a large mid-month dip reads flat. The picker these charts used to carry (TICKET-STAT-15)
 * therefore offered four options whose only effect was to throw history away, and seeded from the
 * page's range, so a wide range opened the chart on Month and the user set it back to Day every visit.
 *
 * The "too many points" case coarse buckets might have answered is already the `dataZoom` slider's
 * job: the series is full history and the page's range scrubs the window (TICKET-STAT-03).
 *
 * Don't reintroduce a picker here. If a long history ever renders slowly, the fix is echarts-side
 * (`sampling: 'lttb'`, `large: true`), not fewer days.
 */
export const BALANCE_GRANULARITY: Granularity = 'day';

export type BalanceTrendSignals = {
  /** Always `BALANCE_GRANULARITY` — exposed so both charts and their drill-downs read the one value rather than re-typing `'day'`. */
  granularity: Granularity;
  series: Signal<AccountBalanceSeries[]>;
  zoomWindow: Signal<ChartZoomWindow>;
  /** What moved on each day, for the hover tooltip (TICKET-ACC-11) — rebuilt with the series, not per hover. */
  dayIndex: Signal<DayTransactionIndex>;
};

/**
 * The reactive scaffolding shared by `AccountBalanceChartComponent` and
 * `AccountBalanceHistoryChartComponent` (CR3-2.3): both wire the same range/zoom chain around
 * `computeAccountBalanceTrends`, differing only in which accounts they scope to (one account vs.
 * every active account) and their final ECharts option builder. Must be called from an injection
 * context (a component field initializer), since it injects its own store dependencies rather than
 * taking them as parameters.
 */
export const balanceTrendSignals = (accounts: Signal<Account[]>): BalanceTrendSignals => {
  const transactionsStore = inject(TransactionsStore);
  // Always the `accounts` range (TICKET-UI-23): both callers are Accounts routes — the overview's
  // all-accounts chart and the account-detail chart — and the detail route deliberately has no range
  // control of its own, so it scrubs from whatever the overview's header was left on.
  const rangeStore = inject(RangeStore);

  const range = computed(() =>
    computeFullHistoryRange(accounts(), transactionsStore.transactions(), todayIso()),
  );

  // No joint-leg context here by design (TICKET-ACC-07): these series are raw account balances, so
  // the cross-account transfer/category lookups the contribution model needs are irrelevant.
  const series = computed(() =>
    computeAccountBalanceTrends(
      transactionsStore.transactions(),
      accounts(),
      range().from,
      range().to,
      BALANCE_GRANULARITY,
    ),
  );

  const zoomWindow = computed(() =>
    computeZoomWindow(
      series()[0]?.points.map((point) => point.bucketKey) ?? [],
      rangeStore.from('accounts'),
      rangeStore.to('accounts'),
      BALANCE_GRANULARITY,
    ),
  );

  // Scoped to the same accounts the chart draws, so an archived account is as absent from the
  // tooltip as it is from the plot — and so account detail's one-account list is the same call.
  const dayIndex = computed(() =>
    buildDayTransactionIndex(transactionsStore.transactions(), accounts()),
  );

  return { granularity: BALANCE_GRANULARITY, series, zoomWindow, dayIndex };
};
