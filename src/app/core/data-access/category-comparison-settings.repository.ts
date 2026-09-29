import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { CategoryComparisonSettings } from './entities';
import { DEFAULT_CATEGORY_COMPARISON_SETTINGS } from './seed-data';

const PATH = '/settings/categoryComparisonSettings';

/** See `transfer-settings.repository.ts` for why the response is spread over the `DEFAULT_*`. */
@Injectable({ providedIn: 'root' })
export class CategoryComparisonSettingsRepository {
  private readonly api = inject(ApiClient);

  get = (): Promise<CategoryComparisonSettings> =>
    this.api
      .get<Partial<CategoryComparisonSettings>>(PATH)
      .then((settings) => ({ ...DEFAULT_CATEGORY_COMPARISON_SETTINGS, ...settings }));

  setExcludedCategoryIds = (excludedCategoryIds: number[]): Promise<number> =>
    this.api.patch<CategoryComparisonSettings>(PATH, { excludedCategoryIds }).then(() => 1);
}
