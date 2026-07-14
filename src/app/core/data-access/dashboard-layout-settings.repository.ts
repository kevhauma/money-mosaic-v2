import { Injectable } from '@angular/core';
import {
  appDb,
  DEFAULT_DASHBOARD_LAYOUT_SETTINGS,
  type DashboardLayoutSettings,
  type DashboardRowId,
} from './app-db';

@Injectable({ providedIn: 'root' })
export class DashboardLayoutSettingsRepository {
  get = async (): Promise<DashboardLayoutSettings> =>
    (await appDb.dashboardLayoutSettings.get(1)) ?? DEFAULT_DASHBOARD_LAYOUT_SETTINGS;

  // Read-merge-put — the row carries two independent fields, so writing one must not clobber the other.
  setRowOrder = async (rowOrder: DashboardRowId[]): Promise<number> => {
    const current = await this.get();
    return appDb.dashboardLayoutSettings.put({ ...current, id: 1, rowOrder });
  };

  setHiddenRowIds = async (hiddenRowIds: DashboardRowId[]): Promise<number> => {
    const current = await this.get();
    return appDb.dashboardLayoutSettings.put({ ...current, id: 1, hiddenRowIds });
  };
}
