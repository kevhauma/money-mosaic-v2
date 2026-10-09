import { mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  asUploadId,
  discardStagedUpload,
  readStagedUpload,
  refuseOversizedUpload,
  stageUpload,
  sweepStagedUploads,
} from './staged-upload.js';
import type { HttpError } from '../middleware/error-handler.js';

/**
 * The staging layer behind a full-database import (TICKET-SRV-11).
 *
 * The size ceiling is asserted here rather than through the route because the real one is 256 MB:
 * proving it over HTTP would mean actually sending that. `stageUpload` and `refuseOversizedUpload`
 * both take the limit as a parameter precisely so the bound can be tested at the size the test
 * needs. `data.spec.ts` drives the two endpoints and proves the *other* half — that a document past
 * the app-wide `express.json()` ceiling now gets through at all.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'mm-staged-spec-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** The error a rejected staging call carries, so a test can assert on the status it chose. */
const rejection = async (promise: Promise<unknown>): Promise<HttpError> => {
  try {
    await promise;
  } catch (error) {
    return error as HttpError;
  }
  throw new Error('expected the call to reject');
};

const thrown = (call: () => void): HttpError => {
  try {
    call();
  } catch (error) {
    return error as HttpError;
  }
  throw new Error('expected the call to throw');
};

describe('stageUpload', () => {
  it('streams a body to a file the same user can read back', async () => {
    const uploadId = await stageUpload(dir, 7, Readable.from(['{"schemaVersion":', '17}']));

    expect(uploadId).toMatch(/^[0-9a-f]{32}$/);
    await expect(readStagedUpload(dir, 7, uploadId)).resolves.toBe('{"schemaVersion":17}');
  });

  it('names the file for its user, so another account cannot read it', async () => {
    const uploadId = await stageUpload(dir, 7, Readable.from(['{}']));

    // The same 404 a nonexistent id gets — nothing confirms this id is real for somebody else.
    expect((await rejection(readStagedUpload(dir, 8, uploadId))).status).toBe(404);
  });

  it('refuses a body past the limit and leaves no partial file behind', async () => {
    const chunk = 'x'.repeat(64);

    const error = await rejection(stageUpload(dir, 7, Readable.from([chunk, chunk, chunk]), 100));

    expect(error.status).toBe(413);
    // The bytes that arrived before the limit was crossed were already on disk. A refused upload
    // must not leave them there for a sweep to find later.
    expect(await readdir(dir)).toEqual([]);
  });

  it('accepts a body exactly at the limit', async () => {
    const uploadId = await stageUpload(dir, 7, Readable.from(['x'.repeat(100)]), 100);

    await expect(readStagedUpload(dir, 7, uploadId)).resolves.toHaveLength(100);
  });

  it('creates the staging directory on demand, so a first boot needs no setup step', async () => {
    const nested = path.join(dir, 'a', 'b', 'staged');

    const uploadId = await stageUpload(nested, 7, Readable.from(['{}']));

    expect((await stat(nested)).isDirectory()).toBe(true);
    expect(await readFile(path.join(nested, `7-${uploadId}.json`), 'utf8')).toBe('{}');
  });
});

describe('refuseOversizedUpload', () => {
  it('refuses a declared length over the limit before a byte is read', () => {
    const error = thrown(() => refuseOversizedUpload({ 'content-length': '101' }, 100));

    expect(error.status).toBe(413);
  });

  it('says how large an import may be, in the refusal', () => {
    const limit = 4 * 1024 * 1024;

    // Asserted on the declared-length path rather than the streaming one, so saying it in megabytes
    // does not cost a megabyte-sized fixture to prove.
    const error = thrown(() =>
      refuseOversizedUpload({ 'content-length': String(limit + 1) }, limit),
    );

    expect(error.message).toContain('4 MB');
  });

  it('allows a declared length within the limit, and one that is not declared at all', () => {
    expect(() => refuseOversizedUpload({ 'content-length': '100' }, 100)).not.toThrow();
    // A chunked body declares no length; `stageUpload`'s running count is what bounds it.
    expect(() => refuseOversizedUpload({}, 100)).not.toThrow();
  });
});

describe('asUploadId', () => {
  it('refuses anything that is not a 32-character hex token', () => {
    for (const value of [
      '../../money-mosaic.sqlite',
      '/etc/passwd',
      'a'.repeat(31),
      'a'.repeat(33),
      'A'.repeat(32),
      'z'.repeat(32),
      '',
      42,
      null,
      undefined,
    ]) {
      expect(thrown(() => asUploadId(value)).status, String(value)).toBe(404);
    }
  });

  it('passes a well-formed token through unchanged', () => {
    const id = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

    expect(asUploadId(id)).toBe(id);
  });
});

describe('readStagedUpload', () => {
  it('refuses a malformed id without touching the filesystem', async () => {
    // A file whose name a path built from the raw id would reach. The id never gets as far as
    // `path.join`, so this stays unreadable and unremoved.
    await writeFile(path.join(dir, 'secret.json'), 'not yours');

    expect((await rejection(readStagedUpload(dir, 7, '../secret'))).status).toBe(404);
    expect(await readdir(dir)).toEqual(['secret.json']);
  });

  it('reports a never-staged id as a 404, not a crash', async () => {
    const error = await rejection(readStagedUpload(dir, 7, 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'));

    expect(error.status).toBe(404);
  });
});

describe('discardStagedUpload', () => {
  it('removes the file, and a second discard is a no-op', async () => {
    const uploadId = await stageUpload(dir, 7, Readable.from(['{}']));

    await discardStagedUpload(dir, 7, uploadId);
    expect(await readdir(dir)).toEqual([]);

    // Called from a `finally`, so it has to tolerate an id that was never staged at all.
    await expect(discardStagedUpload(dir, 7, uploadId)).resolves.toBeUndefined();
  });
});

describe('sweepStagedUploads', () => {
  it('removes a stale upload and keeps a fresh one', async () => {
    const stale = await stageUpload(dir, 7, Readable.from(['{}']));
    const fresh = await stageUpload(dir, 7, Readable.from(['{}']));

    const backdated = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(path.join(dir, `7-${stale}.json`), backdated, backdated);

    await sweepStagedUploads(dir, 60 * 60 * 1000);

    expect((await rejection(readStagedUpload(dir, 7, stale))).status).toBe(404);
    await expect(readStagedUpload(dir, 7, fresh)).resolves.toBe('{}');
  });

  it('does not throw when the directory does not exist yet', async () => {
    await expect(
      sweepStagedUploads(path.join(dir, 'never-staged-anything')),
    ).resolves.toBeUndefined();
  });

  it('leaves everything alone when nothing is stale', async () => {
    await stageUpload(dir, 7, Readable.from(['{}']));
    const before = await readdir(dir);

    await sweepStagedUploads(dir, 60 * 60 * 1000);

    expect(await readdir(dir)).toEqual(before);
  });
});
