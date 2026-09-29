import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import { decodeBinaryArtifact, encodeBinaryArtifact } from './binary-artifact';
import type { CategoryModelArtifact, CategoryModelSettings } from './entities';
import { DEFAULT_CATEGORY_MODEL_SETTINGS } from './seed-data';

const MODEL_PATH = '/categoryModel';
const SETTINGS_PATH = '/settings/categoryModelSettings';

/**
 * The three `ArrayBuffer` fields of `CategoryModelArtifact`, in the order the envelope writes them.
 * Both sides pass the same list, which is what makes the body self-describing rather than positional.
 */
const BLOB_FIELDS = ['modelTopology', 'weightSpecs', 'weightData'] as const;

/**
 * The trained auto-categoriser. It is a singleton like the six under `/api/settings/`, and nothing
 * else about it is alike: megabytes of `Float32` weights travel as **bytes** in the
 * `binary-artifact` envelope rather than as JSON, which cannot carry an `ArrayBuffer` at all.
 *
 * `id: 1` is put back on the way out. The table is keyed by its owner server-side (TICKET-SRV-02),
 * so the response carries no id — but `CategoryModelArtifact` declares `id: 1` and every reader of
 * the artifact was written against that.
 */
@Injectable({ providedIn: 'root' })
export class CategoryModelRepository {
  private readonly api = inject(ApiClient);

  get = async (): Promise<CategoryModelArtifact | undefined> => {
    const body = await this.api.getBytes(MODEL_PATH);
    if (body === undefined) return undefined;

    const { entity, blobs } = decodeBinaryArtifact(body, BLOB_FIELDS);
    return { ...entity, ...blobs, id: 1 } as CategoryModelArtifact;
  };

  /** Resolves to `1`, the key Dexie's `put` answered with — training replaces, it never merges. */
  save = async (artifact: CategoryModelArtifact): Promise<1> => {
    const { modelTopology, weightSpecs, weightData, ...entity } = artifact;
    await this.api.putBytes(
      MODEL_PATH,
      encodeBinaryArtifact(
        { entity, blobs: { modelTopology, weightSpecs, weightData } },
        BLOB_FIELDS,
      ),
    );
    return 1;
  };

  /** Idempotent server-side: clearing a model that was never trained is still a success. */
  clear = (): Promise<void> => this.api.delete(MODEL_PATH);

  /** The training-window preset (ML-17) — persisted independently of the trained artifact so it survives before a model has ever been trained. */
  getSettings = (): Promise<CategoryModelSettings> =>
    this.api
      .get<Partial<CategoryModelSettings>>(SETTINGS_PATH)
      .then((settings) => ({ ...DEFAULT_CATEGORY_MODEL_SETTINGS, ...settings }));

  setTrainingWindowYears = (trainingWindowYears: number | null): Promise<number> =>
    this.api.patch<CategoryModelSettings>(SETTINGS_PATH, { trainingWindowYears }).then(() => 1);
}
