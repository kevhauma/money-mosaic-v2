import { Injectable } from '@angular/core';
import { appDb, type SavingsGoal } from './app-db';

@Injectable({ providedIn: 'root' })
export class GoalsRepository {
  getAll = (): Promise<SavingsGoal[]> => appDb.savingsGoals.toArray();

  add = (goal: SavingsGoal): Promise<number> => appDb.savingsGoals.add(goal);

  update = (id: number, changes: Partial<SavingsGoal>): Promise<number> =>
    appDb.savingsGoals.update(id, changes);

  remove = (id: number): Promise<void> => appDb.savingsGoals.delete(id);

  /**
   * Writes a whole reorder at once, inside one transaction — a move touches two rows (and, the
   * first time, backfills a `sortOrder` onto every row that never had one), and a half-applied
   * reorder would leave two goals claiming the same slot.
   */
  bulkUpdateSortOrder = async (updates: { id: number; sortOrder: number }[]): Promise<void> => {
    if (updates.length === 0) return;
    await appDb.transaction('rw', appDb.savingsGoals, async () => {
      for (const update of updates) {
        await appDb.savingsGoals.update(update.id, { sortOrder: update.sortOrder });
      }
    });
  };
}
