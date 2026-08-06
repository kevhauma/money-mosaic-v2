import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, PieChart, SankeyChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Manual tree-shaken registration — only pulls in the chart types/components any feature actually
// uses, shared between the Dashboard and Accounts lazy chunks (via provideEchartsCore in each
// feature's routes) so echarts is registered once, not duplicated, and its cost never lands in the
// main bundle (angular.json's production budget is not raised).
//
// `HeatmapChart` + `VisualMapComponent` (TICKET-STAT-29) and `SankeyChart` (TICKET-EXP-02) are
// registered here rather than inside feature-dashboard / feature-explore for the same reason as
// everything above them: one registration point is what keeps a second feature from re-registering
// (and re-bundling) the same module later. All are small, and echarts is loaded only from lazy
// feature chunks either way — the production `initial` budget is untouched.
//
// `echarts-gl` is **not** here and is not a dependency at all: TICKET-EXP-05's feasibility gate
// found that its ESM entry cannot resolve against the installed ECharts 6 / zrender 6 without
// patching it, and closed the 3D landscape as won't-do. See that ticket before reaching for it.
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  HeatmapChart,
  SankeyChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export { echarts };
