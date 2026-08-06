import type { DashboardRowId } from '@/core/data-access';
import {
  moveDashboardRow,
  resolveDashboardRowOrder,
  visibleDashboardRows,
} from './dashboard-row-order';

// Mirrors `DEFAULT_DASHBOARD_ROW_ORDER` — `moveDashboardRow`/`resolveDashboardRowOrder` fall back
// to the real one, so a row added there (TICKET-STAT-29's `spending-heatmap`) belongs here too.
const DEFAULT_ORDER: DashboardRowId[] = [
  'stats',
  'weekday-weekend',
  'category-breakdown',
  'category-comparison',
  'trend-chart',
  'top-transactions',
  'action-queue',
  'account-balance',
  'spending-heatmap',
];

describe('resolveDashboardRowOrder', () => {
  it('returns the saved order unchanged when it matches the default row set', () => {
    expect(resolveDashboardRowOrder(DEFAULT_ORDER, DEFAULT_ORDER)).toEqual(DEFAULT_ORDER);
  });

  it('drops a saved id that no longer exists in the default row set', () => {
    const saved: DashboardRowId[] = ['stats', 'removed-row' as DashboardRowId, 'weekday-weekend'];
    expect(resolveDashboardRowOrder(saved, ['stats', 'weekday-weekend'])).toEqual([
      'stats',
      'weekday-weekend',
    ]);
  });

  it('appends a row missing from the saved order at its default relative position', () => {
    const saved: DashboardRowId[] = ['weekday-weekend', 'stats'];
    expect(resolveDashboardRowOrder(saved, DEFAULT_ORDER)).toEqual([
      'weekday-weekend',
      'stats',
      'category-breakdown',
      'category-comparison',
      'trend-chart',
      'top-transactions',
      'action-queue',
      'account-balance',
      'spending-heatmap',
    ]);
  });

  it('appends a row a saved layout predates, leaving the arranged order untouched (TICKET-STAT-29)', () => {
    // Exactly what an existing user's persisted `rowOrder` looks like from before the heatmap row.
    const savedBeforeHeatmap: DashboardRowId[] = [
      'account-balance',
      'stats',
      'weekday-weekend',
      'category-breakdown',
      'category-comparison',
      'trend-chart',
      'top-transactions',
      'action-queue',
    ];

    expect(resolveDashboardRowOrder(savedBeforeHeatmap)).toEqual([
      ...savedBeforeHeatmap,
      'spending-heatmap',
    ]);
  });
});

describe('visibleDashboardRows', () => {
  it('filters out hidden rows while preserving order', () => {
    expect(
      visibleDashboardRows(DEFAULT_ORDER, ['category-comparison', 'action-queue'], DEFAULT_ORDER),
    ).toEqual([
      'stats',
      'weekday-weekend',
      'category-breakdown',
      'trend-chart',
      'top-transactions',
      'account-balance',
      'spending-heatmap',
    ]);
  });

  it('returns every row when nothing is hidden', () => {
    expect(visibleDashboardRows(DEFAULT_ORDER, [], DEFAULT_ORDER)).toEqual(DEFAULT_ORDER);
  });
});

describe('moveDashboardRow', () => {
  it('swaps a row with its previous neighbour when moving up', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'category-breakdown', 'up')).toEqual([
      'stats',
      'category-breakdown',
      'weekday-weekend',
      'category-comparison',
      'trend-chart',
      'top-transactions',
      'action-queue',
      'account-balance',
      'spending-heatmap',
    ]);
  });

  it('swaps a row with its next neighbour when moving down', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'stats', 'down')).toEqual([
      'weekday-weekend',
      'stats',
      'category-breakdown',
      'category-comparison',
      'trend-chart',
      'top-transactions',
      'action-queue',
      'account-balance',
      'spending-heatmap',
    ]);
  });

  it('is a no-op moving the first row up', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'stats', 'up')).toEqual(DEFAULT_ORDER);
  });

  it('is a no-op moving the last row down', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'spending-heatmap', 'down')).toEqual(DEFAULT_ORDER);
  });

  it('is a no-op for an unknown row id', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'not-a-row' as DashboardRowId, 'up')).toEqual(
      DEFAULT_ORDER,
    );
  });
});
