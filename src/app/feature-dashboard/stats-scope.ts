import { InjectionToken, signal, type Signal } from '@angular/core';
import type { StatsMode } from '@/core/stats';
import type { RangePageKey } from '@/core/state';

/**
 * What a `StatsStore` instance — and every Dashboard panel reading it — is a picture *of*
 * (TICKET-ACC-14). The Dashboard's answer is the whole household under its own range; account
 * detail's is one account under its own, read as plain money in and money out (`'cashflow'`).
 */
export type StatsScope = {
  /** Whose date range bounds every figure — and seeds every drill-down's `from`/`to`. */
  rangePage: RangePageKey;
  /** `null` reads every account; a number narrows every figure, and every drill-down, to that one. */
  accountId: Signal<number | null>;
  /** Passed to every `classifyForStats` call (and to biggest-transactions) — see `StatsMode`. */
  mode: StatsMode;
  /** The trend panel's `ChartOptionsStore` key; its two legends use `-income` / `-expense` on it. */
  trendChartKey: 'dashboard-trend' | 'account-detail-trend';
};

/**
 * The scope `StatsStore` reads. The root default is the Dashboard's, unchanged — which is what
 * keeps the Dashboard, and anything else that ever injects the root `StatsStore`, on byte-identical
 * figures. A page that wants a different picture provides
 * its own through `provideStatsScope` (beside `StatsStore`) rather than forking the store or its
 * panels.
 */
export const STATS_SCOPE = new InjectionToken<StatsScope>('STATS_SCOPE', {
  providedIn: 'root',
  factory: () => ({
    rangePage: 'dashboard',
    accountId: signal(null).asReadonly(),
    mode: 'share',
    trendChartKey: 'dashboard-trend',
  }),
});
