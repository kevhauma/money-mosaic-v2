import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import {
  bucketDateBoundaries,
  computeAccountBalanceTrends,
  computeFullHistoryRange,
  computeZoomWindow,
  pickGranularityForSpan,
  RangeStore,
  type ChartZoomWindow,
  type Granularity,
  type JointLegContext,
  type NetWorthPoint,
} from '@/core/stats';
import { CategoriesStore, TransactionsStore, TransfersStore, AccountsStore } from '@/core/state';
import { formatAxisTooltip } from '@/shared/echarts';
import { GranularityPickerComponent } from '@/shared/ui';
import { buildTransactionDrilldownParams } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Pure echarts-option builder, kept separate from the component so it's testable without TestBed. */
export const buildAccountBalanceChartOption = (
  account: Account,
  points: NetWorthPoint[],
  zoomWindow: ChartZoomWindow,
): EChartsCoreOption => ({
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
 * Full-history balance line for one account (TICKET-STAT-02) — spans opening-balance date/first
 * transaction through today, so the series itself is always the account's entire history. This
 * chart owns its own local granularity control (TICKET-STAT-15), independent of every other
 * chart's, and the topbar's date range scrubs the initial zoom window (via `dataZoom`) rather than
 * shrinking the series data (TICKET-STAT-03), so zooming out is always available without a manual
 * preset change.
 */
@Component({
  selector: 'app-account-balance-chart',
  imports: [NgxEchartsDirective, GranularityPickerComponent],
  templateUrl: './account-balance-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBalanceChartComponent {
  readonly account = input.required<Account>();

  private readonly accountsStore = inject(AccountsStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly transfersStore = inject(TransfersStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly router = inject(Router);

  private readonly range = computed(() =>
    computeFullHistoryRange([this.account()], this.transactionsStore.transactions(), todayIso()),
  );

  /** Defaults from the current shared date range on first render (TICKET-STAT-15); independent of every other chart's control thereafter. */
  protected readonly granularity = signal<Granularity>(
    pickGranularityForSpan(this.rangeStore.from(), this.rangeStore.to()),
  );

  // Cross-account lookups a joint account's stake needs (TICKET-STAT-03) — `accountsById` spans
  // every account so a linked transfer's other leg always resolves, even outside this one account.
  private readonly jointLegContext = computed((): JointLegContext => ({
    transactionsById: new Map(this.transactionsStore.transactions().map((t) => [t.id!, t])),
    accountsById: this.accountsStore.accountsById(),
    transfersById: this.transfersStore.transferByTransactionId(),
    categoriesById: this.categoriesStore.categoriesById(),
  }));

  protected readonly points = computed(
    () =>
      computeAccountBalanceTrends(
        this.transactionsStore.transactions(),
        [this.account()],
        this.range().from,
        this.range().to,
        this.granularity(),
        this.jointLegContext(),
      )[0]?.points ?? [],
  );

  private readonly zoomWindow = computed(() =>
    computeZoomWindow(
      this.points().map((point) => point.bucketKey),
      this.rangeStore.from(),
      this.rangeStore.to(),
      this.granularity(),
    ),
  );

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
