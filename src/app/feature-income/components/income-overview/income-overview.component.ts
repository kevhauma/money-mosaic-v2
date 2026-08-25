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
import type { CategorySeriesEntry } from '@/core/stats';
import {
  bucketedZoomAxisOption,
  formatAxisTooltip,
  legendOption,
  resolveChartAnimation,
  resolveChartCategoricalColors,
  type ChartZoomBounds,
} from '@/shared/echarts';
import {
  ButtonComponent,
  EmptyStateComponent,
  MmModalComponent,
  PageHeaderComponent,
  PaperComponent,
  PrivacyToggleComponent,
} from '@/shared/ui';
import { formatCurrency, HIDDEN_AMOUNT_TEXT } from '@/shared/utils';
import { AppSettingsStore, chartSeriesFilter, chartZoomControl } from '@/core/state';
import { IncomeStore } from '../../income.store';
import { IncomeEventsSidebarComponent } from '../income-events-sidebar/income-events-sidebar.component';
import { IncomeLumpSumChecklistComponent } from '../income-lump-sum-checklist/income-lump-sum-checklist.component';
import { IncomeInferenceNoteComponent } from '../income-inference-note/income-inference-note.component';
import { IncomeMainCategoryComponent } from '../income-main-category/income-main-category.component';
import { IncomeGrossNetSectionComponent } from '../income-gross-net-section/income-gross-net-section.component';
import { IncomeGrowthPanelComponent } from '../income-growth-panel/income-growth-panel.component';
import { IncomeYearlyPanelComponent } from '../income-yearly-panel/income-yearly-panel.component';
import { SalaryMonthModalComponent } from '../salary-month-modal/salary-month-modal.component';
import { monthLabel } from '../../salary-metadata-rows';

export type IncomeTrendAccessibleRow = { bucketKey: string; total: string };

/** The Income page's own getting-started guide (TICKET-PUB-07). Linked from the header; since
 * TICKET-INC-23 it is never rendered as a gate in front of the page. */
const INCOME_GUIDE_SLUG = 'getting-started-with-the-income-page';

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
  zoomWindow: ChartZoomBounds,
  hiddenSeries: readonly string[] = [],
): EChartsCoreOption => {
  // Top strip with the grid grown to clear it (TICKET-STAT-26); the bottom edge here belongs to
  // the `dataZoom` slider.
  //
  // fallow-ignore-next-line code-duplication
  // Reason: the 13 lines this shares with `buildColumnChartOption` are the categorical-chart
  // prologue every builder has had since TICKET-UI-13 — animation, palette, axis tooltip — plus the
  // one `legendOption` call this ticket introduced. Collapsing them would mean one shared builder
  // owning both the Dashboard's stacked bars and this page's stacked areas, which couples two
  // features' charts to remove six lines. The geometry that actually caused bugs (legend placement,
  // grid offset, zoom shell) already lives in `shared/echarts`.
  const { legend, gridOffset } = legendOption(
    series.map((entry) => entry.name),
    'top',
    hiddenSeries,
  );

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    tooltip: { trigger: 'axis', formatter: formatAxisTooltip },
    legend,
    ...bucketedZoomAxisOption(bucketKeys, zoomWindow, gridOffset),
    series: series.map((entry) => ({
      name: entry.name,
      type: 'line',
      stack: 'income',
      areaStyle: {},
      color: entry.color,
      data: entry.values,
    })),
  };
};

/**
 * The `/income` page container (FR-INC-1, TICKET-INC-01), now hosting the income-by-category trend
 * chart (FR-INC-2, TICKET-INC-02) parameterised by the user's category selection (FR-INC-3), plus
 * the yearly view beneath it (`IncomeYearlyPanelComponent`, FR-INC-6) — a sibling panel with its
 * own aggregate rather than a second chart on this class, following the dashboard's
 * `trend-chart-panel` shape. Both read the page-level `IncomeStore.fullHistoryRange`.
 *
 * Series span every account's entire history (`computeFullHistoryRange`), bucketed into calendar
 * months (`INCOME_GRANULARITY`) rather than a user-selectable granularity — see that constant's
 * note. Legend clicks toggle individual categories, and which are off is app state held for the
 * session (TICKET-STAT-27) rather than echarts-internal, so a data change no longer puts them back.
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
    IncomeLumpSumChecklistComponent,
    IncomeInferenceNoteComponent,
    IncomeMainCategoryComponent,
    IncomeGrowthPanelComponent,
    IncomeYearlyPanelComponent,
    MmModalComponent,
    NgIcon,
    NgxEchartsDirective,
    PageHeaderComponent,
    PaperComponent,
    PrivacyToggleComponent,
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
   * The long-form explanation, in the header where the reader can reach it when they want it
   * (TICKET-INC-23). It used to stand in front of the page instead; the words were the same, and
   * ~500 of them before any content is a gate rather than help.
   */
  protected readonly fullGuideLink = `/help/${INCOME_GUIDE_SLUG}`;

  /**
   * The two assumptions the trend chart above is drawn under (TICKET-INC-23), each stated beside the
   * chart they shape and corrigible there. Both were steps in the setup wall this replaced.
   */
  protected readonly lumpSumNote = computed(() => {
    const smoothedIds = this.incomeStore.smoothedBonusCategoryIds();
    const smoothed = this.incomeStore
      .countedIncomeCategories()
      .filter((category) => category.id != null && smoothedIds.has(category.id));
    if (smoothed.length === 0) {
      return 'No category is treated as an annual lump sum, so a 13th month or holiday pay draws as one tall month rather than being spread across its year.';
    }
    const names = smoothed.map((category) => category.name).join(', ');
    return `Spread across their year, so they do not draw as a spike: ${names}.`;
  });

  protected readonly mainIncomeCategoryNote = computed(() => {
    const mainId = this.incomeStore.mainIncomeCategoryId();
    const name = this.incomeStore
      .countedIncomeCategories()
      .find((category) => category.id === mainId)?.name;
    return name
      ? `A bonus you record on a month's salary details comes off ${name}.`
      : 'No main income category set, so a bonus recorded on a month’s salary details is taken off every category that paid you that month, in proportion.';
  });

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

  private readonly seriesFilter = chartSeriesFilter(
    'income-by-category',
    computed(() => this.trend().series.map((entry) => entry.name)),
  );
  protected readonly onLegendSelectChanged = this.seriesFilter.onLegendSelectChanged;

  private readonly zoomControl = chartZoomControl('income-by-category');
  protected readonly onDataZoom = this.zoomControl.onDataZoom;

  /**
   * Every bucket, always — see the class doc — unless the user has narrowed it by hand on the
   * slider, which is kept for the session (TICKET-STAT-27) instead of snapping back on the next
   * rebuild.
   */
  private readonly zoomWindow = computed<ChartZoomBounds>(
    () =>
      this.zoomControl.manual() ?? {
        startValue: 0,
        endValue: Math.max(0, this.trend().bucketKeys.length - 1),
      },
  );

  protected readonly chartOption = computed<EChartsCoreOption>(() => {
    const { bucketKeys, series } = this.trend();
    return buildIncomeTrendChartOption(
      bucketKeys,
      series,
      this.zoomWindow(),
      this.seriesFilter.hidden(),
    );
  });

  /**
   * Mirrors the chart's underlying figures into DOM text for assistive tech (same treatment as the
   * dashboard's trend panel, TICKET-STAT-20) — sourced from the same `trend()` signal the chart
   * renders, so it can never diverge.
   *
   * Withholds the total while privacy mode is on rather than blurring it (TICKET-STAT-29's rule,
   * applied here by TICKET-PRIV-02): this table is `sr-only`, so a CSS blur paints nothing over it
   * and a screen reader would read the real figure straight out of a "hidden" page. The month stays.
   */
  protected readonly accessibleRows = computed<IncomeTrendAccessibleRow[]>(() => {
    const { bucketKeys, series } = this.trend();
    const privacyMode = this.appSettingsStore.privacyModeEnabled();
    return bucketKeys.map((bucketKey, index) => ({
      bucketKey,
      total: privacyMode
        ? HIDDEN_AMOUNT_TEXT
        : formatCurrency(series.reduce((sum, entry) => sum + entry.values[index], 0)),
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
