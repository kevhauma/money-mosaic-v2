import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { computeGrossNetRatio, type GrossNetRatioPoint } from '@/core/stats';
import { resolveChartAnimation, resolveChartCategoricalColors } from '@/shared/echarts';
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

/**
 * Pure echarts-option builder for the take-home-rate line, kept separate from the component so it's
 * testable without TestBed.
 *
 * Months with no gross wage entered are `null` in the series, not `0`: echarts breaks the line at a
 * `null` (`connectNulls` is off by default), so an unanswered month reads as a gap rather than as a
 * month the user took home nothing. The tooltip spells out both figures behind each point, since a
 * bare "72%" doesn't say which two numbers produced it.
 */
export const buildGrossNetChartOption = (points: GrossNetRatioPoint[]): EChartsCoreOption => {
  const tooltips = points.map((point) =>
    point.ratio === null
      ? `Net ${formatCurrency(point.net)} — no gross wage entered`
      : `Net ${formatCurrency(point.net)} of ${formatCurrency(point.gross!)} gross — ${formatPercent(point.ratio)}`,
  );

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
    grid: { left: 56, right: 24, top: 32, bottom: 32 },
    xAxis: { type: 'category', data: points.map((point) => point.bucketKey) },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number): string => formatPercent(value) },
    },
    series: [
      {
        name: 'Take-home rate',
        type: 'line',
        data: points.map((point) => point.ratio),
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
 * specific month, so the comparison has to be against what actually landed that month.
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
    ),
  );

  /** Nothing to plot until at least one month has a gross wage — an all-gap line is just an empty box. */
  protected readonly hasAnyGross = computed(() =>
    this.points().some((point) => point.ratio !== null),
  );

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildGrossNetChartOption(this.points()),
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
