import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { computeGrossNetRatio, type GrossNetRatioPoint } from '@/core/stats';
import {
  resolveChartAnimation,
  resolveChartCategoricalColors,
  resolveGrossSeriesColor,
} from '@/shared/echarts';
import { PaperComponent, TypographyComponent } from '@/shared/ui';
import { formatCurrency, formatPercent } from '@/shared/utils';
import { IncomeStore } from '../../income.store';

export type GrossNetAccessibleRow = {
  bucketKey: string;
  net: string;
  gross: string;
  ratio: string;
};

/** Printed for a month with no gross wage entered — the user hasn't said, which is not the same as zero. */
const NOT_ENTERED = '—';

/** Only the fields this chart's tooltip callback reads off echarts' callback params. */
type RatioTooltipParam = { dataIndex: number; axisValueLabel?: string };

/** One month's two band values — what reached the account and what didn't (TICKET-INC-14). */
export type TakeHomeBandPoint = {
  /** The kept share, clipped into `[0, 1]`; `null` for a month with no gross entered. */
  kept: number | null;
  /** The rest of the band, so `kept + withheld` is exactly 1 wherever there is a gross. */
  withheld: number | null;
};

/**
 * Splits each month's ratio into the two stacked bands the chart draws. A ratio over 100% means the
 * entered gross is wrong or incomplete; it clips to a full "kept" band rather than rescaling the
 * axis around it, and the tooltip carries the true figure (see the builder below).
 */
export const toTakeHomeBands = (points: GrossNetRatioPoint[]): TakeHomeBandPoint[] =>
  points.map((point) => ({
    kept: point.ratio === null ? null : Math.min(point.ratio, 1),
    withheld: point.ratio === null ? null : Math.max(0, 1 - point.ratio),
  }));

/**
 * Pure echarts-option builder for the take-home-rate band, kept separate from the component so it's
 * testable without TestBed.
 *
 * Two stacked areas filling a **fixed 0–100% plot** rather than one auto-fitted line: the scale is
 * the point. A history sitting between 82% and 88% used to render as dramatic hills across a
 * six-point axis, and a single out-of-band month rescaled the whole chart — both of which hide the
 * thing the panel exists to show.
 *
 * Months with no gross wage entered are `null` in **both** series, not `0`: echarts breaks a series
 * at a `null` (`connectNulls` is off by default), so an unanswered month reads as a genuine gap in
 * the band rather than as a month the user took home nothing. The tooltip spells out both figures
 * behind each point, since a bare "72%" doesn't say which two numbers produced it — and for a month
 * over 100% it names the real percentage the clipped band can't.
 */
export const buildGrossNetChartOption = (
  points: GrossNetRatioPoint[],
  grossColor: string,
): EChartsCoreOption => {
  const bands = toTakeHomeBands(points);
  const tooltips = points.map((point) => {
    if (point.ratio === null) return `Net ${formatCurrency(point.net)} — no gross wage entered`;

    const figures = `Net ${formatCurrency(point.net)} of ${formatCurrency(point.gross!)} gross — ${formatPercent(point.ratio)}`;
    return point.ratio > 1
      ? `${figures}<br/>More reached the account than the gross entered for this month`
      : figures;
  });

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    tooltip: {
      trigger: 'axis',
      formatter: (params: RatioTooltipParam | RatioTooltipParam[]): string => {
        const [hovered] = Array.isArray(params) ? params : [params];
        return [hovered.axisValueLabel, tooltips[hovered.dataIndex]].filter(Boolean).join('<br/>');
      },
    },
    legend: { bottom: 0 },
    grid: { left: 56, right: 24, top: 32, bottom: 48 },
    xAxis: { type: 'category', data: points.map((point) => point.bucketKey) },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: { formatter: (value: number): string => formatPercent(value) },
    },
    series: [
      {
        name: 'Take-home',
        type: 'line',
        stack: 'rate',
        areaStyle: {},
        showSymbol: false,
        data: bands.map((band) => band.kept),
        connectNulls: false,
      },
      {
        name: 'Withheld',
        type: 'line',
        stack: 'rate',
        areaStyle: {},
        showSymbol: false,
        itemStyle: { color: grossColor },
        data: bands.map((band) => band.withheld),
        connectNulls: false,
      },
    ],
  };
};

/**
 * Take-home rate per month (FR-INC-11, TICKET-INC-11): the selected income categories' actual
 * receipts against the gross wage the user entered for that month (FR-INC-10) — the one thing "net
 * income is up" can't tell you, because a rising gross with a falling ratio looks identical to a
 * flat one.
 *
 * Reads `IncomeStore.rawIncomeTrend()`, never the smoothed series: a gross wage is entered for a
 * specific month, so the comparison has to be against what actually landed that month. What it
 * changes (TICKET-INC-14) is *which categories* are summed, not which month — the annual-lump-sum
 * categories are passed as an exclusion set, so the ratio is plain salary against its gross.
 *
 * **Pinned to calendar months** — the acceptance criterion's "implementer's choice", resolved by
 * the fact that this page has no granularity picker at all (`INCOME_GRANULARITY`, TICKET-INC-02),
 * so there is nothing to hide from. `salaryMetadata` is keyed `YYYY-MM`, and the series it's joined
 * against is bucketed the same way by construction.
 */
@Component({
  selector: 'app-income-gross-net-panel',
  imports: [NgxEchartsDirective, PaperComponent, TypographyComponent],
  templateUrl: './income-gross-net-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeGrossNetPanelComponent {
  private readonly incomeStore = inject(IncomeStore);

  private readonly points = computed(() =>
    computeGrossNetRatio(
      this.incomeStore.rawIncomeTrend(),
      this.incomeStore.salaryMetadataByMonth(),
      this.incomeStore.smoothedBonusCategoryIds(),
    ),
  );

  /** Nothing to plot until at least one month has a gross wage — an all-gap line is just an empty box. */
  protected readonly hasAnyGross = computed(() =>
    this.points().some((point) => point.ratio !== null),
  );

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildGrossNetChartOption(this.points(), resolveGrossSeriesColor(this.incomeStore.grossColor())),
  );

  /** Mirrors the chart's figures into DOM text for assistive tech, from the same signal it renders. */
  protected readonly accessibleRows = computed<GrossNetAccessibleRow[]>(() =>
    this.points().map((point) => ({
      bucketKey: point.bucketKey,
      net: formatCurrency(point.net),
      gross: point.gross === null ? NOT_ENTERED : formatCurrency(point.gross),
      ratio: point.ratio === null ? NOT_ENTERED : formatPercent(point.ratio),
    })),
  );
}
