import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import { CategoryComparisonSettingsRepository } from './category-comparison-settings.repository';
import { DEFAULT_CATEGORY_COMPARISON_SETTINGS } from './seed-data';

const PATH = '/api/settings/categoryComparisonSettings';

describe('CategoryComparisonSettingsRepository', () => {
  withApiTesting();

  const repository = (): CategoryComparisonSettingsRepository =>
    TestBed.inject(CategoryComparisonSettingsRepository);

  it('get falls back to the defaults for a row nobody has written', async () => {
    expect(await callApi(() => repository().get(), { method: 'GET', url: PATH }, {})).toEqual(
      DEFAULT_CATEGORY_COMPARISON_SETTINGS,
    );
  });

  it('get layers the stored row over the defaults', async () => {
    expect(
      await callApi(
        () => repository().get(),
        { method: 'GET', url: PATH },
        { excludedCategoryIds: [3, 4] },
      ),
    ).toEqual({ ...DEFAULT_CATEGORY_COMPARISON_SETTINGS, excludedCategoryIds: [3, 4] });
  });

  it('setExcludedCategoryIds patches that one field', async () => {
    expect(
      await callApi(
        () => repository().setExcludedCategoryIds([3]),
        { method: 'PATCH', url: PATH, body: { excludedCategoryIds: [3] } },
        DEFAULT_CATEGORY_COMPARISON_SETTINGS,
      ),
    ).toBe(1);
  });
});
