import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  CategoryComparisonSettingsRepository,
  DEFAULT_CATEGORY_COMPARISON_SETTINGS,
  type CategoryComparisonSettings,
} from '@/core/data-access';

/**
 * The user's optional category-exclusion list for the dashboard's category period comparison
 * panel (TICKET-STAT-04 follow-up) — persisted so it survives a reload, mirroring
 * `TransferSettingsStore`'s hydrate/update shape.
 */
export const CategoryComparisonSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<CategoryComparisonSettings>(DEFAULT_CATEGORY_COMPARISON_SETTINGS),
  withMethods((store) => {
    const categoryComparisonSettingsRepository = inject(CategoryComparisonSettingsRepository);

    return {
      hydrate: async (): Promise<void> => {
        patchState(store, await categoryComparisonSettingsRepository.get());
      },

      setExcludedCategoryIds: async (excludedCategoryIds: number[]): Promise<void> => {
        await categoryComparisonSettingsRepository.setExcludedCategoryIds(excludedCategoryIds);
        patchState(store, { excludedCategoryIds });
      },
    };
  }),
);
