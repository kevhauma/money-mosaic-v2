import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import { DEFAULT_UI_PREFERENCES } from './seed-data';
import { UiPreferencesRepository } from './ui-preferences.repository';

const PATH = '/api/settings/uiPreferences';

describe('UiPreferencesRepository', () => {
  withApiTesting();

  const repository = (): UiPreferencesRepository => TestBed.inject(UiPreferencesRepository);

  it('get falls back to the defaults for a row nobody has written', async () => {
    expect(await callApi(() => repository().get(), { method: 'GET', url: PATH }, {})).toEqual(
      DEFAULT_UI_PREFERENCES,
    );
  });

  it('get layers the stored row over the defaults', async () => {
    const preferences = await callApi(
      () => repository().get(),
      { method: 'GET', url: PATH },
      { themeStyle: 'cyberpunk', hasVisited: true },
    );

    expect(preferences).toEqual({
      ...DEFAULT_UI_PREFERENCES,
      themeStyle: 'cyberpunk',
      hasVisited: true,
    });
  });

  /**
   * One field per request, never the whole row: the server merges inside a transaction, so marking
   * the landing page seen in one tab cannot write back a stale theme another tab had just changed.
   */
  it.each([
    ['setThemeStyle', () => repository().setThemeStyle('memphis'), { themeStyle: 'memphis' }],
    ['setHasVisited', () => repository().setHasVisited(true), { hasVisited: true }],
    [
      'setBackupReminderDismissed',
      () => repository().setBackupReminderDismissed(true),
      { backupReminderDismissed: true },
    ],
  ])('%s patches only its own field', async (_name, call, body) => {
    expect(await callApi(call, { method: 'PATCH', url: PATH, body }, DEFAULT_UI_PREFERENCES)).toBe(
      1,
    );
  });
});
