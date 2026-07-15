import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
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
    let hydration: Promise<void> | null = null;

    return {
      /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
      hydrate: (): Promise<void> => {
        if (!hydration) {
          hydration = categoryComparisonSettingsRepository
            .get()
            .then((settings) => patchState(store, settings));
        }
        return hydration;
      },

      setExcludedCategoryIds: async (excludedCategoryIds: number[]): Promise<void> => {
        await categoryComparisonSettingsRepository.setExcludedCategoryIds(excludedCategoryIds);
        patchState(store, { excludedCategoryIds });
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Fire-and-forget on first injection instead of app bootstrap (TICKET-PERF-07).
      void store.hydrate();
    },
  }),
);
