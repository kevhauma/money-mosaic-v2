import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import type { AccountBalanceSeries, DayTransactionIndex } from '@/core/stats';
import { AccountsStore, chartSeriesFilter, chartStacked, chartZoomControl } from '@/core/state';
import {
  bucketedZoomAxisOption,
  resolveChartAnimation,
  legendOption,
  resolveChartCategoricalColors,
  type ChartZoomBounds,
} from '@/shared/echarts';
import { FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { buildBalanceDayTooltip } from '../../balance-day-tooltip';
import { balanceTrendSignals } from '../../balance-trend-signals';

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildAccountBalanceHistoryChartOption = (
  accounts: Account[],
  series: AccountBalanceSeries[],
  zoomWindow: ChartZoomBounds,
  hiddenSeries: readonly string[] = [],
  dayIndex: DayTransactionIndex = new Map(),
  /**
   * `stacked` is the opt-in combined view (TICKET-ACC-12), off by default. Stacked, a line sits at
   * the sum of itself and every line below it, so the y-value read off an account is not that
   * account's balance — callers that turn this on are responsible for saying so on screen. An
   * options object rather than a sixth positional flag, the shape `buildBalanceDayTooltip` beside
   * this one already uses.
   */
  { stacked = false }: { stacked?: boolean } = {},
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
    // Not the shared `formatAxisTooltip` (TICKET-ACC-11): on a balance chart, restating each line's
    // value repeats what the chart already draws. What the hover is actually asking is what moved.
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
        // Unstacked lines overlap, so an opaque fill would hide whichever account is drawn under it
        // — the combined view keeps the solid bands it needs to read as one mass.
        ...(stacked
          ? { stack: 'account-balance', areaStyle: {} }
          : { areaStyle: { opacity: 0.12 } }),
        color: account?.color,
        data: points.map((point) => point.balance),
      };
    }),
  };
};

/**
 * Balance-history chart (TICKET-STAT-02): one line per active account (archived accounts never
 * appear, consistent with `activeAccounts`). Each line plots that account's actual balance —
 * matching its card's headline figure — not the net-worth stake this chart plotted until
 * TICKET-ACC-07, so for a joint account it no longer follows the Dashboard's net worth.
 *
 * **Per account by default, combined only on request (TICKET-ACC-12).** This shipped as a stacked
 * area chart, which meant an account's plotted y-value was the sum of itself and every account below
 * it: with €7,691 and €9,206 in the app, the savings line sat at ~€17,000 while its own card read
 * €9,206.42. Reconciling against a bank statement is the page's whole job, so stacking is now the
 * opt-in "Combined total" mode, and the caption says the top edge is a total when it is on.
 *
 * Always a daily series with no bucket picker (TICKET-ACC-10 — see `BALANCE_GRANULARITY`), and the
 * Accounts page's date range scrubs the initial zoom window (via `dataZoom`) rather than shrinking
 * the series data (TICKET-STAT-03), so zooming out is always available without a manual preset
 * change. Legend clicks toggle individual bands, and which bands are off is app state held for the
 * session (TICKET-STAT-27) rather than echarts-internal, so a range change or a remount no longer
 * puts back the accounts the user just hid.
 */
@Component({
  selector: 'app-account-balance-history-chart',
  imports: [NgxEchartsDirective, FlexComponent, PaperComponent, TypographyComponent],
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

  /** Per account unless the user asks for the combined view — see the class comment (TICKET-ACC-12). */
  private readonly stackedControl = chartStacked('accounts-balance-history', () => false);
  protected readonly stacked = this.stackedControl.value;
  protected readonly setStacked = this.stackedControl.set;

  /** Labels and pressed state resolved here, not per-button in the template — the `spanOptions()` shape. */
  protected readonly viewOptions = computed(() => [
    { stacked: false, label: 'Per account', selected: !this.stacked() },
    { stacked: true, label: 'Combined total', selected: this.stacked() },
  ]);

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
      { stacked: this.stacked() },
    ),
  );

  protected onChartClick(event: ECElementEvent): void {
    if (event.seriesIndex == null) return;

    const account = this.accounts()[event.seriesIndex];
    if (account?.id == null) return;
    void this.router.navigate(['/accounts', account.id]);
  }
}
