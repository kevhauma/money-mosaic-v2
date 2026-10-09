import { inject, Injectable } from '@angular/core';
import { UiPreferencesService } from '@/core/ui-preferences';

/**
 * Tracks whether this account has already reached the dashboard once, so the landing page
 * (TICKET-PUB-01) only shows itself to someone genuinely new.
 *
 * Per account and on the server since TICKET-SRV-10 (`UiPreferences.hasVisited`) — it was a
 * per-browser `localStorage` flag. Both guards that read it sit behind `authGuard`, so there is
 * always an account to ask, and the app initializer has already loaded the answer by the time
 * either runs: `hasVisited()` stays a synchronous read.
 */
@Injectable({ providedIn: 'root' })
export class VisitedService {
  private readonly preferences = inject(UiPreferencesService);

  hasVisited(): boolean {
    return this.preferences.hasVisited();
  }

  /**
   * Fire-and-forget, and only the first time: `markVisitedGuard` runs on every navigation to the
   * dashboard, and a `PATCH` per visit to set a flag that is already set would be noise in the
   * request log for nothing.
   */
  markVisited(): void {
    if (this.preferences.hasVisited()) return;
    void this.preferences.markVisited();
  }
}
