import { formatCurrency } from '@/shared/utils';

/** Shape of an axis-trigger tooltip callback param echarts actually passes — only the fields these formatters read. */
type AxisTooltipParam = {
  axisValueLabel?: string;
  marker?: string;
  seriesName?: string;
  /** `null` where the hovered category is one this series has no point at — see `formatAxisTooltip`. */
  value: number | null;
};

/**
 * Shared axis-trigger (`trigger: 'axis'`) tooltip formatter (TICKET-STAT-12): renders every
 * series' value in the hovered bucket through the app's 2-decimal EUR formatter instead of
 * echarts' default raw-float stringification. Reused by every line/bar chart on this trigger
 * (net-worth history, account balance, dashboard trend, loan balance) so none can drift out of sync.
 *
 * A series with **no point** at the hovered category is skipped rather than listed. echarts passes
 * its `value` as `null`, which `formatCurrency` would render as `NaN` — the loan balance chart is
 * the case that surfaced it: its two series are sampled on different timelines and share a category
 * axis built from the union of both (`connectNulls` draws across the gaps), so on most categories
 * exactly one of them genuinely has nothing to state.
 */
export const formatAxisTooltip = (params: AxisTooltipParam | AxisTooltipParam[]): string => {
  const items = Array.isArray(params) ? params : [params];
  const header = items[0]?.axisValueLabel;
  const lines = items
    .filter((item): item is AxisTooltipParam & { value: number } => Number.isFinite(item.value))
    .map((item) => `${item.marker ?? ''}${item.seriesName ?? ''}: ${formatCurrency(item.value)}`);
  return [header, ...lines].filter((line): line is string => !!line).join('<br/>');
};
