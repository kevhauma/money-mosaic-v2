import { appDb, DEFAULT_APP_SETTINGS, type AppSettings } from './app-db';
import { AppSettingsRepository } from './app-settings.repository';

describe('AppSettingsRepository', () => {
  const repository = new AppSettingsRepository();

  afterEach(async () => {
    await appDb.appSettings.clear();
  });

  it('falls back to the default settings before anything is written', async () => {
    expect(await repository.get()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('returns the stored row once one exists', async () => {
    // A row written before TICKET-SET-02 added `primaryColor` — Dexie doesn't enforce the TS
    // shape at runtime, so an existing user's stored row can genuinely lack the field.
    await appDb.appSettings.put({ id: 1 } as AppSettings);

    expect(await repository.get()).toEqual({ id: 1 });
  });

  it('setPrimaryColor writes the singleton row without one existing yet', async () => {
    await repository.setPrimaryColor('sky');

    expect(await repository.get()).toEqual({ id: 1, primaryColor: 'sky' });
  });

  it('setPrimaryColor overwrites the singleton row rather than adding a second one', async () => {
    await repository.setPrimaryColor('sky');
    await repository.setPrimaryColor('rose');

    expect((await repository.get()).primaryColor).toBe('rose');
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setPrimaryColor(undefined) clears a previously chosen color', async () => {
    await repository.setPrimaryColor('sky');

    await repository.setPrimaryColor(undefined);

    expect(await repository.get()).toEqual({ id: 1, primaryColor: undefined });
  });
});
