import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { SalaryMetadata } from './entities';

const PATH = '/salaryMetadata';

@Injectable({ providedIn: 'root' })
export class SalaryMetadataRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<SalaryMetadata[]> => this.api.get<SalaryMetadata[]>(PATH);

  /**
   * Writes one month's row, replacing whatever was there. `PUT` is keyed by `yearMonth` rather than
   * by id, because that is what the caller means: `(userId, yearMonth)` is uniquely indexed, so a
   * `POST` for a month that already has a row would answer with a constraint failure instead of
   * saving. The look-up-then-write this method used to do is one server-side transaction now, so two
   * saves of the same month can no longer race.
   */
  upsert = (entry: SalaryMetadata): Promise<number> =>
    this.api.put<{ id: number }>(PATH, entry).then(({ id }) => id);

  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);
}
