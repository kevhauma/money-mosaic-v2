import { DEFAULT_FEATURE_CONFIG } from '@/core/ml/model-config';
import { appDb, type CategoryModelArtifact } from './app-db';
import { CategoryModelRepository } from './category-model.repository';

const artifact = (overrides: Partial<CategoryModelArtifact> = {}): CategoryModelArtifact => ({
  id: 1,
  modelTopology: new Uint8Array([1, 2, 3, 4]).buffer,
  weightSpecs: new Uint8Array([5, 6, 7, 8]).buffer,
  weightData: new Uint8Array([9, 10, 11, 12, 13, 14]).buffer,
  categoryIdByIndex: [1, 2, 3],
  featureConfig: DEFAULT_FEATURE_CONFIG,
  taxonomySignature: '1:Groceries|2:Rent',
  metrics: { accuracy: 0.9, trainedSampleCount: 100 },
  trainedAt: '2026-07-01T00:00:00.000Z',
  schemaVersion: 1,
  ...overrides,
});

describe('CategoryModelRepository', () => {
  const repository = new CategoryModelRepository();

  afterEach(async () => {
    await appDb.categoryModel.clear();
  });

  it('returns undefined before anything is saved', async () => {
    expect(await repository.get()).toBeUndefined();
  });

  it('round-trips an artifact, including its ArrayBuffer fields', async () => {
    const original = artifact();

    await repository.save(original);
    const loaded = await repository.get();

    expect(loaded).toBeDefined();
    expect(loaded?.categoryIdByIndex).toEqual(original.categoryIdByIndex);
    expect(loaded?.featureConfig).toEqual(original.featureConfig);
    expect(loaded?.taxonomySignature).toBe(original.taxonomySignature);
    expect(loaded?.metrics).toEqual(original.metrics);
    expect(loaded?.trainedAt).toBe(original.trainedAt);
    expect(loaded?.schemaVersion).toBe(original.schemaVersion);
    expect(new Uint8Array(loaded!.modelTopology)).toEqual(new Uint8Array(original.modelTopology));
    expect(new Uint8Array(loaded!.weightSpecs)).toEqual(new Uint8Array(original.weightSpecs));
    expect(new Uint8Array(loaded!.weightData)).toEqual(new Uint8Array(original.weightData));
  });

  it('clear removes the row', async () => {
    await repository.save(artifact());
    expect(await repository.get()).toBeDefined();

    await repository.clear();

    expect(await repository.get()).toBeUndefined();
  });

  it('save overwrites the singleton row rather than adding a second one', async () => {
    await repository.save(artifact({ metrics: { accuracy: 0.5, trainedSampleCount: 10 } }));
    await repository.save(artifact({ metrics: { accuracy: 0.99, trainedSampleCount: 500 } }));

    expect((await repository.get())?.metrics.accuracy).toBe(0.99);
    expect(await appDb.categoryModel.count()).toBe(1);
  });
});
