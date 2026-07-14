import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  bucketDateBoundaries,
  computeTrendBuckets,
  pickGranularityForSpan,
  RangeStore,
  type Granularity,
} from '@/core/stats';
import { TransactionsStore } from '@/feature-transactions';
import { formatAxisTooltip } from '@/shared/echarts';
import { GranularityPickerComponent } from '@/shared/ui';
import { buildTransactionDrilldownParams } from '@/shared/utils';

/** Income/expense trend, bucketed at its own local granularity control (TICKET-STAT-15). */
@Component({
  selector: 'app-trend-chart-panel',
  imports: [NgxEchartsDirective, GranularityPickerComponent],
  templateUrl: './trend-chart-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendChartPanelComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly router = inject(Router);

  /** Defaults from the current shared date range on first render (TICKET-STAT-15); independent of every other chart's control thereafter. */
  protected readonly granularity = signal<Granularity>(
    pickGranularityForSpan(this.rangeStore.from(), this.rangeStore.to()),
  );

  private readonly trendBuckets = computed(() =>
    computeTrendBuckets(
      this.transactionsStore.transactions(),
      this.rangeStore.from(),
      this.rangeStore.to(),
      this.granularity(),
    ),
  );

  protected readonly chartOption = computed<EChartsCoreOption>(() => {
    const buckets = this.trendBuckets();

    return {
      tooltip: { trigger: 'axis', formatter: formatAxisTooltip },
      legend: { data: ['Income', 'Expense'] },
      grid: { left: 48, right: 48, top: 32, bottom: 24 },
      xAxis: { type: 'category', data: buckets.map((bucket) => bucket.bucketKey) },
      yAxis: [
        { type: 'value', name: 'Cash flow' },
        { type: 'value', name: 'Net worth' },
      ],
      series: [
        { name: 'Income', type: 'bar', data: buckets.map((bucket) => bucket.income) },
        { name: 'Expense', type: 'bar', data: buckets.map((bucket) => -bucket.expense) },
      ],
    };
  });

  protected onChartClick(event: ECElementEvent): void {
    const bucket = this.trendBuckets()[event.dataIndex];
    if (!bucket) return;

    const { start, end } = bucketDateBoundaries(bucket.bucketKey, this.granularity());
    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams({ from: start, to: end }),
    });
  }
}
