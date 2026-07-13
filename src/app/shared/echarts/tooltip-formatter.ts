import { formatCurrency } from '@/shared/utils';

/** Shape of an axis-trigger tooltip callback param echarts actually passes — only the fields formatAxisTooltip reads. */
type AxisTooltipParam = {
  axisValueLabel?: string;
  marker?: string;
  seriesName?: string;
  value: number;
};

/**
 * Shared axis-trigger (`trigger: 'axis'`) tooltip formatter (TICKET-STAT-12): renders every
 * series' value in the hovered bucket through the app's 2-decimal EUR formatter instead of
 * echarts' default raw-float stringification. Reused by every line/bar chart on this trigger
 * (net-worth history, account balance, dashboard trend) so none can drift out of sync.
 */
export const formatAxisTooltip = (params: AxisTooltipParam | AxisTooltipParam[]): string => {
  const items = Array.isArray(params) ? params : [params];
  const header = items[0]?.axisValueLabel;
  const lines = items.map(
    (item) => `${item.marker ?? ''}${item.seriesName ?? ''}: ${formatCurrency(item.value)}`,
  );
  return [header, ...lines].filter((line): line is string => !!line).join('<br/>');
};
