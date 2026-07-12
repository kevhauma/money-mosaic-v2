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
});
