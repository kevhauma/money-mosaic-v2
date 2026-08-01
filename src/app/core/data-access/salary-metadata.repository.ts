import { Injectable } from '@angular/core';
import { appDb, type SalaryMetadata } from './app-db';

@Injectable({ providedIn: 'root' })
export class SalaryMetadataRepository {
  getAll = (): Promise<SalaryMetadata[]> => appDb.salaryMetadata.toArray();

  /**
   * Writes one month's row, replacing whatever was there. `yearMonth` is uniquely indexed, so
   * `add()` on an existing month would throw a `ConstraintError` rather than overwrite — this looks
   * the row up by month and reuses its `id`, which is what makes the caller's "just save this
   * month" intent safe to repeat.
   */
  upsert = async (entry: SalaryMetadata): Promise<number> => {
    const existing = await appDb.salaryMetadata.where('yearMonth').equals(entry.yearMonth).first();
    return appDb.salaryMetadata.put({ ...entry, id: existing?.id ?? entry.id });
  };

  remove = (id: number): Promise<void> => appDb.salaryMetadata.delete(id);
}
