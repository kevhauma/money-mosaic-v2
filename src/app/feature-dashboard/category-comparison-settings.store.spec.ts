import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoryComparisonSettingsRepository } from '@/core/data-access';
import { CategoryComparisonSettingsStore } from './category-comparison-settings.store';

describe('CategoryComparisonSettingsStore', () => {
  const repository = { get: vi.fn(), setExcludedCategoryIds: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.get.mockResolvedValue({ id: 1, excludedCategoryIds: [] });
    repository.setExcludedCategoryIds.mockResolvedValue(1);

    TestBed.configureTestingModule({
      providers: [{ provide: CategoryComparisonSettingsRepository, useValue: repository }],
    });
  });

  it('defaults to no exclusions before hydrate resolves', () => {
    const store = TestBed.inject(CategoryComparisonSettingsStore);
    expect(store.excludedCategoryIds()).toEqual([]);
  });

  it('hydrate patches state from the repository', async () => {
    repository.get.mockResolvedValue({ id: 1, excludedCategoryIds: [4, 9] });
    const store = TestBed.inject(CategoryComparisonSettingsStore);

    await store.hydrate();

    expect(store.excludedCategoryIds()).toEqual([4, 9]);
  });

  it('setExcludedCategoryIds persists through the repository and updates local state', async () => {
    const store = TestBed.inject(CategoryComparisonSettingsStore);

    await store.setExcludedCategoryIds([2, 5]);

    expect(repository.setExcludedCategoryIds).toHaveBeenCalledExactlyOnceWith([2, 5]);
    expect(store.excludedCategoryIds()).toEqual([2, 5]);
  });

  it('hydrates itself on first injection without a caller invoking hydrate() (TICKET-PERF-07)', async () => {
    repository.get.mockResolvedValue({ id: 1, excludedCategoryIds: [3] });
    const store = TestBed.inject(CategoryComparisonSettingsStore);

    await store.hydrate();

    expect(repository.get).toHaveBeenCalledTimes(1);
    expect(store.excludedCategoryIds()).toEqual([3]);
  });

  it('is idempotent: double injection and repeated calls all resolve without re-fetching', async () => {
    const store = TestBed.inject(CategoryComparisonSettingsStore);

    await Promise.all([store.hydrate(), store.hydrate()]);
    await store.hydrate();

    expect(repository.get).toHaveBeenCalledTimes(1);
  });
});
