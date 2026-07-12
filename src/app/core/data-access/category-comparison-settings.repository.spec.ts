import { appDb, DEFAULT_CATEGORY_COMPARISON_SETTINGS } from './app-db';
import { CategoryComparisonSettingsRepository } from './category-comparison-settings.repository';

describe('CategoryComparisonSettingsRepository', () => {
  const repository = new CategoryComparisonSettingsRepository();

  afterEach(async () => {
    await appDb.categoryComparisonSettings.clear();
  });

  it('falls back to the empty-exclusion default before anything is written', async () => {
    expect(await repository.get()).toEqual(DEFAULT_CATEGORY_COMPARISON_SETTINGS);
  });

  it('round-trips a written exclusion list', async () => {
    await repository.setExcludedCategoryIds([3, 7]);

    expect(await repository.get()).toEqual({ id: 1, excludedCategoryIds: [3, 7] });
  });

  it('overwrites the singleton row rather than adding a second one', async () => {
    await repository.setExcludedCategoryIds([1]);
    await repository.setExcludedCategoryIds([2, 3]);

    expect((await repository.get()).excludedCategoryIds).toEqual([2, 3]);
    expect(await appDb.categoryComparisonSettings.count()).toBe(1);
  });
});
