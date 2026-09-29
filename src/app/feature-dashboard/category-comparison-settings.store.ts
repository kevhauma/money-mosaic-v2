import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  CategoryComparisonSettingsRepository,
  DEFAULT_CATEGORY_COMPARISON_SETTINGS,
  type CategoryComparisonSettings,
} from '@/core/data-access';
import { createStoreReset, registerStoreReset, retryOnFailure } from '@/core/store-reset';

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
    /** Empties this store when the signed-in user changes (TICKET-AUTH-02). */
    const reset = createStoreReset(store, () => {
      hydration = null;
    });

    return {
      reset,
      /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
      hydrate: (): Promise<void> => {
        if (!hydration) {
          hydration = retryOnFailure(
            categoryComparisonSettingsRepository
              .get()
              .then((settings) => patchState(store, settings)),
            () => {
              hydration = null;
            },
          );
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
      // Registers this store for the sign-out wipe (TICKET-AUTH-02), before hydration starts.
      registerStoreReset('CategoryComparisonSettingsStore', store.reset, store.hydrate);

      // Fire-and-forget on first injection instead of app bootstrap (TICKET-PERF-07).
      void store.hydrate();
    },
  }),
);
