import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { computeCategoryCycleHeatmap, type CategoryCycleHeatmap } from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  chartCycle,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import { resolveChartAnimation, resolveChartHeatmapColors } from '@/shared/echarts';
import {
  CyclePickerComponent,
  FlexComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  cycleColumnLabels,
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
 * Pure echarts-option builder, kept outside the component so the axis/series mapping is testable
 * without a chart instance or `TestBed` (the `buildColumnChartOption` precedent in
 * `trend-chart-panel.component.ts`).
 *
 * The y-axis is the aggregate's rows **reversed**: echarts draws category index 0 at the bottom,
 * and the heaviest category belongs at the top where the eye starts.
 */
export const buildHeatmapChartOption = (
  heatmap: CategoryCycleHeatmap,
  columnLabels: readonly string[],
  rampColors: string[],
  privacyMode: boolean,
): EChartsCoreOption => {
  const { rows, cells, maxAmount } = heatmap;
  const lastRowIndex = rows.length - 1;

  return {
    ...resolveChartAnimation(),
    tooltip: {
      position: 'top',
      formatter: (params: { value: [number, number, number] }) => {
        const [columnIndex, axisRowIndex, amount] = params.value;
        const heading = `${rows[lastRowIndex - axisRowIndex]?.name ?? ''} · ${columnLabels[columnIndex] ?? ''}`;
        // Privacy mode keeps the *shape* readable and drops the figure (TICKET-PRIV-01) — the cell
        // colour is a proportion, the tooltip's amount is not.
        return privacyMode ? heading : `${heading}<br/>${formatCurrency(amount)}`;
      },
    },
    // The scale sits under the axis labels, so the grid has to give up the room it occupies —
    // without it echarts draws the bar past the canvas edge and clips it (seen in the browser check).
    grid: { left: 8, right: 8, top: 8, bottom: privacyMode ? 8 : 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: [...columnLabels],
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: [...rows].reverse().map((row) => row.name),
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: maxAmount,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 2,
      // Horizontal orientation swaps the two: `itemHeight` is the bar's length, `itemWidth` its thickness.
      itemHeight: 120,
      itemWidth: 10,
      textStyle: { fontSize: 10 },
      // Stated as end labels rather than left to the default numeric ones, so the scale reads in
      // the user's own currency format — `[high, low]`, which horizontal orientation draws right-to-left.
      text: [formatCurrency(maxAmount), formatCurrency(0)],
      inRange: { color: rampColors },
      // The scale's own labels are amounts, so it goes away entirely with privacy mode on; the
      // colours it drives stay applied either way.
      show: !privacyMode,
      formatter: (value: number) => formatCurrency(value),
    },
    series: [
      {
        type: 'heatmap',
        data: cells.map((cell) => [cell.columnIndex, lastRowIndex - cell.rowIndex, cell.amount]),
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

  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  /**
   * Which cycle the columns fold onto (TICKET-STAT-30), held for the session by `ChartOptionsStore`
   * so navigating away and back keeps the axis the user picked. Seeded — not defaulted per mount —
   * to day-of-week, the axis this panel shipped with.
   */
  private readonly cycleControl = chartCycle('dashboard-heatmap', () => 'day-of-week');
  protected readonly cycle = this.cycleControl.value;
  protected readonly setCycle = this.cycleControl.set;

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

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildHeatmapChartOption(
      this.heatmap(),
      this.columnLabels(),
      resolveChartHeatmapColors(),
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
    const { columnKeys, rows, cells } = this.heatmap();
    const privacyMode = this.privacyMode();
    const columnCount = columnKeys.length;

    // `cells` is a dense, row-major grid (`buildGrid` fills every position), so the row's slice is
    // a direct index — no per-cell search.
    return rows.map((row, rowIndex) => ({
      name: row.name,
      amounts: cells
        .slice(rowIndex * columnCount, (rowIndex + 1) * columnCount)
        // Privacy mode has to *withhold* the figure here, not blur it: `.sr-only` clips the table
        // to a 1px box, so a CSS blur paints nothing, and a screen reader would read the amount out
        // regardless (TICKET-PRIV-01's intent, caught in convention review).
        .map((cell) => (privacyMode ? HIDDEN_AMOUNT : formatCurrency(cell.amount))),
    }));
  });

  /**
   * A cell drills down to its category over the panel's range. The *day-of-week* half of the
   * selection is deliberately dropped: the transaction filter has no weekday param (see the
   * ticket's Notes), and inventing one inside a chart ticket would be a Transactions feature in
   * disguise. The "Other" row folds several categories, so it drills down to the range alone.
   */
  protected onChartClick(event: ECElementEvent): void {
    const value = event.value as [number, number, number] | undefined;
    if (!value) return;

    const { rows } = this.heatmap();
    const row = rows[rows.length - 1 - value[1]];
    if (!row) return;

    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams({
        from: this.rangeStore.from('dashboard'),
        to: this.rangeStore.to('dashboard'),
        categoryId: row.categoryId ?? undefined,
      }),
    });
  }
}
