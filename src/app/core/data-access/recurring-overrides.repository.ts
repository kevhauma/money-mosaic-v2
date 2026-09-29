import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { RecurringOverride } from './entities';

const PATH = '/recurringOverrides';

/**
 * The user's corrections to detected recurring payments (TICKET-REC-11). Thin, like every
 * repository here: the matching of an override back onto a detected series is derivation and lives
 * in `feature-recurring/recurring-overrides.ts`, not in the data layer.
 */
@Injectable({ providedIn: 'root' })
export class RecurringOverridesRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<RecurringOverride[]> => this.api.get<RecurringOverride[]>(PATH);

  add = (override: RecurringOverride): Promise<number> =>
    this.api.post<{ id: number }>(PATH, override).then(({ id }) => id);

  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);
}
