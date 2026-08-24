import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  computeCategoryCycleHeatmap,
  type CategoryCycleHeatmap,
  type HeatmapCell,
  type HeatmapRow,
} from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { CategoryExclusionDropdownComponent } from '../category-exclusion-dropdown/category-exclusion-dropdown.component';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  chartCycle,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import {
  resolveChartAnimation,
  resolveChartPlotMode,
  resolveHeatmapCellColor,
  resolveHeatmapTotalsColor,
  type ChartPlotMode,
  type HeatmapAmountScale,
} from '@/shared/echarts';
import {
  CyclePickerComponent,
  FlexComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  cycleColumnLabels,
  cyclesForRange,
  formatCurrency,
  HIDDEN_AMOUNT_TEXT,
  type CycleKey,
} from '@/shared/utils';

export type HeatmapAccessibleRow = { name: string; amounts: string[] };

/** What one column *is*, per cycle — for the "this range only covers 3 of 12 months" note (TICKET-STAT-30). */
const CYCLE_COLUMN_NOUNS: Record<CycleKey, string> = {
  'day-of-week': 'days of the week',
  'day-of-month': 'days of the month',
  'month-of-year': 'months',
  'quarter-of-year': 'quarters',
};

/** The same vocabulary in the singular, for prose that names the axis (heading, chart label, table caption). */
const CYCLE_AXIS_NOUNS: Record<CycleKey, string> = {
  'day-of-week': 'day of the week',
  'day-of-month': 'day of the month',
  'month-of-year': 'month',
  'quarter-of-year': 'quarter',
};

/**
 * What the shading means, in place of the amount scale the panel used to draw (TICKET-STAT-34).
 *
 * States the grid's rule at exactly the level it is true (TICKET-STAT-43). Every category row is
 * read against one pooled scale, so *depth* is comparable across rows — but the anchor colour is
 * still the category's own, so the sentence says "how deep", not "which shade": a pale-yellow cell
 * and a dark-blue one at the same ramp position are the same amount, and claiming they look alike
 * would mislead in the other direction. The `All` strip is named as what it is — a column summary
 * above the grid — rather than as a row exempt from the grid's scale, which is how the caption read
 * while the panel still coloured each row on its own extent.
 */
const HEATMAP_SHADING_CAPTION =
  'Every category is read against one scale for the whole grid — within a colour, deeper means more spend, and the same depth means the same amount in any row. The All strip above totals each column, on its own scale.';

/**
 * One row's amounts, left to right. `cells` is dense and row-major (`buildGrid` fills every
 * position), so a row is a direct slice — no per-cell search. The chart's colour scales and the
 * screen-reader table both read a row through here, so the two can't slice it differently.
 */
const rowAmounts = (
  cells: readonly HeatmapCell[],
  rowIndex: number,
  columnCount: number,
): number[] =>
  cells.slice(rowIndex * columnCount, (rowIndex + 1) * columnCount).map((cell) => cell.amount);

/** The extent a set of amounts is coloured against — the pooled grid, or the band alone (TICKET-STAT-34). */
const amountScale = (amounts: readonly number[]): HeatmapAmountScale => ({
  min: Math.min(...amounts),
  max: Math.max(...amounts),
  average: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
});

/**
 * What the totals band is called (TICKET-STAT-33). `All`, not `Total`: the columns are cyclical
 * folds, so the figure is a sum across every Monday in the range, and "total" invites reading it as
 * a period total.
 */
const TOTALS_ROW_NAME = 'All';

/**
 * The band and the categories are drawn as **two grids, one above the other**, not as rows of one
 * grid: it is what buys a margin between them (an echarts category axis spaces its rows evenly, so
 * a single grid can only separate them with a whole empty row) and what lets each carry its own
 * colour scale.
 */
const BAND_SERIES_INDEX = 0;
const CATEGORY_SERIES_INDEX = 1;

/** Room for the y-axis labels. Fixed rather than `containLabel` so both grids' plots start at the same x and the columns line up. */
const AXIS_LABEL_WIDTH = 76;

/** The band's own strip, and the margin under it that separates the two. */
const BAND_HEIGHT = 22;
const BAND_MARGIN = 10;

/**
 * What a click drills down to, or `undefined` when the click landed on nothing.
 *
 * The `All` band sums every category, so it drills down to the range alone — the same thing the
 * `Other` fold already does, for the same reason: the cell stands for several categories.
 */
const drilldownFor = (
  rows: readonly HeatmapRow[],
  seriesIndex: number,
  axisRowIndex: number,
): { categoryId?: number } | undefined => {
  if (seriesIndex === BAND_SERIES_INDEX) return {};
  const row = rows[rows.length - 1 - axisRowIndex];
  return row ? { categoryId: row.categoryId ?? undefined } : undefined;
};

/** The theme-resolved values the option builder needs, kept as inputs so it stays a pure function of its arguments. */
export type HeatmapChartTheme = {
  plotMode: ChartPlotMode;
  /** The anchor the `All` band ramps from — it has no category, so it takes the theme's leading accent. */
  bandColor: string;
};

/**
 * Pure echarts-option builder, kept outside the component so the axis/series mapping is testable
 * without a chart instance or `TestBed` (the `buildColumnChartOption` precedent in
 * `trend-chart-panel.component.ts`).
 *
 * The y-axis is the aggregate's rows **reversed**: echarts draws category index 0 at the bottom,
 * and the heaviest category belongs at the top where the eye starts.
 *
 * Colour is resolved per cell rather than by a `visualMap` (TICKET-STAT-34): each cell is drawn in
 * its own row's category colour, moved along a lightness ramp by how the amount sits against a
 * scale. Keeping the resolution here is what lets the option shape stay flat — one `itemStyle` per
 * data item — instead of one `visualMap` per row.
 *
 * **Two scales, not one per row.** Every category row shares one scale, pooled over the whole grid,
 * so a cell's shade means the same thing in every row and the rows can be read against each other.
 * The `All` band (TICKET-STAT-33) is the single exception and carries its own: it is 4–5× larger
 * than anything in the grid, and pooling it in would flatten every category cell to the pale end.
 *
 * The two are drawn as **two grids**, the band's strip above the categories' with a margin between
 * them — an echarts category axis spaces its rows evenly, so one grid could only separate them with
 * a whole empty row. Both grids take the same fixed `left`, so their columns line up.
 */
export const buildHeatmapChartOption = (
  heatmap: CategoryCycleHeatmap,
  columnLabels: readonly string[],
  theme: HeatmapChartTheme,
  privacyMode: boolean,
): EChartsCoreOption => {
  const { rows, cells, totalsRow } = heatmap;
  const { plotMode, bandColor } = theme;
  const lastRowIndex = rows.length - 1;

  // One scale for every category row, pooled over the whole grid; the band gets its own.
  const categoryScale = amountScale(cells.map((cell) => cell.amount));
  const bandScale = amountScale(totalsRow);

  const axisLabel = { width: AXIS_LABEL_WIDTH - 12, overflow: 'truncate' as const };
  const categoriesTop = 8 + BAND_HEIGHT + BAND_MARGIN;

  return {
    ...resolveChartAnimation(),
    tooltip: {
      position: 'top',
      formatter: (params: { seriesIndex: number; value: [number, number, number] }) => {
        const [columnIndex, axisRowIndex, amount] = params.value;
        const name =
          params.seriesIndex === BAND_SERIES_INDEX
            ? TOTALS_ROW_NAME
            : (rows[lastRowIndex - axisRowIndex]?.name ?? '');
        const heading = `${name} · ${columnLabels[columnIndex] ?? ''}`;
        // Privacy mode keeps the *shape* readable and drops the figure (TICKET-PRIV-01) — the cell
        // colour is a proportion, the tooltip's amount is not.
        return privacyMode ? heading : `${heading}<br/>${formatCurrency(amount)}`;
      },
    },
    grid: [
      { left: AXIS_LABEL_WIDTH, right: 8, top: 8, height: BAND_HEIGHT },
      { left: AXIS_LABEL_WIDTH, right: 8, top: categoriesTop, bottom: 24 },
    ],
    // Required, not decorative: a `heatmap` series on a cartesian grid throws
    // "Heatmap must use with visualMap" and renders *no cells at all* without a `visualMap`
    // targeting it (caught in the browser — an option-shape unit test cannot see it). Every cell's
    // real colour comes from its own `itemStyle` below, which takes precedence over this mapping,
    // so this component is hidden and its range is a formality.
    visualMap: {
      show: false,
      min: 0,
      max: heatmap.maxAmount || 1,
      seriesIndex: [BAND_SERIES_INDEX, CATEGORY_SERIES_INDEX],
    },
    xAxis: [
      // The band shares the categories' columns but not their labels — one set of day names under
      // the whole chart, not two.
      {
        gridIndex: 0,
        type: 'category',
        data: [...columnLabels],
        axisLabel: { show: false },
        axisTick: { show: false },
        splitArea: { show: true },
      },
      { gridIndex: 1, type: 'category', data: [...columnLabels], splitArea: { show: true } },
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'category',
        data: [TOTALS_ROW_NAME],
        axisLabel,
        splitArea: { show: true },
      },
      {
        gridIndex: 1,
        type: 'category',
        // echarts draws category index 0 at the bottom, so the ranking is reversed and the heaviest
        // category sits at the top, nearest the band.
        data: [...rows].reverse().map((row) => row.name),
        axisLabel,
        splitArea: { show: true },
      },
    ],
    series: [
      {
        type: 'heatmap',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: totalsRow.map((amount, columnIndex) => ({
          value: [columnIndex, 0, amount],
          itemStyle: { color: resolveHeatmapCellColor(bandColor, bandScale, amount, plotMode) },
        })),
        label: { show: false },
      },
      {
        type: 'heatmap',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: cells.map((cell) => ({
          value: [cell.columnIndex, lastRowIndex - cell.rowIndex, cell.amount],
          itemStyle: {
            color: resolveHeatmapCellColor(
              rows[cell.rowIndex].color,
              categoryScale,
              cell.amount,
              plotMode,
            ),
          },
        })),
        label: { show: false },
      },
    ],
  };
};

/**
 * Spend per top category per position in a repeating calendar cycle, for the selected range
 * (FR-STAT-15, TICKET-STAT-29; cycle switchable by TICKET-STAT-30) — the cyclical counterpart to
 * the chronological trend chart: every Monday of the range folds into one column, so a "we always
 * eat out on Friday" pattern becomes visible where a timeline scatters it across weeks.
 *
 * Renders nothing when the range holds no spend at all (no rows, or every cell clamped to zero)
 * rather than an all-grey grid, the same self-hiding the weekday/weekend panel does.
 */
@Component({
  selector: 'app-spending-heatmap-panel',
  imports: [
    NgxEchartsDirective,
    CategoryExclusionDropdownComponent,
    CyclePickerComponent,
    FlexComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './spending-heatmap-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingHeatmapPanelComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly router = inject(Router);

  private readonly appSettingsStore = inject(AppSettingsStore);

  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  /**
   * Categories the user has left out (TICKET-STAT-32) — persisted on `appSettings`, and its own
   * list rather than the category comparison panel's: "not worth comparing period-over-period" and
   * "drowning out this heatmap's colour scale" are different judgements about different charts.
   */
  protected readonly excludedCategoryIds = computed(
    () => new Set(this.appSettingsStore.heatmapExcludedCategoryIds() ?? []),
  );

  protected setExcludedCategoryIds(excludedCategoryIds: number[]): void {
    void this.appSettingsStore.setHeatmapExcludedCategoryIds(excludedCategoryIds);
  }

  /**
   * Which cycle the columns fold onto (TICKET-STAT-30), held for the session by `ChartOptionsStore`
   * so navigating away and back keeps the axis the user picked. Seeded — not defaulted per mount —
   * to day-of-week, the axis this panel shipped with.
   */
  private readonly cycleControl = chartCycle('dashboard-heatmap', () => 'day-of-week');
  protected readonly setCycle = this.cycleControl.set;

  /** The cycles this range is long enough to fill (TICKET-STAT-31) — the picker offers only these. */
  protected readonly availableCycles = computed(() =>
    cyclesForRange(this.rangeStore.from('dashboard'), this.rangeStore.to('dashboard')),
  );

  /**
   * What the panel actually draws (TICKET-STAT-31): the stored choice when the current range can
   * fill it, else the longest cycle it can. The stored choice is deliberately left alone rather
   * than corrected — widening the range back restores what the user picked, and a range change
   * should never masquerade as a click on the picker.
   */
  protected readonly cycle = computed<CycleKey>(() => {
    const available = this.availableCycles();
    const stored = this.cycleControl.value();
    return available.includes(stored) ? stored : available[available.length - 1];
  });

  private readonly ownSavingsIbans = computed(() =>
    savingsAccountIbans(this.accountsStore.accounts()),
  );

  protected readonly heatmap = computed(() =>
    computeCategoryCycleHeatmap(
      this.transactionsStore.transactions(),
      this.categoriesStore.categoriesById(),
      this.rangeStore.from('dashboard'),
      this.rangeStore.to('dashboard'),
      this.cycle(),
      this.ownSavingsIbans(),
      this.accountsStore.accountsById(),
      this.excludedCategoryIds(),
    ),
  );

  /**
   * Stated only when the range genuinely can't reach every column — nine empty months on a
   * three-month range are the range's doing, not nine quiet months, and the chart alone can't
   * tell the two apart.
   */
  protected readonly partialCycleNote = computed<string | null>(() => {
    const { columnKeys, coveredColumnCount } = this.heatmap();
    if (coveredColumnCount >= columnKeys.length) return null;
    return `This range only covers ${coveredColumnCount} of ${columnKeys.length} ${CYCLE_COLUMN_NOUNS[this.cycle()]}`;
  });

  /** Nothing to plot: no category cleared the range, or everything in it netted back to zero. */
  protected readonly hasSpend = computed(
    () => this.heatmap().rows.length > 0 && this.heatmap().maxAmount > 0,
  );

  /**
   * The axis' display labels — resolved here, not in the aggregate, so a locale change relabels the
   * axis without re-running a scan over every transaction. The chart option and the screen-reader
   * table both read this one signal, so the two can't disagree.
   */
  protected readonly columnLabels = computed(() => cycleColumnLabels(this.cycle()));

  /** What the colours mean, in place of the amount scale this panel stopped drawing (TICKET-STAT-34, TICKET-STAT-43). */
  protected readonly shadingCaption = HEATMAP_SHADING_CAPTION;

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildHeatmapChartOption(
      this.heatmap(),
      this.columnLabels(),
      { plotMode: resolveChartPlotMode(), bandColor: resolveHeatmapTotalsColor() },
      this.privacyMode(),
    ),
  );

  /** Names the axis the user actually picked, so switching cycle re-states the chart to a screen reader too. */
  protected readonly axisNoun = computed(() => CYCLE_AXIS_NOUNS[this.cycle()]);

  protected readonly chartAriaLabel = computed(
    () =>
      `Spending by category and ${this.axisNoun()}, ${this.rangeStore.from('dashboard')}–${this.rangeStore.to('dashboard')}; table with values follows`,
  );

  /**
   * The grid's figures as DOM text for assistive tech (TICKET-STAT-20), off the same signal the
   * chart renders so the two can't diverge.
   */
  protected readonly accessibleRows = computed<HeatmapAccessibleRow[]>(() => {
    const { columnKeys, rows, cells, totalsRow } = this.heatmap();
    const privacyMode = this.privacyMode();
    const columnCount = columnKeys.length;

    // Privacy mode has to *withhold* the figure here, not blur it: `.sr-only` clips the table to a
    // 1px box, so a CSS blur paints nothing, and a screen reader would read the amount out
    // regardless (TICKET-PRIV-01's intent, caught in convention review).
    const asText = (amount: number): string =>
      privacyMode ? HIDDEN_AMOUNT_TEXT : formatCurrency(amount);

    return [
      // The band leads the table for the same reason it leads the chart: it is the summary the
      // category rows underneath break down (TICKET-STAT-33).
      { name: TOTALS_ROW_NAME, amounts: totalsRow.map(asText) },
      ...rows.map((row, rowIndex) => ({
        name: row.name,
        amounts: rowAmounts(cells, rowIndex, columnCount).map(asText),
      })),
    ];
  });

  /**
   * A cell drills down to its category over the panel's range. The *day-of-week* half of the
   * selection is deliberately dropped: the transaction filter has no weekday param (see the
   * ticket's Notes), and inventing one inside a chart ticket would be a Transactions feature in
   * disguise. Which row means which category — including the `Other` fold and TICKET-STAT-33's
   * `All` band, both of which drill down to the range alone — is `drilldownFor`'s business.
   */
  protected onChartClick(event: ECElementEvent): void {
    const value = event.value as [number, number, number] | undefined;
    if (!value) return;

    const drilldown = drilldownFor(this.heatmap().rows, event.seriesIndex ?? -1, value[1]);
    if (!drilldown) return;

    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams({
        from: this.rangeStore.from('dashboard'),
        to: this.rangeStore.to('dashboard'),
        ...drilldown,
      }),
    });
  }
}
