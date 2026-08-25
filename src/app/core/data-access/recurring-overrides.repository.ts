import { Injectable } from '@angular/core';
import { appDb, type RecurringOverride } from './app-db';

/**
 * The user's corrections to detected recurring payments (TICKET-REC-11). Thin, like every
 * repository here: the matching of an override back onto a detected series is derivation and lives
 * in `feature-recurring/recurring-overrides.ts`, not in the data layer.
 */
@Injectable({ providedIn: 'root' })
export class RecurringOverridesRepository {
  getAll = (): Promise<RecurringOverride[]> => appDb.recurringOverrides.toArray();

  add = (override: RecurringOverride): Promise<number> => appDb.recurringOverrides.add(override);

  remove = (id: number): Promise<void> => appDb.recurringOverrides.delete(id);
}
