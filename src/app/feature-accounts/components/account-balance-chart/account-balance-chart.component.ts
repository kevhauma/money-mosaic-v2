import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import type { AccountBalancePoint } from '@/core/stats';
import {
  resolveChartAnimation,
  formatAxisTooltip,
  resolveChartCategoricalColors,
  type ChartZoomBounds,
} from '@/shared/echarts';
import { FlexComponent, PaperComponent } from '@/shared/ui';
import { bucketDateBoundaries, buildTransactionDrilldownParams } from '@/shared/utils';
import { balanceTrendSignals } from '../../balance-trend-signals';

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildAccountBalanceChartOption = (
  account: Account,
  points: AccountBalancePoint[],
  zoomWindow: ChartZoomBounds,
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
      data: points.map((point) => point.balance),
      color: account.color,
    },
  ],
});

/**
 * Full-history balance line for one account (TICKET-STAT-02) — spans opening-balance date/first
 * transaction through today, so the series itself is always the account's entire history. Plots the
 * account's *real* balance, matching the figure in the detail page's own balance header — for a
 * joint account that's the whole pot, not my stake in it (TICKET-ACC-07). Always a daily series with
 * no bucket picker (TICKET-ACC-10 — see `BALANCE_GRANULARITY`), and the Accounts page's date range
 * scrubs the initial zoom window (via `dataZoom`) rather than shrinking the series data
 * (TICKET-STAT-03), so zooming out is always available without a manual preset change.
 */
@Component({
  selector: 'app-account-balance-chart',
  imports: [NgxEchartsDirective, FlexComponent, PaperComponent],
  templateUrl: './account-balance-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBalanceChartComponent {
  readonly account = input.required<Account>();

  private readonly router = inject(Router);

  private readonly trend = balanceTrendSignals(computed(() => [this.account()]));
  protected readonly points = computed(() => this.trend.series()[0]?.points ?? []);

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildAccountBalanceChartOption(this.account(), this.points(), this.trend.zoomWindow()),
  );

  protected onChartClick(event: ECElementEvent): void {
    const point = this.points()[event.dataIndex];
    if (!point) return;

    // `BALANCE_GRANULARITY` is `'day'` (TICKET-ACC-10), so start and end collapse to the clicked
    // date itself and the drill-down opens on exactly that day.
    const { start, end } = bucketDateBoundaries(point.bucketKey, this.trend.granularity);
    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams({
        from: start,
        to: end,
        accountId: this.account().id,
      }),
    });
  }
}
