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
  type HeatmapRowScale,
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
  type CycleKey,
} from '@/shared/utils';

export type HeatmapAccessibleRow = { name: string; amounts: string[] };

/** What the screen-reader table says in place of an amount while privacy mode is on. */
const HIDDEN_AMOUNT = 'hidden';

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
 * What the shading means, now that no single scale can be drawn under the chart (TICKET-STAT-34) —
 * every row has its own, so one colour no longer maps to one amount anywhere in the grid.
 */
const HEATMAP_SHADING_CAPTION =
  'Shading is relative to each category’s own average — heavier spend stands out more';

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

/** A row's own extent, the scale its cells are coloured against (TICKET-STAT-34). */
const rowScale = (amounts: readonly number[]): HeatmapRowScale => ({
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
 * Where the band sits on the reversed y-axis: above every category row, with one **empty** axis
 * category between them (`rowCount`) as the visible gap. Nothing plots on the spacer, so it reads
 * as a divider and can't be clicked — and the band reads as a summary rather than as a fifth
 * category competing with the others.
 */
const totalsBandAxisIndex = (rowCount: number): number => rowCount + 1;

/**
 * What a click on axis row `axisRowIndex` drills down to, or `undefined` when it landed on the
 * empty spacer between the band and the categories, which stands for nothing.
 *
 * The `All` band sums every category, so it drills down to the range alone — the same thing the
 * `Other` fold already does, for the same reason: the cell stands for several categories.
 */
const drilldownFor = (
  rows: readonly HeatmapRow[],
  axisRowIndex: number,
): { categoryId?: number } | undefined => {
  if (axisRowIndex === totalsBandAxisIndex(rows.length)) return {};
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
 * Colour is resolved per cell rather than by a `visualMap` (TICKET-STAT-34): a `visualMap` maps one
 * scale across a whole series, and every row here is read against its own min/average/max in its
 * own category's colour. Keeping the resolution in the option builder is what lets the option shape
 * stay flat — one series, one `itemStyle` per data item — instead of one `visualMap` per row.
 *
 * The `All` band (TICKET-STAT-33) rides on exactly that machinery: it is one more set of cells on
 * one more axis row, scaled against **its own** extent. Sharing the categories' scale would set
 * every category cell against a number 4–5× larger than anything it contains and flatten the whole
 * grid to the pale end, which is the opposite of what the band is for.
 */
export const buildHeatmapChartOption = (
  heatmap: CategoryCycleHeatmap,
  columnLabels: readonly string[],
  theme: HeatmapChartTheme,
  privacyMode: boolean,
): EChartsCoreOption => {
  const { columnKeys, rows, cells, totalsRow } = heatmap;
  const { plotMode, bandColor } = theme;
  const lastRowIndex = rows.length - 1;
  const columnCount = columnKeys.length;

  const scales = rows.map((_, rowIndex) => rowScale(rowAmounts(cells, rowIndex, columnCount)));
  const bandAxisIndex = totalsBandAxisIndex(rows.length);
  const bandScale = rowScale(totalsRow);

  return {
    ...resolveChartAnimation(),
    tooltip: {
      position: 'top',
      formatter: (params: { value: [number, number, number] }) => {
        const [columnIndex, axisRowIndex, amount] = params.value;
        const name =
          axisRowIndex === bandAxisIndex
            ? TOTALS_ROW_NAME
            : (rows[lastRowIndex - axisRowIndex]?.name ?? '');
        const heading = `${name} · ${columnLabels[columnIndex] ?? ''}`;
        // Privacy mode keeps the *shape* readable and drops the figure (TICKET-PRIV-01) — the cell
        // colour is a proportion, the tooltip's amount is not.
        return privacyMode ? heading : `${heading}<br/>${formatCurrency(amount)}`;
      },
    },
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: [...columnLabels],
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      // Bottom to top: the categories reversed (echarts draws index 0 at the bottom), then the
      // empty spacer, then the band on top where the eye starts.
      data: [...[...rows].reverse().map((row) => row.name), '', TOTALS_ROW_NAME],
      splitArea: { show: true },
    },
    series: [
      {
        type: 'heatmap',
        data: [
          ...cells.map((cell) => ({
            value: [cell.columnIndex, lastRowIndex - cell.rowIndex, cell.amount],
            itemStyle: {
              color: resolveHeatmapCellColor(
                rows[cell.rowIndex].color,
                scales[cell.rowIndex],
                cell.amount,
                plotMode,
              ),
            },
          })),
          ...totalsRow.map((amount, columnIndex) => ({
            value: [columnIndex, bandAxisIndex, amount],
            itemStyle: {
              color: resolveHeatmapCellColor(bandColor, bandScale, amount, plotMode),
            },
          })),
        ],
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

  /** What the colours mean, in place of the amount scale a per-row ramp can no longer draw (TICKET-STAT-34). */
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
      privacyMode ? HIDDEN_AMOUNT : formatCurrency(amount);

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

    const drilldown = drilldownFor(this.heatmap().rows, value[1]);
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
