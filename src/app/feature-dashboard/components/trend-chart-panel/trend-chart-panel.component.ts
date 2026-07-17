import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  computeCategoryCompositionTrend,
  pickGranularityForSpan,
  RangeStore,
  type CategorySeriesEntry,
} from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { AccountsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import {
  CHART_ANIMATION,
  formatAxisTooltip,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import {
  FlexComponent,
  GranularityPickerComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  bucketDateBoundaries,
  buildTransactionDrilldownParams,
  formatCurrency,
  type Granularity,
  UNCATEGORISED_SENTINEL,
} from '@/shared/utils';

/** Every series' value at one bucket index, summed — the stacked-bar total for that bucket. */
const bucketTotal = (series: CategorySeriesEntry[], bucketIndex: number): number =>
  series.reduce((sum, entry) => sum + entry.values[bucketIndex], 0);

/** Highest per-bucket stacked total across a column's series — the shared y-axis scale is the larger of the two columns' values. */
const highestStackedTotal = (bucketKeys: string[], series: CategorySeriesEntry[]): number => {
  let max = 0;
  for (let i = 0; i < bucketKeys.length; i++) {
    const total = bucketTotal(series, i);
    if (total > max) max = total;
  }
  return max;
};

export type TrendAccessibleRow = { bucketKey: string; income: string; expense: string };

/** Pure echarts-option builder for one stacked-bar column, kept separate from the component so it's testable without TestBed. */
const buildColumnChartOption = (
  bucketKeys: string[],
  series: CategorySeriesEntry[],
  stackName: 'income' | 'expense',
  sharedMax: number,
): EChartsCoreOption => ({
  ...CHART_ANIMATION,
  color: resolveChartCategoricalColors(),
  tooltip: { trigger: 'axis', formatter: formatAxisTooltip },
  legend: { data: series.map((entry) => entry.name) },
  grid: { left: 48, right: 24, top: 32, bottom: 24 },
  xAxis: { type: 'category', data: bucketKeys },
  yAxis: { type: 'value', max: sharedMax > 0 ? sharedMax : undefined },
  series: series.map((entry) => ({
    name: entry.name,
    type: 'bar',
    stack: stackName,
    itemStyle: { color: entry.color },
    data: entry.values,
  })),
});

/**
 * Income/expense trend split into two same-scale, category-stacked bar charts (TICKET-STAT-17,
 * FR-STAT-14), bucketed at its own local granularity control (TICKET-STAT-15). Reuses
 * `computeCategoryCompositionTrend()` for both columns from a single call, so the shared
 * granularity control drives both charts at once.
 */
@Component({
  selector: 'app-trend-chart-panel',
  imports: [
    NgxEchartsDirective,
    FlexComponent,
    GranularityPickerComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './trend-chart-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendChartPanelComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly router = inject(Router);

  /** Defaults from the current shared date range on first render (TICKET-STAT-15); independent of every other chart's control thereafter. */
  protected readonly granularity = signal<Granularity>(
    pickGranularityForSpan(this.rangeStore.from(), this.rangeStore.to()),
  );

  private readonly ownSavingsIbans = computed(() =>
    savingsAccountIbans(this.accountsStore.accounts()),
  );

  private readonly composition = computed(() =>
    computeCategoryCompositionTrend(
      this.transactionsStore.transactions(),
      this.categoriesStore.categoriesById(),
      this.rangeStore.from(),
      this.rangeStore.to(),
      this.granularity(),
      this.ownSavingsIbans(),
      this.accountsStore.accountsById(),
    ),
  );

  private readonly sharedYAxisMax = computed(() => {
    const { bucketKeys, expenseSeries, incomeSeries } = this.composition();
    return Math.max(
      highestStackedTotal(bucketKeys, expenseSeries),
      highestStackedTotal(bucketKeys, incomeSeries),
    );
  });

  protected readonly incomeChartOption = computed<EChartsCoreOption>(() => {
    const { bucketKeys, incomeSeries } = this.composition();
    return buildColumnChartOption(bucketKeys, incomeSeries, 'income', this.sharedYAxisMax());
  });

  protected readonly expenseChartOption = computed<EChartsCoreOption>(() => {
    const { bucketKeys, expenseSeries } = this.composition();
    return buildColumnChartOption(bucketKeys, expenseSeries, 'expense', this.sharedYAxisMax());
  });

  /**
   * Mirrors the two charts' underlying figures into DOM text for assistive tech (TICKET-STAT-20) —
   * sourced from the same `composition()` signal the charts render, so it can never diverge.
   * Rendered as a visually-hidden table; the canvas hosts get a `role="img"` summary pointing at it.
   */
  protected readonly accessibleRows = computed<TrendAccessibleRow[]>(() => {
    const { bucketKeys, incomeSeries, expenseSeries } = this.composition();
    return bucketKeys.map((bucketKey, i) => ({
      bucketKey,
      income: formatCurrency(bucketTotal(incomeSeries, i)),
      expense: formatCurrency(bucketTotal(expenseSeries, i)),
    }));
  });

  private readonly rangeLabel = computed(
    () => `${this.granularity()}, ${this.rangeStore.from()}–${this.rangeStore.to()}`,
  );

  protected readonly incomeChartAriaLabel = computed(
    () => `Income trend by category, ${this.rangeLabel()}; table with values follows`,
  );

  protected readonly expenseChartAriaLabel = computed(
    () => `Expense trend by category, ${this.rangeLabel()}; table with values follows`,
  );

  protected onIncomeChartClick(event: ECElementEvent): void {
    this.navigateToSegment(event, this.composition().incomeSeries);
  }

  protected onExpenseChartClick(event: ECElementEvent): void {
    this.navigateToSegment(event, this.composition().expenseSeries);
  }

  private navigateToSegment(event: ECElementEvent, series: CategorySeriesEntry[]): void {
    if (event.seriesIndex == null) return;
    const category = series[event.seriesIndex];
    const bucketKey = this.composition().bucketKeys[event.dataIndex];
    if (!category || !bucketKey) return;

    const { start, end } = bucketDateBoundaries(bucketKey, this.granularity());
    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams({
        from: start,
        to: end,
        categoryId: category.categoryId ?? UNCATEGORISED_SENTINEL,
      }),
    });
  }
}
