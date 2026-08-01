import { Injectable } from '@angular/core';
import type { AccentColorId } from '@/core/theme';
import type { CurrencySymbolPosition } from '@/shared/utils';
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

  setCurrencySymbol = async (currencySymbol: string): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, currencySymbol });
  };

  setCurrencySymbolPosition = async (
    currencySymbolPosition: CurrencySymbolPosition,
  ): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, currencySymbolPosition });
  };

  setLocale = async (locale: string): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, locale });
  };

  setExcludedIncomeCategoryIds = async (excludedIncomeCategoryIds: number[]): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, excludedIncomeCategoryIds });
  };

  // `undefined` clears the setting (TICKET-INC-12) — the Income page falls back to the full data
  // history, which is exactly what an unset field already means.
  setCareerStartDate = async (careerStartDate: string | undefined): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, careerStartDate });
  };

  setSmoothedBonusCategoryIds = async (smoothedBonusCategoryIds: number[]): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, smoothedBonusCategoryIds });
  };
}
