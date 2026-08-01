import type { EChartsCoreOption } from 'echarts/core';
import type { GrossNetGrowthPoint, GrossNetRatioPoint } from '@/core/stats';
import { resolveChartAnimation, resolveChartCategoricalColors } from '@/shared/echarts';
import { formatCurrency, formatPercent } from '@/shared/utils';

/**
 * Pure echarts-option builders for the "Net vs gross" section's four charts (FR-INC-13,
 * TICKET-INC-16), kept out of the component so they're testable without TestBed. Every one of them
 * takes the gross series' colour as an argument rather than resolving it: the host reads
 * TICKET-SET-08's resolver once and hands the same hex to all four, so the section can't end up with
 * two shades of "gross".
 *
 * Shared conventions across all four: `connectNulls: false` everywhere, so a month the user hasn't
 * annotated breaks the *gross* line into a genuine gap rather than dipping it to zero — while the
 * net line, which never depends on a `SalaryMetadata` row, carries straight on.
 */

/** Only the fields these charts' tooltip callbacks read off echarts' callback params. */
type TooltipParam = { dataIndex: number; axisValueLabel?: string };

const tooltipFormatter =
  (lines: string[]) =>
  (params: TooltipParam | TooltipParam[]): string => {
    const [hovered] = Array.isArray(params) ? params : [params];
    return [hovered.axisValueLabel, lines[hovered.dataIndex]].filter(Boolean).join('<br/>');
  };

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
 * The take-home band: two stacked areas filling a **fixed 0–100% plot** rather than one auto-fitted
 * line (TICKET-INC-14). The scale is the point — a history sitting between 82% and 88% used to
 * render as dramatic hills across a six-point axis, and a single out-of-band month rescaled the
 * whole chart, both of which hide the thing the chart exists to show.
 *
 * The tooltip spells out both figures behind each point, since a bare "72%" doesn't say which two
 * numbers produced it — and for a month over 100% it names the real percentage the clipped band
 * can't.
 */
export const buildTakeHomeChartOption = (
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
    tooltip: { trigger: 'axis', formatter: tooltipFormatter(tooltips) },
    legend: { bottom: 0 },
    grid: { left: 56, right: 24, top: 24, bottom: 48 },
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
 * Which pair of `GrossNetGrowthPoint` fields a growth chart plots, and how its axis reads them:
 * - `absolute` — the levels themselves, in currency;
 * - `fromStart` — distance travelled from the shared baseline month, in currency;
 * - `pctFromStart` — that same distance relative to the baseline, as a percentage. The one that
 *   answers the real question: the two lines together means raises pass through intact, gross above
 *   net means the deduction rate is climbing.
 */
export type GrossNetGrowthChartKind = 'absolute' | 'fromStart' | 'pctFromStart';

type GrowthChartSpec = {
  gross: keyof GrossNetGrowthPoint;
  net: keyof GrossNetGrowthPoint;
  format: (value: number) => string;
  /** From-start charts draw the baseline itself, so "back to where I started" is visible. */
  zeroLine: boolean;
};

const GROWTH_CHART_SPECS: Record<GrossNetGrowthChartKind, GrowthChartSpec> = {
  absolute: { gross: 'grossValue', net: 'netValue', format: formatCurrency, zeroLine: false },
  fromStart: {
    gross: 'grossFromStart',
    net: 'netFromStart',
    format: formatCurrency,
    zeroLine: true,
  },
  pctFromStart: {
    gross: 'grossPctFromStart',
    net: 'netPctFromStart',
    format: formatPercent,
    zeroLine: true,
  },
};

const valuesOf = (
  points: GrossNetGrowthPoint[],
  field: keyof GrossNetGrowthPoint,
): (number | null)[] => points.map((point) => point[field] as number | null);

/** Gross against net over time, in whichever of the three readings `kind` selects (FR-INC-13). */
export const buildGrossNetGrowthChartOption = (
  points: GrossNetGrowthPoint[],
  kind: GrossNetGrowthChartKind,
  grossColor: string,
): EChartsCoreOption => {
  const spec = GROWTH_CHART_SPECS[kind];
  const gross = valuesOf(points, spec.gross);
  const net = valuesOf(points, spec.net);
  const tooltips = points.map((_, index) =>
    [
      gross[index] === null ? 'Gross — no wage entered' : `Gross ${spec.format(gross[index]!)}`,
      net[index] === null ? 'Net — nothing to measure yet' : `Net ${spec.format(net[index]!)}`,
    ].join('<br/>'),
  );

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    tooltip: { trigger: 'axis', formatter: tooltipFormatter(tooltips) },
    legend: { bottom: 0 },
    grid: { left: 64, right: 24, top: 24, bottom: 48 },
    xAxis: { type: 'category', data: points.map((point) => point.bucketKey) },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number): string => spec.format(value) },
    },
    series: [
      {
        name: 'Net',
        type: 'line',
        showSymbol: false,
        data: net,
        connectNulls: false,
        ...(spec.zeroLine ? { markLine: { silent: true, data: [{ yAxis: 0 }] } } : {}),
      },
      {
        name: 'Gross',
        type: 'line',
        showSymbol: false,
        itemStyle: { color: grossColor },
        data: gross,
        connectNulls: false,
      },
    ],
  };
};
