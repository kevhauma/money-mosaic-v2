import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import { ForecastSettingsRepository } from './forecast-settings.repository';
import { DEFAULT_FORECAST_SETTINGS } from './seed-data';

const PATH = '/api/settings/forecastSettings';

describe('ForecastSettingsRepository', () => {
  withApiTesting();

  const repository = (): ForecastSettingsRepository => TestBed.inject(ForecastSettingsRepository);

  it('get falls back to the defaults for a row nobody has written', async () => {
    expect(await callApi(() => repository().get(), { method: 'GET', url: PATH }, {})).toEqual(
      DEFAULT_FORECAST_SETTINGS,
    );
  });

  it('get layers the stored row over the defaults', async () => {
    expect(
      await callApi(() => repository().get(), { method: 'GET', url: PATH }, { lookbackMonths: 3 }),
    ).toEqual({ ...DEFAULT_FORECAST_SETTINGS, lookbackMonths: 3 });
  });

  // One field per request: the read-merge-put these five used to do is the server's merge now, so
  // two of them racing can no longer lose one another's field.
  it('setLookbackMonths patches only the lookback', async () => {
    expect(
      await callApi(
        () => repository().setLookbackMonths(6),
        { method: 'PATCH', url: PATH, body: { lookbackMonths: 6 } },
        DEFAULT_FORECAST_SETTINGS,
      ),
    ).toBe(1);
  });

  it('setBasis patches only the basis', async () => {
    expect(
      await callApi(
        () => repository().setBasis('savings-transfers'),
        { method: 'PATCH', url: PATH, body: { basis: 'savings-transfers' } },
        DEFAULT_FORECAST_SETTINGS,
      ),
    ).toBe(1);
  });

  it('setSafetyNetAmount patches only the safety net', async () => {
    expect(
      await callApi(
        () => repository().setSafetyNetAmount(1500),
        { method: 'PATCH', url: PATH, body: { safetyNetAmount: 1500 } },
        DEFAULT_FORECAST_SETTINGS,
      ),
    ).toBe(1);
  });

  it('setMode patches only the mode', async () => {
    expect(
      await callApi(
        () => repository().setMode('required-rate'),
        { method: 'PATCH', url: PATH, body: { mode: 'required-rate' } },
        DEFAULT_FORECAST_SETTINGS,
      ),
    ).toBe(1);
  });

  it('setScopeAccountIds patches the chosen accounts', async () => {
    expect(
      await callApi(
        () => repository().setScopeAccountIds([1, 2]),
        { method: 'PATCH', url: PATH, body: { scopeAccountIds: [1, 2] } },
        DEFAULT_FORECAST_SETTINGS,
      ),
    ).toBe(1);
  });

  // "All accounts" has one representation, and clearing a field is `null` on the wire — dropping
  // the key, which is what `JSON.stringify` does with `undefined`, would patch nothing at all.
  it('setScopeAccountIds clears the field for an empty selection', async () => {
    expect(
      await callApi(
        () => repository().setScopeAccountIds([]),
        { method: 'PATCH', url: PATH, body: { scopeAccountIds: null } },
        DEFAULT_FORECAST_SETTINGS,
      ),
    ).toBe(1);
  });
});
