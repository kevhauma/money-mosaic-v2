import { Injectable } from '@angular/core';

const HAS_VISITED_KEY = 'mm-has-visited';

/**
 * Tracks whether this browser has already reached the dashboard once, so the landing page
 * (TICKET-PUB-01) only shows itself to a genuine first-time visitor. Deliberately `localStorage`-
 * only, not the Dexie-backed `appSettings` table — this is ephemeral, per-browser UI state, not
 * data a restored backup should carry across (a fresh browser restoring a backup should still see
 * the landing page once).
 */
@Injectable({ providedIn: 'root' })
export class VisitedService {
  hasVisited(): boolean {
    return localStorage.getItem(HAS_VISITED_KEY) === 'true';
  }

  markVisited(): void {
    localStorage.setItem(HAS_VISITED_KEY, 'true');
  }
}
