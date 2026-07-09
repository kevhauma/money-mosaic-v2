import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import {
  computeAccountBalanceTrends,
  computeFullHistoryRange,
  computeZoomWindow,
  RangeStore,
  type AccountBalanceSeries,
  type ChartZoomWindow,
  type JointLegContext,
} from '@/core/stats';
import { CategoriesStore } from '@/feature-categories';
import { TransactionsStore, TransfersStore } from '@/feature-transactions';
import { AccountsStore } from '../../accounts.store';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildNetWorthHistoryChartOption = (
  accounts: Account[],
  series: AccountBalanceSeries[],
  zoomWindow: ChartZoomWindow,
): EChartsCoreOption => {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const bucketKeys = series[0]?.points.map((point) => point.bucketKey) ?? [];

  return {
    tooltip: { trigger: 'axis' },
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
 * net worth over the full history of every active account. The topbar's grouping control drives
 * this chart's bucket granularity too, and the topbar's date range scrubs the initial zoom window
 * (via `dataZoom`) rather than shrinking the series data (TICKET-STAT-03), so zooming out is
 * always available without a manual preset change. Legend clicks toggle individual bands (native
 * echarts behaviour).
 */
@Component({
  selector: 'app-net-worth-history-chart',
  imports: [NgxEchartsDirective],
  templateUrl: './net-worth-history-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetWorthHistoryChartComponent {
  private readonly accountsStore = inject(AccountsStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly transfersStore = inject(TransfersStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly router = inject(Router);

  protected readonly accounts = computed(() => this.accountsStore.activeAccounts());

  private readonly range = computed(() =>
    computeFullHistoryRange(this.accounts(), this.transactionsStore.transactions(), todayIso()),
  );

  private readonly granularity = computed(() => this.rangeStore.groupBy());

  // Cross-account lookups a joint account's stake needs (TICKET-STAT-03) — `accountsById` spans
  // every account (not just the active ones charted here) so a linked transfer's other leg always
  // resolves, even to an archived account.
  private readonly jointLegContext = computed((): JointLegContext => ({
    transactionsById: new Map(this.transactionsStore.transactions().map((t) => [t.id!, t])),
    accountsById: this.accountsStore.accountsById(),
    transfersById: this.transfersStore.transferByTransactionId(),
    categoriesById: this.categoriesStore.categoriesById(),
  }));

  protected readonly series = computed(() =>
    computeAccountBalanceTrends(
      this.transactionsStore.transactions(),
      this.accounts(),
      this.range().from,
      this.range().to,
      this.granularity(),
      this.jointLegContext(),
    ),
  );

  private readonly zoomWindow = computed(() =>
    computeZoomWindow(
      this.series()[0]?.points.map((point) => point.bucketKey) ?? [],
      this.rangeStore.from(),
      this.rangeStore.to(),
      this.granularity(),
    ),
  );

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
