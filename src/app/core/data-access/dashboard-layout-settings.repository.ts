import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { DashboardLayoutSettings, DashboardRowId } from './entities';
import { DEFAULT_DASHBOARD_LAYOUT_SETTINGS } from './seed-data';

const PATH = '/settings/dashboardLayoutSettings';

/** See `transfer-settings.repository.ts` for why the response is spread over the `DEFAULT_*`. */
@Injectable({ providedIn: 'root' })
export class DashboardLayoutSettingsRepository {
  private readonly api = inject(ApiClient);

  get = (): Promise<DashboardLayoutSettings> =>
    this.api
      .get<Partial<DashboardLayoutSettings>>(PATH)
      .then((settings) => ({ ...DEFAULT_DASHBOARD_LAYOUT_SETTINGS, ...settings }));

  // One field per request — the row carries two independent ones, and the server merges.
  setRowOrder = (rowOrder: DashboardRowId[]): Promise<number> =>
    this.api.patch<DashboardLayoutSettings>(PATH, { rowOrder }).then(() => 1);

  setHiddenRowIds = (hiddenRowIds: DashboardRowId[]): Promise<number> =>
    this.api.patch<DashboardLayoutSettings>(PATH, { hiddenRowIds }).then(() => 1);
}
