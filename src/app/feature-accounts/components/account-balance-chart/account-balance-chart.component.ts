import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import type { ChartZoomWindow, NetWorthPoint } from '@/core/stats';
import {
  resolveChartAnimation,
  formatAxisTooltip,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import { FlexComponent, GranularityPickerComponent, PaperComponent } from '@/shared/ui';
import { bucketDateBoundaries, buildTransactionDrilldownParams } from '@/shared/utils';
import { balanceTrendSignals } from '../../balance-trend-signals';

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildAccountBalanceChartOption = (
  account: Account,
  points: NetWorthPoint[],
  zoomWindow: ChartZoomWindow,
): EChartsCoreOption => ({
  ...resolveChartAnimation(),
  color: resolveChartCategoricalColors(),
  tooltip: { trigger: 'axis', formatter: formatAxisTooltip },
  grid: { left: 56, right: 24, top: 24, bottom: 64 },
  xAxis: { type: 'category', data: points.map((point) => point.bucketKey) },
  yAxis: { type: 'value' },
  dataZoom: [
    { type: 'inside', xAxisIndex: 0, ...zoomWindow },
    { type: 'slider', xAxisIndex: 0, height: 20, bottom: 8, ...zoomWindow },
  ],
  series: [
    {
      type: 'line',
      data: points.map((point) => point.netWorth),
      color: account.color,
    },
  ],
});

/**
 * Full-history balance line for one account (TICKET-STAT-02) â€” spans opening-balance date/first
 * transaction through today, so the series itself is always the account's entire history. This
 * chart owns its own local granularity control (TICKET-STAT-15), independent of every other
 * chart's, and the topbar's date range scrubs the initial zoom window (via `dataZoom`) rather than
 * shrinking the series data (TICKET-STAT-03), so zooming out is always available without a manual
 * preset change.
 */
@Component({
  selector: 'app-account-balance-chart',
  imports: [NgxEchartsDirective, FlexComponent, GranularityPickerComponent, PaperComponent],
  templateUrl: './account-balance-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBalanceChartComponent {
  readonly account = input.required<Account>();

  private readonly router = inject(Router);

  private readonly trend = balanceTrendSignals(computed(() => [this.account()]));
  protected readonly granularity = this.trend.granularity;
  protected readonly points = computed(() => this.trend.series()[0]?.points ?? []);
  private readonly zoomWindow = this.trend.zoomWindow;

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildAccountBalanceChartOption(this.account(), this.points(), this.zoomWindow()),
  );

  protected onChartClick(event: ECElementEvent): void {
    const point = this.points()[event.dataIndex];
    if (!point) return;

    const { start, end } = bucketDateBoundaries(point.bucketKey, this.granularity());
    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams({
        from: start,
        to: end,
        accountId: this.account().id,
      }),
    });
  }
}
