/** One drill-down-linked bar in a category's mini chart, with its height pre-scaled to the category's own window max. */
export type ComparisonBarVm = {
  key: string;
  formattedTotal: string;
  periodLabel: string;
  tooltipLabel: string;
  heightPercent: number;
  isSelected: boolean;
  queryParams: Record<string, string>;
};

/** A comparison category with figures/links/display facts joined once (TICKET-STAT-23), so
 * neither the panel nor the per-category card re-derives a color/icon from a tone/direction enum —
 * `deltaColor`/`deltaIcon` are already the exact values their templates bind. */
export type CategoryComparisonVm = {
  categoryId: number | null;
  name: string;
  color: string;
  bars: ComparisonBarVm[];
  formattedAverage: string;
  formattedHighest: string;
  formattedLowest: string;
  deltaLabel: string | null;
  deltaColor: 'warning' | 'success' | undefined;
  deltaIcon: 'tablerTriangleFill' | 'tablerTriangleInvertedFill' | undefined;
};
