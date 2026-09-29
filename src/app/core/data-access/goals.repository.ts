import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { SavingsGoal } from './entities';

/** `savingsGoals` is served at `/api/goals` — the one path that is not its table's own name. */
const PATH = '/goals';

@Injectable({ providedIn: 'root' })
export class GoalsRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<SavingsGoal[]> => this.api.get<SavingsGoal[]>(PATH);

  add = (goal: SavingsGoal): Promise<number> =>
    this.api.post<{ id: number }>(PATH, goal).then(({ id }) => id);

  update = (id: number, changes: Partial<SavingsGoal>): Promise<number> =>
    this.api.patch<SavingsGoal>(`${PATH}/${id}`, changes).then(() => 1);

  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);

  /**
   * Writes a whole reorder at once, in one server-side transaction — a move touches two rows (and,
   * the first time, backfills a `sortOrder` onto every row that never had one), and a half-applied
   * reorder would leave two goals claiming the same slot. An empty list is still nothing to do, so
   * it stays a no-op rather than becoming an empty request.
   */
  bulkUpdateSortOrder = async (updates: { id: number; sortOrder: number }[]): Promise<void> => {
    if (updates.length === 0) return;
    await this.api.patch<void>(`${PATH}/sort-order`, updates);
  };
}
