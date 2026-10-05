import { Injectable } from '@angular/core';

const DISMISSED_KEY = 'mm-backup-reminder-dismissed';

/**
 * Whether this browser has already been told where its data lives and who is responsible for
 * backing it up (TICKET-PUB-04).
 *
 * A **separate flag** from `VisitedService`'s, deliberately: that one answers "has this browser
 * ever reached the dashboard", which is about the landing page and is set on the very first visit —
 * long before this reminder has anything to say, since it waits for an account that actually holds
 * transactions. Sharing one key would mean the reminder was dismissed by someone who never saw it.
 *
 * `localStorage` rather than the server-side `appSettings` row, for the same reason `VisitedService`
 * is: this is per-browser UI state, not data a restored backup should carry across. It therefore
 * reappears for the same account in a different browser, which is right — a second browser is a
 * second person as often as it is the same one, and the thing being taught is about the
 * installation rather than the account.
 */
@Injectable({ providedIn: 'root' })
export class BackupReminderService {
  /**
   * Reads can throw in a private window or with site data blocked, and a reminder is never worth
   * breaking the shell over — an unreadable flag is treated as "not dismissed", so the worst case
   * is seeing it again rather than losing the app.
   */
  isDismissed(): boolean {
    try {
      return localStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  dismiss(): void {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Same reasoning as the read: the dismissal not sticking is a far smaller problem than the
      // click throwing.
    }
  }
}
