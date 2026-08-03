import type { EChartsCoreOption } from 'echarts/core';

/** Which edge of the chart the legend strip is anchored to. */
export type ChartLegendPlacement = 'top' | 'bottom';

/**
 * Where each strip is anchored, and how much of the chart's box it takes with it. The offset is
 * the strip's inset plus its own height plus the gap to the plot — reserve it on `grid[placement]`
 * and the legend can never draw over the data. The `bottom` numbers are exactly what
 * `gross-net-chart-options.ts` used before TICKET-STAT-26 routed it through here, so those two
 * charts render pixel-for-pixel as they did.
 */
const PLACEMENT = {
  top: { anchor: { top: 8 }, gridOffset: 56 },
  bottom: { anchor: { bottom: 0 }, gridOffset: 48 },
} as const satisfies Record<ChartLegendPlacement, { anchor: object; gridOffset: number }>;

export type ChartLegendGeometry = {
  /** Spread into the chart option. */
  readonly legend: EChartsCoreOption;
  /** px to reserve on `grid[placement]`. Taking the legend without this is the bug this helper exists to stop. */
  readonly gridOffset: number;
};

/**
 * The legend geometry every multi-series chart shares (TICKET-STAT-26). Three builders declared
 * `legend: { data }` with no placement and no matching `grid` offset, so echarts drew the legend
 * centred *inside* the plot rectangle — over the stacked bands, and over the only control that
 * hides a series. Returning the legend and the space it needs together is the point: they were
 * re-typed per chart, which is why three of five were wrong the same way.
 *
 * `type: 'scroll'` throughout, so ten accounts or five categories page rather than wrapping into a
 * block that eats the chart. `names` is optional — pass it when the caller knows the series names
 * up front, omit it to let echarts derive them from `series` (what the Net vs gross charts do).
 *
 * `hidden` states which of those names are toggled off (TICKET-STAT-27). Stating the selection is
 * what survives `NgxEchartsDirective`'s `setOption(option, true)`: a `notMerge` call discards
 * echarts' own legend state, so an option that says nothing about `selected` silently puts back
 * every series the user just hid. Only meaningful with `names` — a legend echarts derives from
 * `series` has no name list to state a selection over.
 */
export const legendOption = (
  names: readonly string[] | undefined,
  placement: ChartLegendPlacement,
  hidden: readonly string[] = [],
): ChartLegendGeometry => {
  const { anchor, gridOffset } = PLACEMENT[placement];
  const selection = names
    ? {
        data: [...names],
        selected: Object.fromEntries(names.map((name) => [name, !hidden.includes(name)])),
      }
    : {};

  return {
    legend: { type: 'scroll', ...anchor, ...selection },
    gridOffset,
  };
};
