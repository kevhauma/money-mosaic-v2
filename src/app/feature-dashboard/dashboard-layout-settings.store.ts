import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  DashboardLayoutSettingsRepository,
  DEFAULT_DASHBOARD_LAYOUT_SETTINGS,
  type DashboardLayoutSettings,
  type DashboardRowId,
} from '@/core/data-access';
import { moveDashboardRow, resolveDashboardRowOrder } from './dashboard-row-order';

/**
 * The user's Dashboard row order and hidden-row set (TICKET-STAT-14), persisted so it survives a
 * reload, mirroring `CategoryComparisonSettingsStore`'s hydrate/update shape.
 */
export const DashboardLayoutSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<DashboardLayoutSettings>(DEFAULT_DASHBOARD_LAYOUT_SETTINGS),
  withMethods((store) => {
    const dashboardLayoutSettingsRepository = inject(DashboardLayoutSettingsRepository);
    let hydration: Promise<void> | null = null;

    return {
      /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
      hydrate: (): Promise<void> => {
        if (!hydration) {
          hydration = dashboardLayoutSettingsRepository
            .get()
            .then((settings) => patchState(store, settings));
        }
        return hydration;
      },

      /** Move-up/move-down for the keyboard-accessible reorder controls. */
      reorderRow: async (id: DashboardRowId, direction: 'up' | 'down'): Promise<void> => {
        const rowOrder = moveDashboardRow(store.rowOrder(), id, direction);
        await dashboardLayoutSettingsRepository.setRowOrder(rowOrder);
        patchState(store, { rowOrder });
      },

      /** Persists a full reorder in one write — used by the drag-and-drop drop handler. */
      setRowOrder: async (rowOrder: DashboardRowId[]): Promise<void> => {
        await dashboardLayoutSettingsRepository.setRowOrder(rowOrder);
        patchState(store, { rowOrder });
      },

      toggleRowHidden: async (id: DashboardRowId): Promise<void> => {
        const hiddenRowIds = store.hiddenRowIds().includes(id)
          ? store.hiddenRowIds().filter((rowId) => rowId !== id)
          : [...store.hiddenRowIds(), id];
        await dashboardLayoutSettingsRepository.setHiddenRowIds(hiddenRowIds);
        patchState(store, { hiddenRowIds });
      },

      resetToDefault: async (): Promise<void> => {
        const rowOrder = resolveDashboardRowOrder(DEFAULT_DASHBOARD_LAYOUT_SETTINGS.rowOrder);
        await dashboardLayoutSettingsRepository.setRowOrder(rowOrder);
        await dashboardLayoutSettingsRepository.setHiddenRowIds([]);
        patchState(store, { rowOrder, hiddenRowIds: [] });
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
