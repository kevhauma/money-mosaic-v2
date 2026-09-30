import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { ImportBatch } from './entities';

const PATH = '/importBatches';

@Injectable({ providedIn: 'root' })
export class ImportBatchesRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<ImportBatch[]> => this.api.get<ImportBatch[]>(PATH);

  /** `undefined` for a batch that is not there, exactly as the old table `get()` answered. */
  getById = (id: number): Promise<ImportBatch | undefined> =>
    this.api.getOptional<ImportBatch>(`${PATH}/${id}`);

  add = (batch: ImportBatch): Promise<number> =>
    this.api.post<{ id: number }>(PATH, batch).then(({ id }) => id);

  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);
}
