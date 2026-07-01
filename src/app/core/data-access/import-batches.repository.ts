import { Injectable } from '@angular/core';
import { appDb, type ImportBatch } from './app-db';

@Injectable({ providedIn: 'root' })
export class ImportBatchesRepository {
  getAll = (): Promise<ImportBatch[]> => appDb.importBatches.toArray();

  getById = (id: number): Promise<ImportBatch | undefined> => appDb.importBatches.get(id);

  add = (batch: ImportBatch): Promise<number> => appDb.importBatches.add(batch);

  remove = (id: number): Promise<void> => appDb.importBatches.delete(id);
}
