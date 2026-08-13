import { appDb, DEFAULT_FORECAST_SETTINGS } from './app-db';
import { ForecastSettingsRepository } from './forecast-settings.repository';

describe('ForecastSettingsRepository', () => {
  const repository = new ForecastSettingsRepository();

  // Cleared on both sides: `appDb` is a module-level singleton and Vitest runs with `isolate:
  // false`, so a row left behind by an earlier spec file would break the "unwritten" assertion.
  beforeEach(async () => {
    await appDb.forecastSettings.clear();
  });

  afterEach(async () => {
    await appDb.forecastSettings.clear();
  });

  it('falls back to the defaults before anything is written — 6 months, net-cash-flow, no safety net', async () => {
    expect(await repository.get()).toEqual(DEFAULT_FORECAST_SETTINGS);
    expect(DEFAULT_FORECAST_SETTINGS).toEqual({
      id: 1,
      lookbackMonths: 6,
      basis: 'net-cash-flow',
      safetyNetAmount: 0,
      mode: 'when-affordable',
    });
  });

  it('writes the singleton row when none exists yet', async () => {
    await repository.setLookbackMonths(12);

    expect(await appDb.forecastSettings.count()).toBe(1);
    expect((await repository.get()).lookbackMonths).toBe(12);
  });

  it('read-merge-puts, so setting one field never clobbers the other two', async () => {
    await repository.setLookbackMonths(3);
    await repository.setBasis('savings-transfers');
    await repository.setSafetyNetAmount(2000);

    expect(await repository.get()).toEqual({
      id: 1,
      lookbackMonths: 3,
      basis: 'savings-transfers',
      safetyNetAmount: 2000,
      mode: 'when-affordable',
    });
  });

  it('overwrites the singleton row rather than adding a second one', async () => {
    await repository.setSafetyNetAmount(500);
    await repository.setSafetyNetAmount(750);

    expect(await appDb.forecastSettings.count()).toBe(1);
    expect((await repository.get()).safetyNetAmount).toBe(750);
  });

  it('writes the mode without touching the other settings (TICKET-FUT-09)', async () => {
    await repository.setLookbackMonths(12);
    await repository.setBasis('savings-transfers');

    await repository.setMode('required-rate');

    expect(await repository.get()).toEqual({
      id: 1,
      lookbackMonths: 12,
      basis: 'savings-transfers',
      safetyNetAmount: 0,
      mode: 'required-rate',
    });
  });

  it('preserves a field the current code has no setter for yet (FUT-08’s scopeAccountIds)', async () => {
    await appDb.forecastSettings.put({ ...DEFAULT_FORECAST_SETTINGS, scopeAccountIds: [1, 2] });

    await repository.setLookbackMonths(9);

    expect((await repository.get()).scopeAccountIds).toEqual([1, 2]);
  });
});
