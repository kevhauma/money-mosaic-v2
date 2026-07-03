import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Manual tree-shaken registration — only pulls in the chart types/components this feature
// actually uses, and only from a file reached exclusively through the lazy dashboard route,
// so echarts' cost never lands in the main bundle (angular.json's production budget is not raised).
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
]);

export { echarts };
