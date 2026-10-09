import { signal, type Provider } from '@angular/core';
import { vi } from 'vitest';
import { SessionStore } from '@/core/auth';
import { DEFAULT_UI_PREFERENCES, type UiPreferences } from '@/core/data-access';
import { UiPreferencesRepository } from '@/core/data-access/ui-preferences.repository';

/**
 * A fake `UiPreferencesRepository`, plus a signed-in session for `UiPreferencesService.restore()` to
 * see — for specs about what the *service* and the things built on it (`ThemeService`, the
 * landing-page guards, the backup reminder) do with an account's preferences, rather than about
 * which request is made. `ui-preferences.repository.spec.ts` covers the wire.
 *
 * `stored` is what the account already has on the server. Each setter resolves, as a server that
 * accepted the write would; a spec that wants a failure swaps one implementation out.
 */
export const fakeUiPreferences = (stored: Partial<UiPreferences> = {}) => {
  const repository = {
    get: vi.fn((): Promise<UiPreferences> =>
      Promise.resolve({ ...DEFAULT_UI_PREFERENCES, ...stored }),
    ),
    setThemeStyle: vi.fn(() => Promise.resolve(1)),
    setHasVisited: vi.fn(() => Promise.resolve(1)),
    setBackupReminderDismissed: vi.fn(() => Promise.resolve(1)),
  };
  const session = { isAuthenticated: signal(true) };

  const providers: Provider[] = [
    { provide: UiPreferencesRepository, useValue: repository },
    { provide: SessionStore, useValue: session },
  ];

  return { repository, session, providers };
};
