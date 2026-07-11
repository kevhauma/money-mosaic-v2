import { Injectable } from '@angular/core';
import { appDb, type CategoryModelArtifact } from './app-db';

@Injectable({ providedIn: 'root' })
export class CategoryModelRepository {
  get = (): Promise<CategoryModelArtifact | undefined> => appDb.categoryModel.get(1);

  save = (artifact: CategoryModelArtifact): Promise<1> => appDb.categoryModel.put(artifact);

  clear = (): Promise<void> => appDb.categoryModel.delete(1);
}
