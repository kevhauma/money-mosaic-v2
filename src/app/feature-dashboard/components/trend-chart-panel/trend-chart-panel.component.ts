import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { bucketDateBoundaries, RangeStore } from '@/core/stats';
import { buildTransactionDrilldownParams } from '@/shared/utils';
import { StatsStore } from '../../stats.store';

/** Income/expense + net-worth-over-time trend, bucketed at the selected grouping (FR-STAT-4). */
@Component({
  selector: 'app-trend-chart-panel',
  imports: [NgxEchartsDirective],
  templateUrl: './trend-chart-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendChartPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly router = inject(Router);

  protected readonly chartOption = computed<EChartsCoreOption>(() => {
    const buckets = this.statsStore.trendBuckets();
    const netWorthPoints = this.statsStore.netWorthTrend();

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Income', 'Expense', 'Net worth'] },
      grid: { left: 48, right: 48, top: 32, bottom: 24 },
      xAxis: { type: 'category', data: buckets.map((bucket) => bucket.bucketKey) },
      yAxis: [
        { type: 'value', name: 'Cash flow' },
        { type: 'value', name: 'Net worth' },
      ],
      series: [
        { name: 'Income', type: 'bar', data: buckets.map((bucket) => bucket.income) },
        { name: 'Expense', type: 'bar', data: buckets.map((bucket) => -bucket.expense) },
        {
          name: 'Net worth',
          type: 'line',
          yAxisIndex: 1,
          data: netWorthPoints.map((point) => point.netWorth),
        },
      ],
    };
  });

  protected onChartClick(event: ECElementEvent): void {
    const bucket = this.statsStore.trendBuckets()[event.dataIndex];
    if (!bucket) return;

    const { start, end } = bucketDateBoundaries(bucket.bucketKey, this.rangeStore.groupBy());
    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams({ from: start, to: end }),
    });
  }
}
