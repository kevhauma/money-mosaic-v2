import { Injectable } from '@angular/core';
import type { AccentColorId } from '@/core/theme';
import { appDb, DEFAULT_APP_SETTINGS, type AppSettings } from './app-db';

@Injectable({ providedIn: 'root' })
export class AppSettingsRepository {
  get = async (): Promise<AppSettings> => (await appDb.appSettings.get(1)) ?? DEFAULT_APP_SETTINGS;

  // Read-merge-put, not `.update()` — unlike `transferSettings`, this table isn't seeded on
  // `populate`, so `.update()` alone would silently no-op for a user with no row yet.
  setPrimaryColor = async (primaryColor: AccentColorId | undefined): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, primaryColor });
  };
}
