import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { ThemeStyleId, UiPreferences } from './entities';
import { DEFAULT_UI_PREFERENCES } from './seed-data';

const PATH = '/settings/uiPreferences';

/**
 * The per-user interface state that used to be this app's last three `localStorage` keys
 * (TICKET-SRV-10) — the chosen theme, the landing-page flag and the backup-reminder dismissal.
 *
 * A singleton like the six beside it under `/api/settings/`, and built the same way:
 * `get` spreads the response over `DEFAULT_UI_PREFERENCES` (see `transfer-settings.repository.ts`
 * for why that is not cosmetic), and each setter is a one-field `PATCH` the server merges inside a
 * transaction — so marking the landing page as seen can never write back a stale theme a second tab
 * had just changed.
 */
@Injectable({ providedIn: 'root' })
export class UiPreferencesRepository {
  private readonly api = inject(ApiClient);

  get = (): Promise<UiPreferences> =>
    this.api
      .get<Partial<UiPreferences>>(PATH)
      .then((preferences) => ({ ...DEFAULT_UI_PREFERENCES, ...preferences }));

  setThemeStyle = (themeStyle: ThemeStyleId): Promise<number> => this.patch({ themeStyle });

  setHasVisited = (hasVisited: boolean): Promise<number> => this.patch({ hasVisited });

  setBackupReminderDismissed = (backupReminderDismissed: boolean): Promise<number> =>
    this.patch({ backupReminderDismissed });

  /** The one request every setter makes, kept private for the reason `AppSettingsRepository` gives. */
  private patch(changes: Partial<UiPreferences>): Promise<number> {
    return this.api.patch<UiPreferences>(PATH, changes).then(() => 1);
  }
}
