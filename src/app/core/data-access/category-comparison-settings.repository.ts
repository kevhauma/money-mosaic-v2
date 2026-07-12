import { Injectable } from '@angular/core';
import {
  appDb,
  DEFAULT_CATEGORY_COMPARISON_SETTINGS,
  type CategoryComparisonSettings,
} from './app-db';

@Injectable({ providedIn: 'root' })
export class CategoryComparisonSettingsRepository {
  get = async (): Promise<CategoryComparisonSettings> =>
    (await appDb.categoryComparisonSettings.get(1)) ?? DEFAULT_CATEGORY_COMPARISON_SETTINGS;

  setExcludedCategoryIds = (excludedCategoryIds: number[]): Promise<number> =>
    appDb.categoryComparisonSettings.put({ id: 1, excludedCategoryIds });
}
