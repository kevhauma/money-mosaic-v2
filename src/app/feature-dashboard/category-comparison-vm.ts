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
  /**
   * `null` when every contributing period spent exactly the same on this category (TICKET-STAT-44):
   * Avg, High and Low are then one figure printed three times over a flat 0% delta, which reads as
   * a broken comparison rather than as a fixed cost. The card renders `unchangedNote` instead.
   */
  formattedFigures: {
    average: string;
    highest: string;
    lowest: string;
  } | null;
  /** The one figure and the fact that it never moved, when `formattedFigures` is `null`; `null` otherwise. */
  unchangedNote: string | null;
  deltaLabel: string | null;
  deltaColor: 'warning' | 'success' | undefined;
  deltaIcon: 'tablerTriangleFill' | 'tablerTriangleInvertedFill' | undefined;
};
