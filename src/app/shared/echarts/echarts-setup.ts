import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts';
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
// `HeatmapChart` + `VisualMapComponent` (TICKET-STAT-29) are registered here rather than inside
// feature-dashboard for the same reason as everything above it: one registration point is what
// keeps a second feature from re-registering (and re-bundling) the same module later. Both are
// small, and echarts is loaded only from lazy feature chunks either way — the production `initial`
// budget is untouched.
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  HeatmapChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export { echarts };
