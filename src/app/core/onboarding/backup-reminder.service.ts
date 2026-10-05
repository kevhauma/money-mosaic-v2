import { Injectable } from '@angular/core';

const KEY_PREFIX = 'mm-backup-reminder-dismissed';

/**
 * The storage key for one account. Keyed **per user**, not per browser: the thing being dismissed
 * is a warning about *your* data being unbacked-up, and on a household's shared browser the next
 * person to sign in has their own data and has not been told. A single key would mean whoever
 * signed in first silently dismissed it for everybody.
 */
const keyFor = (userId: number): string => `${KEY_PREFIX}:${userId}`;

/**
 * Whether this browser has already told *this account* where its data lives and who is responsible
 * for backing it up (TICKET-PUB-04).
 *
 * A **separate flag** from `VisitedService`'s, deliberately: that one answers "has this browser
 * ever reached the dashboard", which is about the landing page and is set on the very first visit —
 * long before this reminder has anything to say, since it waits for an account that actually holds
 * transactions. Sharing one key would mean the reminder was dismissed by someone who never saw it.
 *
 * `localStorage` rather than the server-side `appSettings` row, for the same reason `VisitedService`
 * uses it: this is UI state, not data a restored backup should carry across. It therefore reappears
 * for the same account in a different browser, which is right — the thing being taught is about the
 * installation, and a second browser is a second person as often as not.
 *
 * Unlike `VisitedService`, both accessors are guarded. That is a difference rather than a
 * precedent: this one is reached from a component that renders inside the shell on every page, and
 * a reminder is never worth an exception escaping into the shell. (A browser whose `localStorage`
 * throws has bigger problems first — `ThemeService` reads it during construction — so treat this as
 * cheap insurance, not as cover.)
 */
@Injectable({ providedIn: 'root' })
export class BackupReminderService {
  /** An unreadable flag reads as "not dismissed": the worst case is seeing it again. */
  isDismissed(userId: number): boolean {
    try {
      return localStorage.getItem(keyFor(userId)) === 'true';
    } catch {
      return false;
    }
  }

  dismiss(userId: number): void {
    try {
      localStorage.setItem(keyFor(userId), 'true');
    } catch {
      // Same reasoning as the read: a dismissal that does not stick is a far smaller problem than
      // a click that throws.
    }
  }
}
