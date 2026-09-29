import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import { decodeBinaryArtifact, encodeBinaryArtifact } from './binary-artifact';
import { CategoryModelRepository } from './category-model.repository';
import type { CategoryModelArtifact } from './entities';
import { DEFAULT_CATEGORY_MODEL_SETTINGS } from './seed-data';

const MODEL_PATH = '/api/categoryModel';
const SETTINGS_PATH = '/api/settings/categoryModelSettings';
const BLOB_FIELDS = ['modelTopology', 'weightSpecs', 'weightData'] as const;

const bytes = (...values: number[]): ArrayBuffer => new Uint8Array(values).buffer;

const artifact = (): CategoryModelArtifact => ({
  id: 1,
  modelTopology: bytes(1, 2, 3),
  weightSpecs: bytes(4, 5),
  weightData: bytes(6, 7, 8, 9),
  categoryIdByIndex: [3, 4],
  featureConfig: { vocabulary: ['a'] } as unknown as CategoryModelArtifact['featureConfig'],
  taxonomySignature: 'sig',
  metrics: { accuracy: 0.9, trainedSampleCount: 100 },
  trainedAt: '2026-07-01T00:00:00.000Z',
  schemaVersion: 2,
});

/** The envelope the endpoint answers with: metadata as JSON, weights as raw bytes. */
const encoded = ({
  modelTopology,
  weightSpecs,
  weightData,
  ...entity
}: CategoryModelArtifact): ArrayBuffer => {
  return encodeBinaryArtifact(
    { entity, blobs: { modelTopology, weightSpecs, weightData } },
    BLOB_FIELDS,
  );
};

/**
 * A JSON body as the `ArrayBuffer` an `arraybuffer` request actually receives — including for an
 * error. Copied into a fresh buffer rather than handing over `TextEncoder`'s view: Angular's testing
 * backend checks `instanceof ArrayBuffer`, which a view's `.buffer` does not always satisfy here.
 */
const jsonBuffer = (value: unknown): ArrayBuffer => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

describe('CategoryModelRepository', () => {
  withApiTesting();

  const repository = (): CategoryModelRepository => TestBed.inject(CategoryModelRepository);

  it('get reads the artifact back out of the binary envelope, id and all', async () => {
    const model = await callApi(
      () => repository().get(),
      { method: 'GET', url: MODEL_PATH },
      encoded(artifact()),
    );

    // `id: 1` is put back client-side: the table is keyed by its owner server-side, so the
    // response carries no id, and every reader of the artifact was written against one.
    expect(model).toEqual(artifact());
  });

  it('get resolves to undefined for a user who has never trained a model', async () => {
    const settled = repository().get();
    TestBed.inject(HttpTestingController)
      .expectOne(MODEL_PATH)
      // The server's JSON 404 body, encoded — which is what actually arrives when the request asked
      // for an `arraybuffer`, and is why `absent` decodes before reading the code.
      .flush(jsonBuffer({ error: 'Not found', code: 'row_not_found' }), {
        status: 404,
        statusText: 'Not Found',
      });

    expect(await settled).toBeUndefined();
  });

  it('save puts the weights as bytes, not base64 in JSON, and resolves to the singleton key', async () => {
    const model = artifact();
    const settled = repository().save(model);
    const request = TestBed.inject(HttpTestingController).expectOne(MODEL_PATH);

    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Content-Type')).toBe('application/octet-stream');

    const sent = decodeBinaryArtifact(request.request.body as ArrayBuffer, BLOB_FIELDS);
    expect(sent.entity['taxonomySignature']).toBe('sig');
    expect(sent.entity['categoryIdByIndex']).toEqual([3, 4]);
    expect(new Uint8Array(sent.blobs['weightData']!)).toEqual(new Uint8Array(model.weightData));

    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(await settled).toBe(1);
  });

  it('clear deletes the artifact', async () => {
    await expect(
      callApi(() => repository().clear(), { method: 'DELETE', url: MODEL_PATH }),
    ).resolves.toBeUndefined();
  });

  // `trainingWindowYears: null` is a value ("train on everything"), not an absence, and it has to
  // survive the fallback intact.
  it('getSettings falls back to the defaults before a window has ever been chosen', async () => {
    expect(
      await callApi(() => repository().getSettings(), { method: 'GET', url: SETTINGS_PATH }, {}),
    ).toEqual(DEFAULT_CATEGORY_MODEL_SETTINGS);
  });

  it('getSettings layers the stored row over the defaults', async () => {
    expect(
      await callApi(
        () => repository().getSettings(),
        { method: 'GET', url: SETTINGS_PATH },
        { trainingWindowYears: 3 },
      ),
    ).toEqual({ ...DEFAULT_CATEGORY_MODEL_SETTINGS, trainingWindowYears: 3 });
  });

  it('setTrainingWindowYears patches that one field', async () => {
    expect(
      await callApi(
        () => repository().setTrainingWindowYears(null),
        { method: 'PATCH', url: SETTINGS_PATH, body: { trainingWindowYears: null } },
        DEFAULT_CATEGORY_MODEL_SETTINGS,
      ),
    ).toBe(1);
  });
});
