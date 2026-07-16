import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import type { AccountBalanceSeries, ChartZoomWindow } from '@/core/stats';
import { AccountsStore } from '@/core/state';
import { formatAxisTooltip } from '@/shared/echarts';
import { GranularityPickerComponent, PaperComponent } from '@/shared/ui';
import { balanceTrendSignals } from '../../balance-trend-signals';

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildNetWorthHistoryChartOption = (
  accounts: Account[],
  series: AccountBalanceSeries[],
  zoomWindow: ChartZoomWindow,
): EChartsCoreOption => {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const bucketKeys = series[0]?.points.map((point) => point.bucketKey) ?? [];

  return {
    tooltip: { trigger: 'axis', formatter: formatAxisTooltip },
    legend: { data: accounts.map((account) => account.name) },
    grid: { left: 56, right: 24, top: 48, bottom: 64 },
    xAxis: { type: 'category', data: bucketKeys },
    yAxis: { type: 'value' },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, ...zoomWindow },
      { type: 'slider', xAxisIndex: 0, height: 20, bottom: 8, ...zoomWindow },
    ],
    series: series.map(({ accountId, points }) => {
      const account = accountsById.get(accountId);
      return {
        name: account?.name ?? '',
        type: 'line',
        stack: 'net-worth',
        areaStyle: {},
        color: account?.color,
        data: points.map((point) => point.netWorth),
      };
    }),
  };
};

/**
 * Stacked-area net-worth-history chart (TICKET-STAT-02): one band per active account (archived
 * accounts never appear, consistent with `activeAccounts`), stacked so the top edge is combined
 * net worth over the full history of every active account. This chart owns its own local
 * granularity control (TICKET-STAT-15), independent of every other chart's, and the topbar's date
 * range scrubs the initial zoom window (via `dataZoom`) rather than shrinking the series data
 * (TICKET-STAT-03), so zooming out is always available without a manual preset change. Legend
 * clicks toggle individual bands (native echarts behaviour).
 */
@Component({
  selector: 'app-net-worth-history-chart',
  imports: [NgxEchartsDirective, GranularityPickerComponent, PaperComponent],
  templateUrl: './net-worth-history-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetWorthHistoryChartComponent {
  private readonly accountsStore = inject(AccountsStore);
  private readonly router = inject(Router);

  protected readonly accounts = computed(() => this.accountsStore.activeAccounts());

  private readonly trend = balanceTrendSignals(this.accounts);
  protected readonly granularity = this.trend.granularity;
  protected readonly series = this.trend.series;
  private readonly zoomWindow = this.trend.zoomWindow;

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildNetWorthHistoryChartOption(this.accounts(), this.series(), this.zoomWindow()),
  );

  protected onChartClick(event: ECElementEvent): void {
    if (event.seriesIndex == null) return;

    const account = this.accounts()[event.seriesIndex];
    if (account?.id == null) return;
    void this.router.navigate(['/accounts', account.id]);
  }
}
