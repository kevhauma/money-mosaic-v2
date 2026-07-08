import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import {
  bucketDateBoundaries,
  computeAccountBalanceTrends,
  computeFullHistoryRange,
  pickGranularityForSpan,
  type NetWorthPoint,
} from '@/core/stats';
import { TransactionsStore } from '@/feature-transactions';
import { buildTransactionDrilldownParams } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildAccountBalanceChartOption = (
  account: Account,
  points: NetWorthPoint[],
): EChartsCoreOption => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 56, right: 24, top: 24, bottom: 64 },
  xAxis: { type: 'category', data: points.map((point) => point.bucketKey) },
  yAxis: { type: 'value' },
  dataZoom: [
    { type: 'inside', xAxisIndex: 0 },
    { type: 'slider', xAxisIndex: 0, height: 20, bottom: 8 },
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
 * Full-history balance line for one account (TICKET-STAT-02) — spans opening-balance date/first
 * transaction through today, independent of the topbar's global range/grouping, with its own
 * auto-picked granularity and an x-axis dataZoom to scrub into a sub-window.
 */
@Component({
  selector: 'app-account-balance-chart',
  imports: [NgxEchartsDirective],
  templateUrl: './account-balance-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBalanceChartComponent {
  readonly account = input.required<Account>();

  private readonly transactionsStore = inject(TransactionsStore);
  private readonly router = inject(Router);

  private readonly range = computed(() =>
    computeFullHistoryRange([this.account()], this.transactionsStore.transactions(), todayIso()),
  );

  private readonly granularity = computed(() =>
    pickGranularityForSpan(this.range().from, this.range().to),
  );

  protected readonly points = computed(
    () =>
      computeAccountBalanceTrends(
        this.transactionsStore.transactions(),
        [this.account()],
        this.range().from,
        this.range().to,
        this.granularity(),
      )[0]?.points ?? [],
  );

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildAccountBalanceChartOption(this.account(), this.points()),
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
