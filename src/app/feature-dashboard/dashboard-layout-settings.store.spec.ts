import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DashboardLayoutSettingsRepository, type DashboardRowId } from '@/core/data-access';
import { DashboardLayoutSettingsStore } from './dashboard-layout-settings.store';

const DEFAULT_ORDER: DashboardRowId[] = [
  'stats',
  'weekday-weekend',
  'category-breakdown',
  'category-comparison',
  'trend-top-transactions',
  'action-queue',
  'account-balance',
];

describe('DashboardLayoutSettingsStore', () => {
  const repository = { get: vi.fn(), setRowOrder: vi.fn(), setHiddenRowIds: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.get.mockResolvedValue({ id: 1, rowOrder: DEFAULT_ORDER, hiddenRowIds: [] });
    repository.setRowOrder.mockResolvedValue(1);
    repository.setHiddenRowIds.mockResolvedValue(1);

    TestBed.configureTestingModule({
      providers: [{ provide: DashboardLayoutSettingsRepository, useValue: repository }],
    });
  });

  it('defaults to the default row order with nothing hidden before hydrate resolves', () => {
    const store = TestBed.inject(DashboardLayoutSettingsStore);
    expect(store.rowOrder()).toEqual(DEFAULT_ORDER);
    expect(store.hiddenRowIds()).toEqual([]);
  });

  it('hydrate patches state from the repository', async () => {
    repository.get.mockResolvedValue({
      id: 1,
      rowOrder: ['action-queue', 'stats'],
      hiddenRowIds: ['stats'],
    });
    const store = TestBed.inject(DashboardLayoutSettingsStore);

    await store.hydrate();

    expect(store.rowOrder()).toEqual(['action-queue', 'stats']);
    expect(store.hiddenRowIds()).toEqual(['stats']);
  });

  it('reorderRow persists the swapped order through the repository and updates local state', async () => {
    const store = TestBed.inject(DashboardLayoutSettingsStore);

    await store.reorderRow('weekday-weekend', 'up');

    const expected = [
      'weekday-weekend',
      'stats',
      'category-breakdown',
      'category-comparison',
      'trend-top-transactions',
      'action-queue',
      'account-balance',
    ];
    expect(repository.setRowOrder).toHaveBeenCalledExactlyOnceWith(expected);
    expect(store.rowOrder()).toEqual(expected);
  });

  it('setRowOrder persists a full drag-and-drop reorder through the repository', async () => {
    const store = TestBed.inject(DashboardLayoutSettingsStore);
    const dropped: DashboardRowId[] = ['account-balance', ...DEFAULT_ORDER.slice(0, -1)];

    await store.setRowOrder(dropped);

    expect(repository.setRowOrder).toHaveBeenCalledExactlyOnceWith(dropped);
    expect(store.rowOrder()).toEqual(dropped);
  });

  it('toggleRowHidden hides a visible row and persists through the repository', async () => {
    const store = TestBed.inject(DashboardLayoutSettingsStore);

    await store.toggleRowHidden('action-queue');

    expect(repository.setHiddenRowIds).toHaveBeenCalledExactlyOnceWith(['action-queue']);
    expect(store.hiddenRowIds()).toEqual(['action-queue']);
  });

  it('toggleRowHidden unhides an already-hidden row', async () => {
    repository.get.mockResolvedValue({
      id: 1,
      rowOrder: DEFAULT_ORDER,
      hiddenRowIds: ['action-queue'],
    });
    const store = TestBed.inject(DashboardLayoutSettingsStore);
    await store.hydrate();

    await store.toggleRowHidden('action-queue');

    expect(repository.setHiddenRowIds).toHaveBeenCalledExactlyOnceWith([]);
    expect(store.hiddenRowIds()).toEqual([]);
  });

  it('resetToDefault restores the default order and unhides every row, persisting both', async () => {
    repository.get.mockResolvedValue({
      id: 1,
      rowOrder: ['action-queue', 'stats'],
      hiddenRowIds: ['stats'],
    });
    const store = TestBed.inject(DashboardLayoutSettingsStore);
    await store.hydrate();

    await store.resetToDefault();

    expect(repository.setRowOrder).toHaveBeenCalledExactlyOnceWith(DEFAULT_ORDER);
    expect(repository.setHiddenRowIds).toHaveBeenCalledExactlyOnceWith([]);
    expect(store.rowOrder()).toEqual(DEFAULT_ORDER);
    expect(store.hiddenRowIds()).toEqual([]);
  });
});
