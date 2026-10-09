import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';

import { httpError, notFound } from './errors.js';

/**
 * Staging an upload on disk so a request body never has to be held in memory (TICKET-SRV-11).
 *
 * The app-wide `express.json()` in `app.ts` is mounted **before** `requireAuth`, so its ceiling
 * bounds what a signed-out caller on the LAN can make the server allocate. That makes it the wrong
 * place to express "a restore may be database-sized": raising it would hand the same allowance to
 * everyone who can reach the port. Instead the bytes stream straight to a file here, and the
 * operation that needs them reads that file once the caller has been identified.
 *
 * The other half of the reason is the transaction. Parsing rows off the wire and inserting them as
 * they arrive would hold a SQLite write lock open across a network upload — one slow phone would
 * block every other request in the house, and a stalled one would pin the lock until it timed out.
 * Staging inverts that: the network phase takes no lock, and the write transaction reads from local
 * disk.
 */

/**
 * The ceiling on a staged upload. Generous on purpose — it bounds a *household's* finances, and the
 * failure it prevents is an unbounded write to the data directory, not a large legitimate restore.
 * Enforced twice, for two different request shapes: see `refuseOversizedUpload` and `stageUpload`.
 */
export const STAGED_IMPORT_LIMIT_BYTES = 256 * 1024 * 1024;

/**
 * How long an upload nobody applied is kept. A staged file is deleted by the apply step, so one
 * surviving this long means the caller never came back — a closed tab, or a refused document. Long
 * enough that it cannot expire between the two requests of one import, short enough that an
 * abandoned restore is not left in the data directory indefinitely.
 */
export const STAGED_UPLOAD_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * The shape of an upload id, and the only thing standing between a caller-supplied string and
 * `path.join`. Checked before the id reaches the filesystem at all, so no value of it — `..`, an
 * absolute path, a NUL byte — can address a file outside the staging directory. Hex only, because
 * that is what `newUploadId` produces and a narrower alphabet is a narrower attack surface.
 */
const UPLOAD_ID_PATTERN = /^[0-9a-f]{32}$/;

const newUploadId = (): string => randomBytes(16).toString('hex');

/** The limit in the units a person would say it in, for a refusal that names it. */
const describeBytes = (bytes: number): string => `${Math.round(bytes / (1024 * 1024))} MB`;

/**
 * Validates a caller-supplied upload id. A malformed one is the same 404 a missing one gets: it is
 * not a path that matches no route, it is an id that names nothing, and saying which would be the
 * one case where the shape of the id is confirmed to a caller who guessed at it.
 */
export const asUploadId = (value: unknown): string => {
  if (typeof value !== 'string' || !UPLOAD_ID_PATTERN.test(value)) throw notFound();
  return value;
};

/**
 * A staged file is named for the user it belongs to, so "whose upload is this" is answered by the
 * path rather than by a lookup. Another account asking for this id builds a different path, which
 * does not exist — so it gets the same 404 a nonexistent id gets, and the response never confirms
 * that somebody else's id is real (the 404-not-403 rule from TICKET-SRV-03).
 */
const stagedPathOf = (dir: string, userId: number, uploadId: string): string =>
  path.join(dir, `${userId}-${asUploadId(uploadId)}.json`);

/**
 * Refuses a body whose declared length is already over the limit, before a byte is read.
 *
 * This is the case that actually happens — the client sends a `Blob`, so `Content-Length` is known
 * — and refusing here is what makes the 413 *arrive*: nothing has been consumed, so the response
 * flushes normally instead of racing a destroyed request stream. `stageUpload`'s running count is
 * the backstop for a chunked body that declares no length.
 */
export const refuseOversizedUpload = (
  headers: { readonly 'content-length'?: string },
  limit: number = STAGED_IMPORT_LIMIT_BYTES,
): void => {
  const declared = Number(headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) throw oversized(limit);
};

const oversized = (limit: number): Error =>
  httpError(
    413,
    `This backup is larger than ${describeBytes(limit)}, which is the most this server will accept in one import.`,
  );

/** Counts bytes as they pass and fails the stream the moment the limit is crossed. */
const boundedTo = (limit: number): Transform => {
  let bytes = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, done) {
      bytes += chunk.length;
      if (bytes > limit) done(oversized(limit));
      else done(null, chunk);
    },
  });
};

/**
 * Streams a request body to a new file in the staging directory and returns its id. Constant
 * memory: the bytes go from socket to disk through a counter and are never accumulated.
 *
 * A failure part-way through — the limit crossed, a dropped connection, a full disk — deletes the
 * partial file before rejecting, so a refused upload leaves nothing behind to sweep.
 */
export const stageUpload = async (
  dir: string,
  userId: number,
  body: Readable,
  limit: number = STAGED_IMPORT_LIMIT_BYTES,
): Promise<string> => {
  await mkdir(dir, { recursive: true });

  const uploadId = newUploadId();
  const file = stagedPathOf(dir, userId, uploadId);
  try {
    await pipeline(body, boundedTo(limit), createWriteStream(file));
  } catch (error) {
    await rm(file, { force: true });
    throw error;
  }
  return uploadId;
};

/**
 * The staged document's text. A missing file is a 404 rather than a 500: it means the id was never
 * staged, was already applied, or belongs to another account — three things this deliberately does
 * not distinguish between.
 */
export const readStagedUpload = async (
  dir: string,
  userId: number,
  uploadId: string,
): Promise<string> => {
  try {
    return await readFile(stagedPathOf(dir, userId, uploadId), 'utf8');
  } catch {
    throw notFound();
  }
};

/**
 * Deletes a staged file, best-effort. Called from a `finally`, so it runs whether the import
 * committed or rolled back — an upload is consumed by the attempt, not by its success, which is
 * also what stops the same id being applied twice.
 */
export const discardStagedUpload = async (
  dir: string,
  userId: number,
  uploadId: string,
): Promise<void> => {
  await rm(stagedPathOf(dir, userId, uploadId), { force: true });
};

/**
 * Removes staged files older than `maxAgeMs`, for uploads nobody ever applied.
 *
 * Best-effort and never the caller's problem: this is housekeeping, and a sweep that cannot read
 * the directory must not fail the import that triggered it. Runs on upload rather than on boot so
 * it also covers a process that stays up for months.
 */
export const sweepStagedUploads = async (
  dir: string,
  maxAgeMs: number = STAGED_UPLOAD_MAX_AGE_MS,
): Promise<void> => {
  const oldest = Date.now() - maxAgeMs;
  try {
    const names = await readdir(dir);
    await Promise.all(
      names.map(async (name) => {
        const file = path.join(dir, name);
        try {
          const { mtimeMs } = await stat(file);
          if (mtimeMs < oldest) await rm(file, { force: true });
        } catch {
          // Gone already, or not ours to read. Either way there is nothing to sweep.
        }
      }),
    );
  } catch {
    // No directory yet (nothing has ever been staged), or it cannot be listed.
  }
};
