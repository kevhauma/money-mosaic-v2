import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  CategoryComparisonSettingsRepository,
  DEFAULT_CATEGORY_COMPARISON_SETTINGS,
  type CategoryComparisonSettings,
} from '@/core/data-access';
import { createHydration, registerStoreReset, withHydrationState } from '@/core/store-reset';

/**
 * The user's optional category-exclusion list for the dashboard's category period comparison
 * panel (TICKET-STAT-04 follow-up) — persisted so it survives a reload, mirroring
 * `TransferSettingsStore`'s hydrate/update shape.
 */
export const CategoryComparisonSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<CategoryComparisonSettings>(DEFAULT_CATEGORY_COMPARISON_SETTINGS),
  withHydrationState(),
  withMethods((store) => {
    const categoryComparisonSettingsRepository = inject(CategoryComparisonSettingsRepository);
    /**
     * `hydrate` is idempotent and triggered on first injection (`withHooks` below,
     * TICKET-PERF-07); `retry` re-reads after a failed load and `reset` empties the store when the
     * signed-in user changes (TICKET-SRV-06, TICKET-AUTH-02).
     */
    const { hydrate, retry, reset } = createHydration(store, () =>
      categoryComparisonSettingsRepository.get().then((settings) => patchState(store, settings)),
    );

    return {
      reset,
      hydrate,
      retry,

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
      // `.catch` because nothing awaits this: the failure is already on the store's `error` for the
      // page to render, and un-caught it would be an unhandled rejection too (TICKET-SRV-06).
      void store.hydrate().catch(() => undefined);
    },
  }),
);
