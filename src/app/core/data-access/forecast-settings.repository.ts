import { Injectable } from '@angular/core';
import type { SavingBasis } from '@/core/stats';
import { appDb, DEFAULT_FORECAST_SETTINGS, type ForecastSettings } from './app-db';

@Injectable({ providedIn: 'root' })
export class ForecastSettingsRepository {
  get = async (): Promise<ForecastSettings> =>
    (await appDb.forecastSettings.get(1)) ?? DEFAULT_FORECAST_SETTINGS;

  // Read-merge-put per field — the row carries several independent settings, so writing one must
  // not clobber the others (the `dashboardLayoutSettings` precedent).
  setLookbackMonths = async (lookbackMonths: number): Promise<number> => {
    const current = await this.get();
    return appDb.forecastSettings.put({ ...current, id: 1, lookbackMonths });
  };

  setBasis = async (basis: SavingBasis): Promise<number> => {
    const current = await this.get();
    return appDb.forecastSettings.put({ ...current, id: 1, basis });
  };

  setSafetyNetAmount = async (safetyNetAmount: number): Promise<number> => {
    const current = await this.get();
    return appDb.forecastSettings.put({ ...current, id: 1, safetyNetAmount });
  };
}
