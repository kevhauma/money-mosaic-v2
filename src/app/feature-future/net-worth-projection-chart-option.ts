import type { EChartsCoreOption } from 'echarts/core';
import type { NetWorthProjectionPoint } from '@/core/stats';
import { resolveChartAnimation, resolveChartCategoricalColors } from '@/shared/echarts';
import { formatCurrency, formatMonthYear, HIDDEN_AMOUNT_TEXT } from '@/shared/utils';

/** Shape of the callback params echarts passes — only the fields read below. */
type ChartCallbackParam = { dataIndex: number };

/** echarts hands an axis-trigger formatter an array and a label formatter a single param. */
const dataIndexOf = (params: ChartCallbackParam | ChartCallbackParam[]): number =>
  (Array.isArray(params) ? params[0] : params)?.dataIndex ?? 0;

export type ProjectionChartInput = {
  points: NetWorthProjectionPoint[];
  /** Drawn as a floor line when non-zero; a zero net gets no line, since every chart has a zero. */
  safetyNetAmount: number;
  privacyMode: boolean;
};

/**
 * The projected-net-worth sawtooth (TICKET-FUT-07): a line rising at the measured rate and stepping
 * down each time a goal is bought, labelled at each purchase so the shape is readable without
 * hovering.
 *
 * Pure and separate from the component so it is testable without TestBed — the
 * `buildAccountBalanceChartOption` precedent.
 *
 * **No `markPoint`/`markLine`.** Both would pull two more echarts modules into `echarts-setup.ts`
 * for effects a point `label` and one constant-valued series already give — dependency dieting is
 * the standing answer to bundle size here, so the picture is built from the modules already
 * registered (`LineChart`, `GridComponent`, `TooltipComponent`).
 *
 * **Privacy mode withholds rather than blurs.** Everything below is *data* handed to echarts — a
 * label string, a tooltip's text, an axis tick — not styled DOM, so a CSS filter would paint
 * nothing over it (TICKET-STAT-29's rule). The figures are replaced at build time instead.
 */
export const buildNetWorthProjectionChartOption = ({
  points,
  safetyNetAmount,
  privacyMode,
}: ProjectionChartInput): EChartsCoreOption => {
  const amountText = (amount: number): string =>
    privacyMode ? HIDDEN_AMOUNT_TEXT : formatCurrency(amount);

  /** "Camera · €1,200.00" on the months something is bought, nothing on every other month. */
  const purchaseLabel = (index: number): string =>
    (points[index]?.purchases ?? [])
      .map((purchase) => `${purchase.name} · ${amountText(purchase.amount)}`)
      .join(' + ');

  const series: Record<string, unknown>[] = [
    {
      type: 'line',
      name: 'Projected net worth',
      data: points.map((point) => point.balance),
      smooth: false,
      symbolSize: (_value: unknown, params: ChartCallbackParam) =>
        points[params.dataIndex]?.purchases.length ? 9 : 4,
      label: {
        show: true,
        position: 'top',
        // Left-anchored, not centred: a purchase label is long ("Camera · €1,200.00"), and a
        // centred one on the first or last point hangs off the edge of the grid.
        align: 'left',
        offset: [4, 0],
        formatter: (params: ChartCallbackParam) => purchaseLabel(params.dataIndex),
      },
      // Two goals bought a month apart would otherwise print their labels on top of each other;
      // the tooltip and the `sr-only` table still carry every one of them.
      labelLayout: { hideOverlap: true },
    },
  ];

  // "This is the floor I said I wouldn't cross" — drawn only when the user actually set one.
  if (safetyNetAmount) {
    series.push({
      type: 'line',
      name: 'Safety net',
      data: points.map(() => safetyNetAmount),
      symbol: 'none',
      lineStyle: { type: 'dashed', width: 1 },
    });
  }

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    tooltip: {
      trigger: 'axis',
      formatter: (params: ChartCallbackParam | ChartCallbackParam[]) => {
        const point = points[dataIndexOf(params)];
        if (!point) return '';

        return [
          formatMonthYear(point.date),
          `<br/>Projected: ${amountText(point.balance)}`,
          ...point.purchases.map(
            (purchase) => `<br/>Buying ${purchase.name} · ${amountText(purchase.amount)}`,
          ),
        ].join('');
      },
    },
    grid: { left: 64, right: 32, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: points.map((point) => formatMonthYear(point.date)) },
    yAxis: {
      type: 'value',
      axisLabel: privacyMode ? { formatter: () => HIDDEN_AMOUNT_TEXT } : {},
    },
    series,
  };
};
