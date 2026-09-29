import { inject, Injectable } from '@angular/core';
import type { SavingBasis } from '@/core/stats';
import { ApiClient } from './api-client';
import type { ForecastMode, ForecastSettings } from './entities';
import { DEFAULT_FORECAST_SETTINGS } from './seed-data';

const PATH = '/settings/forecastSettings';

/** See `transfer-settings.repository.ts` for why the response is spread over the `DEFAULT_*`. */
@Injectable({ providedIn: 'root' })
export class ForecastSettingsRepository {
  private readonly api = inject(ApiClient);

  get = (): Promise<ForecastSettings> =>
    this.api
      .get<Partial<ForecastSettings>>(PATH)
      .then((settings) => ({ ...DEFAULT_FORECAST_SETTINGS, ...settings }));

  // One field per request — the row carries several independent settings, and the server merges
  // them inside a transaction rather than this repository reading, merging and putting back.
  setLookbackMonths = (lookbackMonths: number): Promise<number> =>
    this.api.patch<ForecastSettings>(PATH, { lookbackMonths }).then(() => 1);

  setBasis = (basis: SavingBasis): Promise<number> =>
    this.api.patch<ForecastSettings>(PATH, { basis }).then(() => 1);

  setSafetyNetAmount = (safetyNetAmount: number): Promise<number> =>
    this.api.patch<ForecastSettings>(PATH, { safetyNetAmount }).then(() => 1);

  // Which question the page is answering (TICKET-FUT-09).
  setMode = (mode: ForecastMode): Promise<number> =>
    this.api.patch<ForecastSettings>(PATH, { mode }).then(() => 1);

  // Which accounts the forecast may consider (TICKET-FUT-08). An empty array is sent as `undefined`
  // — which `ApiClient` puts on the wire as `null`, clearing the field — so "all accounts" keeps
  // having one representation.
  setScopeAccountIds = (scopeAccountIds: number[]): Promise<number> =>
    this.api
      .patch<ForecastSettings>(PATH, {
        scopeAccountIds: scopeAccountIds.length ? scopeAccountIds : undefined,
      })
      .then(() => 1);
}
