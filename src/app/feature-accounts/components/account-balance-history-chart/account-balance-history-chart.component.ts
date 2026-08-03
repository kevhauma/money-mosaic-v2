import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import type { AccountBalanceSeries, DayTransactionIndex } from '@/core/stats';
import { AccountsStore, chartSeriesFilter, chartZoomControl } from '@/core/state';
import {
  bucketedZoomAxisOption,
  resolveChartAnimation,
  legendOption,
  resolveChartCategoricalColors,
  type ChartZoomBounds,
} from '@/shared/echarts';
import { FlexComponent, PaperComponent } from '@/shared/ui';
import { buildBalanceDayTooltip } from '../../balance-day-tooltip';
import { balanceTrendSignals } from '../../balance-trend-signals';

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildAccountBalanceHistoryChartOption = (
  accounts: Account[],
  series: AccountBalanceSeries[],
  zoomWindow: ChartZoomBounds,
  hiddenSeries: readonly string[] = [],
  dayIndex: DayTransactionIndex = new Map(),
): EChartsCoreOption => {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const bucketKeys = series[0]?.points.map((point) => point.bucketKey) ?? [];
  // Worst case of the three this fixed (TICKET-STAT-26): stacked areas peak at the top of the plot,
  // so the top band always met the legend — the very control you click to hide an account. The
  // hidden names come back out as `legend.selected` (TICKET-STAT-27), so the rebuilt option restores
  // the user's filter rather than clearing it.
  const { legend, gridOffset } = legendOption(
    accounts.map((account) => account.name),
    'top',
    hiddenSeries,
  );

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    // Not the shared `formatAxisTooltip` (TICKET-ACC-11): on a balance chart, restating each band's
    // value repeats what the stack already draws. What the hover is actually asking is what moved.
    tooltip: {
      trigger: 'axis',
      formatter: buildBalanceDayTooltip(dayIndex, { showAccountNames: true }),
    },
    legend,
    ...bucketedZoomAxisOption(bucketKeys, zoomWindow, gridOffset),
    series: series.map(({ accountId, points }) => {
      const account = accountsById.get(accountId);
      return {
        name: account?.name ?? '',
        type: 'line',
        stack: 'account-balance',
        areaStyle: {},
        color: account?.color,
        data: points.map((point) => point.balance),
      };
    }),
  };
};

/**
 * Stacked-area balance-history chart (TICKET-STAT-02): one band per active account (archived
 * accounts never appear, consistent with `activeAccounts`), stacked so the top edge is the total
 * real balance held across every active account. Each band is that account's actual balance —
 * matching its card's headline figure — not the net-worth stake this chart plotted until
 * TICKET-ACC-07, so for a joint account the stack no longer sums to the Dashboard's net worth.
 * Always a daily series with no bucket picker (TICKET-ACC-10 — see `BALANCE_GRANULARITY`), and the
 * Accounts page's date range scrubs the initial zoom window (via `dataZoom`) rather than shrinking
 * the series data (TICKET-STAT-03), so zooming out is always available without a manual preset
 * change. Legend clicks toggle individual bands, and which bands are off is app state held for the
 * session (TICKET-STAT-27) rather than echarts-internal, so a range change or a remount no longer
 * puts back the accounts the user just hid.
 */
@Component({
  selector: 'app-account-balance-history-chart',
  imports: [NgxEchartsDirective, FlexComponent, PaperComponent],
  templateUrl: './account-balance-history-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBalanceHistoryChartComponent {
  private readonly accountsStore = inject(AccountsStore);
  private readonly router = inject(Router);

  protected readonly accounts = computed(() => this.accountsStore.activeAccounts());

  private readonly trend = balanceTrendSignals(this.accounts);
  protected readonly series = this.trend.series;

  private readonly seriesFilter = chartSeriesFilter(
    'accounts-balance-history',
    computed(() => this.accounts().map((account) => account.name)),
  );
  protected readonly onLegendSelectChanged = this.seriesFilter.onLegendSelectChanged;

  private readonly zoomControl = chartZoomControl('accounts-balance-history');
  protected readonly onDataZoom = this.zoomControl.onDataZoom;

  /** A window the user dragged wins over the range-scrubbed default (TICKET-STAT-27) — re-scrubbing it on the next range or bucket change is exactly the reset this fixed. */
  private readonly zoom = computed<ChartZoomBounds>(
    () => this.zoomControl.manual() ?? this.trend.zoomWindow(),
  );

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildAccountBalanceHistoryChartOption(
      this.accounts(),
      this.series(),
      this.zoom(),
      this.seriesFilter.hidden(),
      this.trend.dayIndex(),
    ),
  );

  protected onChartClick(event: ECElementEvent): void {
    if (event.seriesIndex == null) return;

    const account = this.accounts()[event.seriesIndex];
    if (account?.id == null) return;
    void this.router.navigate(['/accounts', account.id]);
  }
}
