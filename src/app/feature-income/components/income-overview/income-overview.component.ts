import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerTrendingUp } from '@ng-icons/tabler-icons';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  computeIncomeCategorySeries,
  type CategorySeriesEntry,
  type ChartZoomWindow,
} from '@/core/stats';
import { AccountsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { savingsAccountIbans } from '@/core/transfers';
import {
  bucketedZoomAxisOption,
  formatAxisTooltip,
  resolveChartAnimation,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import {
  EmptyStateComponent,
  FlexComponent,
  PageHeaderComponent,
  PaperComponent,
} from '@/shared/ui';
import { formatCurrency, type Granularity } from '@/shared/utils';
import { IncomeStore } from '../../income.store';
import { IncomeCareerStartComponent } from '../income-career-start/income-career-start.component';
import { IncomeCategoryFilterComponent } from '../income-category-filter/income-category-filter.component';
import { IncomeYearlyPanelComponent } from '../income-yearly-panel/income-yearly-panel.component';

/**
 * The whole Income page buckets by calendar month — deliberately fixed rather than a per-chart
 * `mm-granularity-picker` (TICKET-INC-02 divergence, see that ticket's amended criterion). Income
 * is a monthly-cadence concept everywhere else in v1.6: FR-INC-05's growth rate is
 * period-over-period and year-over-year, FR-INC-04 smooths an annual lump sum *across months*, and
 * FR-INC-10's gross wage entries are literally keyed `yearMonth: 'YYYY-MM'`. A day- or week-bucketed
 * income series shows one spike per payday and nothing else, so the control offered four settings
 * that made the page harder to read and one that didn't.
 */
const INCOME_GRANULARITY: Granularity = 'month';

export type IncomeTrendAccessibleRow = { bucketKey: string; total: string };

/**
 * Pure echarts-option builder for the income-by-category trend, kept separate from the component
 * so it's testable without TestBed. One stacked area per selected income category, coloured by the
 * category's own colour (the top-level theme palette only covers a category with no colour set).
 * The caller supplies the initial `dataZoom` window; the series it's given are never cut down to
 * it, so zooming/scrolling out always has data to reach.
 */
export const buildIncomeTrendChartOption = (
  bucketKeys: string[],
  series: CategorySeriesEntry[],
  zoomWindow: ChartZoomWindow,
): EChartsCoreOption => ({
  ...resolveChartAnimation(),
  color: resolveChartCategoricalColors(),
  tooltip: { trigger: 'axis', formatter: formatAxisTooltip },
  legend: { data: series.map((entry) => entry.name) },
  ...bucketedZoomAxisOption(bucketKeys, zoomWindow),
  series: series.map((entry) => ({
    name: entry.name,
    type: 'line',
    stack: 'income',
    areaStyle: {},
    color: entry.color,
    data: entry.values,
  })),
});

/**
 * The `/income` page container (FR-INC-1, TICKET-INC-01), now hosting the income-by-category trend
 * chart (FR-INC-2, TICKET-INC-02) parameterised by the user's category selection (FR-INC-3), plus
 * the yearly view beneath it (`IncomeYearlyPanelComponent`, FR-INC-6) — a sibling panel with its
 * own aggregate rather than a second chart on this class, following the dashboard's
 * `trend-chart-panel` shape. Both read the page-level `IncomeStore.fullHistoryRange`.
 *
 * Series span every account's entire history (`computeFullHistoryRange`), bucketed into calendar
 * months (`INCOME_GRANULARITY`) rather than a user-selectable granularity — see that constant's
 * note. Legend clicks toggle individual categories (native echarts behaviour, no extra code).
 *
 * Unlike the account charts, this page **does not** let the topbar's date range scrub the zoom
 * window (`computeZoomWindow`, TICKET-STAT-03): it always opens on its full monthly history, and
 * the `dataZoom` slider is there for the user to narrow it by hand. Deliberate divergence, decided
 * during TICKET-INC-02 review — once buckets are monthly, the default `this-month` preset resolves
 * to a *single* bucket, so honouring the topbar would open the page's headline trend chart on one
 * dot. A growth trend is only meaningful across many periods, which is exactly the range the topbar
 * is most often narrower than.
 */
@Component({
  selector: 'app-income-overview',
  imports: [
    EmptyStateComponent,
    FlexComponent,
    IncomeCareerStartComponent,
    IncomeCategoryFilterComponent,
    IncomeYearlyPanelComponent,
    NgIcon,
    NgxEchartsDirective,
    PageHeaderComponent,
    PaperComponent,
  ],
  templateUrl: './income-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerTrendingUp })],
})
export class IncomeOverviewComponent {
  private readonly accountsStore = inject(AccountsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly incomeStore = inject(IncomeStore);

  protected readonly hasSelectedCategories = computed(
    () => this.incomeStore.selectedIncomeCategoryIds().size > 0,
  );

  /** The career-start-clamped span (FR-INC-12), which is the full data history until the user sets a date. */
  private readonly range = this.incomeStore.incomeRange;

  private readonly trend = computed(() =>
    computeIncomeCategorySeries(
      this.transactionsStore.transactions(),
      this.categoriesStore.categoriesById(),
      this.incomeStore.selectedIncomeCategoryIds(),
      this.range().from,
      this.range().to,
      INCOME_GRANULARITY,
      savingsAccountIbans(this.accountsStore.accounts()),
      this.accountsStore.accountsById(),
    ),
  );

  /** Every bucket, always — see the class doc. The slider still lets the user narrow it by hand. */
  private readonly zoomWindow = computed<ChartZoomWindow>(() => ({
    startValue: 0,
    endValue: Math.max(0, this.trend().bucketKeys.length - 1),
  }));

  protected readonly chartOption = computed<EChartsCoreOption>(() => {
    const { bucketKeys, series } = this.trend();
    return buildIncomeTrendChartOption(bucketKeys, series, this.zoomWindow());
  });

  /**
   * Mirrors the chart's underlying figures into DOM text for assistive tech (same treatment as the
   * dashboard's trend panel, TICKET-STAT-20) — sourced from the same `trend()` signal the chart
   * renders, so it can never diverge.
   */
  protected readonly accessibleRows = computed<IncomeTrendAccessibleRow[]>(() => {
    const { bucketKeys, series } = this.trend();
    return bucketKeys.map((bucketKey, index) => ({
      bucketKey,
      total: formatCurrency(series.reduce((sum, entry) => sum + entry.values[index], 0)),
    }));
  });

  protected readonly chartAriaLabel = computed(
    () =>
      `Income by category, monthly, ${this.range().from}–${this.range().to}; table with values follows`,
  );
}
