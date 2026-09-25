import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import {
  decodeBinaryArtifact,
  encodeBinaryArtifact,
  type BinaryArtifact,
} from '../http/binary-artifact.js';
import { startTwoUserApp } from './samples.testing.js';

/**
 * `/api/categoryModel` (TICKET-SRV-03) — the trained auto-categoriser, over the wire as binary.
 *
 * The size is the whole point. A real artifact is megabytes of weights, and the base64 a JSON body
 * would need costs a third more bytes in both directions — on top of which `JSON.stringify` turns
 * an `ArrayBuffer` into `{}`, which is how the export in TICKET-DAT-05 silently lost every trained
 * weight it wrote. So the round-trip below is asserted byte for byte, and against the *transfer
 * size*, not just the values.
 */

const BLOB_NAMES = ['modelTopology', 'weightSpecs', 'weightData'] as const;

/** Bytes that are not all the same value, so a truncated or re-encoded blob cannot pass by luck. */
const patternedBytes = (length: number): Buffer => {
  const bytes = Buffer.alloc(length);
  for (let at = 0; at < length; at += 1) bytes[at] = (at * 31 + 7) % 256;
  return bytes;
};

/**
 * Byte equality via `Buffer.compare`, not `toEqual`. A deep-equality assertion on a three-megabyte
 * buffer compares three million elements one at a time and turns a millisecond check into ten
 * seconds; this is a `memcmp`.
 */
const expectSameBytes = (actual: Uint8Array, expected: Uint8Array): void => {
  expect(actual.byteLength).toBe(expected.byteLength);
  expect(Buffer.compare(Buffer.from(actual), Buffer.from(expected))).toBe(0);
};

const METADATA = {
  categoryIdByIndex: [4, 7, 9],
  featureConfig: { dim: 4096, charNgramMin: 3, charNgramMax: 5 },
  taxonomySignature: 'abc123',
  metrics: { accuracy: 0.93, trainedSampleCount: 5000, epochsRun: 12 },
  trainedAt: '2026-03-01T10:00:00.000Z',
  schemaVersion: 2,
};

/** A model of a given weight, in the envelope the endpoint speaks. */
const artifact = (weightBytes: number): BinaryArtifact => ({
  entity: METADATA,
  blobs: {
    modelTopology: patternedBytes(512),
    weightSpecs: patternedBytes(256),
    weightData: patternedBytes(weightBytes),
  },
});

describe('binary artifact envelope', () => {
  it('round-trips metadata and bytes', () => {
    const original = artifact(1024);
    const decoded = decodeBinaryArtifact(encodeBinaryArtifact(original), BLOB_NAMES);

    expect(decoded.entity).toEqual(METADATA);
    for (const name of BLOB_NAMES) {
      expectSameBytes(decoded.blobs[name]!, original.blobs[name]!);
    }
  });

  it('refuses a truncated body rather than storing the part that arrived', () => {
    const encoded = encodeBinaryArtifact(artifact(1024));

    expect(() =>
      decodeBinaryArtifact(encoded.subarray(0, encoded.length - 10), BLOB_NAMES),
    ).toThrow(/declared blob lengths/);
  });
});

describe('/api/categoryModel', () => {
  it('is a 404 for a user who has never trained one', async () => {
    const { app, alice } = await startTwoUserApp();

    expect((await apiFetch(app, '/api/categoryModel', { as: alice.session })).status).toBe(404);
  });

  it('round-trips a multi-megabyte artifact without base64 inflation', async () => {
    const { app, alice } = await startTwoUserApp();
    const original = artifact(3 * 1024 * 1024);
    const encoded = encodeBinaryArtifact(original);

    const saved = await apiFetch(app, '/api/categoryModel', {
      as: alice.session,
      method: 'PUT',
      binary: encoded,
    });
    expect(saved.status).toBe(204);

    const response = await apiFetch(app, '/api/categoryModel', { as: alice.session });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/octet-stream');

    const body = Buffer.from(await response.arrayBuffer());
    // Base64 would be ~4/3 of the payload in each direction; the bytes on the wire are the bytes
    // of the model plus a few hundred of JSON header.
    expect(body.byteLength).toBeLessThan(encoded.byteLength + 1024);

    const decoded = decodeBinaryArtifact(body, BLOB_NAMES);
    expect(decoded.entity).toEqual(METADATA);
    expectSameBytes(decoded.blobs['weightData']!, original.blobs['weightData']!);
  });

  it('replaces the previous model rather than accumulating rows', async () => {
    const { app, alice } = await startTwoUserApp();

    await apiFetch(app, '/api/categoryModel', {
      as: alice.session,
      method: 'PUT',
      binary: encodeBinaryArtifact(artifact(64)),
    });
    await apiFetch(app, '/api/categoryModel', {
      as: alice.session,
      method: 'PUT',
      binary: encodeBinaryArtifact({
        ...artifact(128),
        entity: { ...METADATA, taxonomySignature: 'retrained' },
      }),
    });

    const decoded = decodeBinaryArtifact(
      Buffer.from(
        await (await apiFetch(app, '/api/categoryModel', { as: alice.session })).arrayBuffer(),
      ),
      BLOB_NAMES,
    );
    expect(decoded.entity['taxonomySignature']).toBe('retrained');
    expect(decoded.blobs['weightData']!.byteLength).toBe(128);
  });

  it("never serves another user's model, and clearing one leaves the other alone", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    await apiFetch(app, '/api/categoryModel', {
      as: alice.session,
      method: 'PUT',
      binary: encodeBinaryArtifact(artifact(64)),
    });

    expect((await apiFetch(app, '/api/categoryModel', { as: bob.session })).status).toBe(404);

    // Idempotent, exactly as `CategoryModelRepository.clear` is against Dexie.
    expect(
      (await apiFetch(app, '/api/categoryModel', { as: bob.session, method: 'DELETE' })).status,
    ).toBe(204);
    expect((await apiFetch(app, '/api/categoryModel', { as: alice.session })).status).toBe(200);

    expect(
      (await apiFetch(app, '/api/categoryModel', { as: alice.session, method: 'DELETE' })).status,
    ).toBe(204);
    expect((await apiFetch(app, '/api/categoryModel', { as: alice.session })).status).toBe(404);
  });

  it('rejects a malformed envelope with a 400 and writes nothing', async () => {
    const { app, alice } = await startTwoUserApp();

    const rejected = await apiJson<{ error: string }>(app, '/api/categoryModel', {
      as: alice.session,
      method: 'PUT',
      binary: Buffer.from('not an artifact'),
    });

    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toContain('Malformed binary artifact');
    expect((await apiFetch(app, '/api/categoryModel', { as: alice.session })).status).toBe(404);
  });

  it('names a metadata field that does not belong to the model', async () => {
    const { app, alice } = await startTwoUserApp();

    const rejected = await apiJson<{ error: string }>(app, '/api/categoryModel', {
      as: alice.session,
      method: 'PUT',
      binary: encodeBinaryArtifact({
        ...artifact(64),
        entity: { ...METADATA, epochs: 4 },
      }),
    });

    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toContain('epochs');
  });
});
