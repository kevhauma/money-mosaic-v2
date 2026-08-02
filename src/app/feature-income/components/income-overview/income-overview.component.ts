import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerAdjustments,
  tablerHelpCircle,
  tablerReceipt2,
  tablerTrendingUp,
} from '@ng-icons/tabler-icons';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { CategorySeriesEntry, ChartZoomWindow } from '@/core/stats';
import {
  bucketedZoomAxisOption,
  formatAxisTooltip,
  resolveChartAnimation,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import {
  ButtonComponent,
  EmptyStateComponent,
  MmModalComponent,
  PageHeaderComponent,
  PaperComponent,
} from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { AppSettingsStore } from '@/core/state';
import { GUIDES } from '@/feature-help';
import { IncomeStore } from '../../income.store';
import { IncomeEventsSidebarComponent } from '../income-events-sidebar/income-events-sidebar.component';
import { IncomeIntroComponent, INCOME_GUIDE_SLUG } from '../income-intro/income-intro.component';
import { IncomeGrossNetSectionComponent } from '../income-gross-net-section/income-gross-net-section.component';
import { IncomeGrowthPanelComponent } from '../income-growth-panel/income-growth-panel.component';
import { IncomeYearlyPanelComponent } from '../income-yearly-panel/income-yearly-panel.component';
import { SalaryMonthModalComponent } from '../salary-month-modal/salary-month-modal.component';
import { monthLabel } from '../../salary-metadata-rows';

export type IncomeTrendAccessibleRow = { bucketKey: string; total: string };

/**
 * The `YYYY-MM` bucket an echarts click landed on, or `undefined` when the event carries no usable
 * index (a click on the legend or on empty canvas). Pure, so the `dataIndex` → bucket resolution
 * TICKET-INC-10 relies on is testable without a chart instance.
 */
export const bucketKeyForChartClick = (
  event: Pick<ECElementEvent, 'dataIndex'>,
  bucketKeys: string[],
): string | undefined => bucketKeys[event.dataIndex];

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
 * Unlike the account charts, this page **does not** let any page's date range scrub the zoom
 * window (`computeZoomWindow`, TICKET-STAT-03): it always opens on its full monthly history, and
 * the `dataZoom` slider is there for the user to narrow it by hand. Deliberate divergence, decided
 * during TICKET-INC-02 review — once buckets are monthly, the default `this-month` preset resolves
 * to a *single* bucket, so honouring such a range would open the page's headline trend chart on one
 * dot. A growth trend is only meaningful across many periods, which is exactly the range a picker
 * is most often narrower than.
 */
@Component({
  selector: 'app-income-overview',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    IncomeEventsSidebarComponent,
    IncomeGrossNetSectionComponent,
    IncomeIntroComponent,
    IncomeGrowthPanelComponent,
    IncomeYearlyPanelComponent,
    MmModalComponent,
    NgIcon,
    NgxEchartsDirective,
    PageHeaderComponent,
    PaperComponent,
    SalaryMonthModalComponent,
  ],
  templateUrl: './income-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({ tablerAdjustments, tablerHelpCircle, tablerReceipt2, tablerTrendingUp }),
  ],
})
export class IncomeOverviewComponent {
  private readonly incomeStore = inject(IncomeStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  /**
   * The first-visit intro replaces the whole page until it's been seen (TICKET-PUB-08) — including
   * the empty state, since an empty Income page is precisely the situation the intro explains and
   * "No income is being counted yet" is a worse first sentence than "here's what this page is".
   *
   * A slug missing from `GUIDES` degrades to the normal page rather than an empty intro: the
   * content is the reason the intro exists, and a blank one would be worse than none.
   */
  protected readonly showIntro = computed(
    () =>
      !(this.appSettingsStore.seenGuideSlugs() ?? []).includes(INCOME_GUIDE_SLUG) &&
      GUIDES.some((guide) => guide.slug === INCOME_GUIDE_SLUG),
  );

  protected readonly fullGuideLink = `/help/${INCOME_GUIDE_SLUG}`;

  protected readonly hasSelectedCategories = computed(
    () => this.incomeStore.selectedIncomeCategoryIds().size > 0,
  );

  /** The career-start-clamped span (FR-INC-12), which is the full data history until the user sets a date. */
  private readonly range = this.incomeStore.incomeRange;

  /**
   * The page's shared monthly series — selection-scoped (FR-INC-3) and lump-sum-smoothed
   * (FR-INC-4). Read off `IncomeStore` rather than recomputed here (TICKET-INC-05), so the growth
   * panel below the chart is reading the very same numbers the chart draws.
   */
  private readonly trend = this.incomeStore.incomeTrend;

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

  /** Whether the one-month salary modal (FR-INC-10, TICKET-INC-18) is showing. */
  protected readonly salaryMonthOpen = signal(false);

  /** The `YYYY-MM` the user clicked; the modal is only ever opened with one. */
  protected readonly salaryMonth = signal<string | undefined>(undefined);

  protected readonly salaryMonthTitle = computed(() => {
    const month = this.salaryMonth();
    return month === undefined ? 'Salary details' : `Salary details — ${monthLabel(month)}`;
  });

  /**
   * The month to mount the modal's fields for, or `undefined` while it's closed — so the template
   * asks one question instead of `open && month`. Mounting only while open is what keeps the fields
   * a fresh snapshot of stored values per opening rather than a form syncing mid-edit.
   */
  protected readonly openSalaryMonth = computed(() =>
    this.salaryMonthOpen() ? this.salaryMonth() : undefined,
  );

  /**
   * Clicking a point on the trend chart opens *that month's* gross and bonus fields (FR-INC-10): a
   * spike the user wants to explain is usually a spike they want to annotate, and it's a one-month
   * question best answered without leaving the chart.
   */
  protected onChartClick(event: ECElementEvent): void {
    const bucketKey = bucketKeyForChartClick(event, this.trend().bucketKeys);
    if (bucketKey === undefined) return;
    this.salaryMonth.set(bucketKey);
    this.salaryMonthOpen.set(true);
  }
}
