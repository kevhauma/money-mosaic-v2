import { DEFAULT_DASHBOARD_ROW_ORDER, type DashboardRowId } from '@/core/data-access';

export const DASHBOARD_ROW_LABELS: Record<DashboardRowId, string> = {
  stats: 'Income, expense & rates',
  'weekday-weekend': 'Weekday vs. weekend split',
  'category-breakdown': 'Category breakdown',
  'category-comparison': 'Category period comparison',
  'trend-top-transactions': 'Trend chart & biggest transactions',
  'action-queue': 'Action queue',
  'account-balance': 'Account balances',
};

/**
 * Reconciles a saved row order against the current default row set: ids no longer in
 * `defaultOrder` (a row removed by a later ticket) are dropped, and ids in `defaultOrder` missing
 * from `rowOrder` (a row added by a later ticket) are appended in their default relative order —
 * keeps an existing user's saved layout from breaking as the row set evolves (TICKET-STAT-14).
 */
export function resolveDashboardRowOrder(
  rowOrder: readonly DashboardRowId[],
  defaultOrder: readonly DashboardRowId[] = DEFAULT_DASHBOARD_ROW_ORDER,
): DashboardRowId[] {
  const known = new Set(defaultOrder);
  const kept = rowOrder.filter((id) => known.has(id));
  const present = new Set(kept);
  const missing = defaultOrder.filter((id) => !present.has(id));
  return [...kept, ...missing];
}

/** Visible rows in resolved order, minus anything the user hid — composes with, rather than replaces, a row's own conditional self-hide. */
export function visibleDashboardRows(
  rowOrder: readonly DashboardRowId[],
  hiddenRowIds: readonly DashboardRowId[],
  defaultOrder: readonly DashboardRowId[] = DEFAULT_DASHBOARD_ROW_ORDER,
): DashboardRowId[] {
  const hidden = new Set(hiddenRowIds);
  return resolveDashboardRowOrder(rowOrder, defaultOrder).filter((id) => !hidden.has(id));
}

/** Swaps `id` with its up/down neighbour within the resolved order; no-op (same order back) at either boundary or for an unknown id. */
export function moveDashboardRow(
  rowOrder: readonly DashboardRowId[],
  id: DashboardRowId,
  direction: 'up' | 'down',
): DashboardRowId[] {
  const resolved = resolveDashboardRowOrder(rowOrder);
  const index = resolved.indexOf(id);
  const neighbourIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || neighbourIndex < 0 || neighbourIndex >= resolved.length) return resolved;

  const next = [...resolved];
  [next[index], next[neighbourIndex]] = [next[neighbourIndex], next[index]];
  return next;
}
