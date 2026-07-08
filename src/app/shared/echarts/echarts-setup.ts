import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Manual tree-shaken registration — only pulls in the chart types/components any feature actually
// uses, shared between the Dashboard and Accounts lazy chunks (via provideEchartsCore in each
// feature's routes) so echarts is registered once, not duplicated, and its cost never lands in the
// main bundle (angular.json's production budget is not raised).
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export { echarts };
