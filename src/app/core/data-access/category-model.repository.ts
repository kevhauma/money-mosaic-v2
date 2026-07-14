import { Injectable } from '@angular/core';
import {
  appDb,
  DEFAULT_CATEGORY_MODEL_SETTINGS,
  type CategoryModelArtifact,
  type CategoryModelSettings,
} from './app-db';

@Injectable({ providedIn: 'root' })
export class CategoryModelRepository {
  get = (): Promise<CategoryModelArtifact | undefined> => appDb.categoryModel.get(1);

  save = (artifact: CategoryModelArtifact): Promise<1> => appDb.categoryModel.put(artifact);

  clear = (): Promise<void> => appDb.categoryModel.delete(1);

  /** The training-window preset (ML-17) — persisted independently of the trained artifact so it survives before a model has ever been trained. */
  getSettings = async (): Promise<CategoryModelSettings> =>
    (await appDb.categoryModelSettings.get(1)) ?? DEFAULT_CATEGORY_MODEL_SETTINGS;

  setTrainingWindowYears = (trainingWindowYears: number | null): Promise<number> =>
    appDb.categoryModelSettings.put({ id: 1, trainingWindowYears });
}
