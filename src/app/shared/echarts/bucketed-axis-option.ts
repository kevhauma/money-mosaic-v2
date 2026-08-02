import type { EChartsCoreOption } from 'echarts/core';

/** Index positions within an already-computed `bucketKeys` list — `core/stats`' `ChartZoomWindow`, restated here so `shared/echarts` doesn't depend on `core/`. */
type ZoomWindow = { startValue: number; endValue: number };

/**
 * The grid/axis/`dataZoom` shell every full-history bucketed chart shares (TICKET-INC-02 extracted
 * it once `IncomeOverviewComponent` became the second caller alongside
 * `NetWorthHistoryChartComponent`). These charts all compute their series over the entire history
 * and let the page's date range scrub the zoom window instead of shrinking the data
 * (TICKET-STAT-03), so the bottom padding, the slider geometry, and the paired inside/slider zoom
 * controls have to stay identical across them — which is exactly what a caller can't guarantee by
 * re-typing the literal. Spread into the caller's own option object, which still owns its
 * `series`, `tooltip`, `legend`, and colours.
 */
export const bucketedZoomAxisOption = (
  bucketKeys: string[],
  zoomWindow: ZoomWindow,
): EChartsCoreOption => ({
  grid: { left: 56, right: 24, top: 48, bottom: 64 },
  xAxis: { type: 'category', data: bucketKeys },
  yAxis: { type: 'value' },
  dataZoom: [
    { type: 'inside', xAxisIndex: 0, ...zoomWindow },
    { type: 'slider', xAxisIndex: 0, height: 20, bottom: 8, ...zoomWindow },
  ],
});
