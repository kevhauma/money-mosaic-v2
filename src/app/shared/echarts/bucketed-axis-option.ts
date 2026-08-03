import type { EChartsCoreOption } from 'echarts/core';

/** Index positions within an already-computed `bucketKeys` list — `core/stats`' `ChartZoomWindow`, restated here so `shared/echarts` doesn't depend on `core/`. */
export type ChartZoomByIndex = { startValue: number; endValue: number };

/** The percentages echarts reports on its `datazoom` event, which is how a hand-dragged window is kept (TICKET-STAT-27) — percent rather than bucket indices precisely because it has to survive a bucket-size change. */
export type ChartZoomByPercent = { start: number; end: number };

/** How far a bucketed chart is zoomed in, either way echarts accepts it. Whichever the caller passes is spread onto both `dataZoom` entries as-is. */
export type ChartZoomBounds = ChartZoomByIndex | ChartZoomByPercent;

/**
 * The grid/axis/`dataZoom` shell every full-history bucketed chart shares (TICKET-INC-02 extracted
 * it once `IncomeOverviewComponent` became the second caller alongside
 * `NetWorthHistoryChartComponent`). These charts all compute their series over the entire history
 * and let the page's date range scrub the zoom window instead of shrinking the data
 * (TICKET-STAT-03), so the bottom padding, the slider geometry, and the paired inside/slider zoom
 * controls have to stay identical across them — which is exactly what a caller can't guarantee by
 * re-typing the literal. Spread into the caller's own option object, which still owns its
 * `series`, `tooltip`, `legend`, and colours.
 *
 * `gridTop` is the one edge a caller owns: a chart with a legend passes `legendOption`'s
 * `gridOffset` so the strip has room (TICKET-STAT-26); one without keeps the default. Everything
 * else stays fixed, which is the whole reason this helper exists.
 */
export const bucketedZoomAxisOption = (
  bucketKeys: string[],
  zoomWindow: ChartZoomBounds,
  gridTop = 48,
): EChartsCoreOption => ({
  grid: { left: 56, right: 24, top: gridTop, bottom: 64 },
  xAxis: { type: 'category', data: bucketKeys },
  yAxis: { type: 'value' },
  dataZoom: [
    { type: 'inside', xAxisIndex: 0, ...zoomWindow },
    { type: 'slider', xAxisIndex: 0, height: 20, bottom: 8, ...zoomWindow },
  ],
});
