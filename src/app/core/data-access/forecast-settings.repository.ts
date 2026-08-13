import { Injectable } from '@angular/core';
import type { SavingBasis } from '@/core/stats';
import {
  appDb,
  DEFAULT_FORECAST_SETTINGS,
  type ForecastMode,
  type ForecastSettings,
} from './app-db';

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

  // Which question the page is answering (TICKET-FUT-09). A non-indexed field on the row
  // `.version(14)` already declared, so this needs no schema change.
  setMode = async (mode: ForecastMode): Promise<number> => {
    const current = await this.get();
    return appDb.forecastSettings.put({ ...current, id: 1, mode });
  };

  // Which accounts the forecast may consider (TICKET-FUT-08) — also non-indexed, also no schema
  // change. An empty array is stored as `undefined`: "all accounts" has one representation.
  setScopeAccountIds = async (scopeAccountIds: number[]): Promise<number> => {
    const current = await this.get();
    return appDb.forecastSettings.put({
      ...current,
      id: 1,
      scopeAccountIds: scopeAccountIds.length ? scopeAccountIds : undefined,
    });
  };
}
