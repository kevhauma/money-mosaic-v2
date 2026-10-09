import { inject, Injectable } from '@angular/core';
import { UiPreferencesService } from '@/core/ui-preferences';

/**
 * Whether the signed-in account has already been told where its data lives and who is responsible
 * for backing it up (TICKET-PUB-04).
 *
 * **Per account**, on the server since TICKET-SRV-10 (`UiPreferences.backupReminderDismissed`). It
 * was always keyed per user — the warning is about *your* data being unbacked-up, and on a
 * household's shared browser the next person to sign in has their own data and has not been told —
 * but it used to live in that browser's `localStorage`, so the same account was reminded again on
 * every other browser. The account carries it now, so the session cookie is the key and no user id
 * is passed in.
 *
 * A **separate flag** from `VisitedService`'s, deliberately: that one answers "has this account
 * ever reached the dashboard", which is about the landing page and is set on the very first visit —
 * long before this reminder has anything to say, since it waits for an account that actually holds
 * transactions. Sharing one flag would mean the reminder was dismissed by someone who never saw it.
 *
 * Neither accessor can throw: `UiPreferencesService` never rejects, and an unreadable flag reads as
 * "not dismissed" — the worst case is seeing it again, which is far smaller than an exception
 * escaping into a component that renders inside the shell on every page.
 */
@Injectable({ providedIn: 'root' })
export class BackupReminderService {
  private readonly preferences = inject(UiPreferencesService);

  /** A signal read, so a `computed` over it re-evaluates when the dismissal lands. */
  isDismissed(): boolean {
    return this.preferences.backupReminderDismissed();
  }

  dismiss(): Promise<void> {
    return this.preferences.dismissBackupReminder();
  }
}
