import type { DashboardRowId } from '@/core/data-access';
import {
  moveDashboardRow,
  resolveDashboardRowOrder,
  visibleDashboardRows,
} from './dashboard-row-order';

const DEFAULT_ORDER: DashboardRowId[] = [
  'stats',
  'weekday-weekend',
  'category-breakdown',
  'category-comparison',
  'trend-top-transactions',
  'action-queue',
  'account-balance',
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
      'trend-top-transactions',
      'action-queue',
      'account-balance',
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
      'trend-top-transactions',
      'account-balance',
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
      'trend-top-transactions',
      'action-queue',
      'account-balance',
    ]);
  });

  it('swaps a row with its next neighbour when moving down', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'stats', 'down')).toEqual([
      'weekday-weekend',
      'stats',
      'category-breakdown',
      'category-comparison',
      'trend-top-transactions',
      'action-queue',
      'account-balance',
    ]);
  });

  it('is a no-op moving the first row up', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'stats', 'up')).toEqual(DEFAULT_ORDER);
  });

  it('is a no-op moving the last row down', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'account-balance', 'down')).toEqual(DEFAULT_ORDER);
  });

  it('is a no-op for an unknown row id', () => {
    expect(moveDashboardRow(DEFAULT_ORDER, 'not-a-row' as DashboardRowId, 'up')).toEqual(
      DEFAULT_ORDER,
    );
  });
});
