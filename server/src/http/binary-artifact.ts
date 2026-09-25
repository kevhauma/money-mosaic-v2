import { httpError } from './errors.js';

/**
 * The wire format for `categoryModel` (TICKET-SRV-03) — JSON metadata and raw bytes in one body.
 *
 * **Why not JSON.** A trained auto-categoriser is megabytes of `Float32` weights. The only way to
 * put those in a JSON body is base64, which costs a third more bytes on the wire plus an
 * encode/decode pass at both ends — and, historically, worse: `JSON.stringify` turns an
 * `ArrayBuffer` into `{}`, which is exactly how the export in TICKET-DAT-05 silently lost every
 * trained weight it ever wrote. Bytes stay bytes here, from the client's `ArrayBuffer` to the
 * SQLite blob column.
 *
 * ```text
 * [uint32 LE header length][header JSON, UTF-8][blob 1][blob 2]…
 * header = { entity: { …non-blob fields… }, blobs: { name: byteLength, … } }
 * ```
 *
 * Self-describing rather than positional: the blob names and their lengths travel with the
 * payload, so a truncated or re-ordered body is a 400 rather than three columns of garbage.
 */

/** Bytes of the length prefix in front of the header. */
const HEADER_LENGTH_BYTES = 4;

export type BinaryArtifact = {
  /** The row's ordinary fields, as they would appear in a JSON body. */
  readonly entity: Record<string, unknown>;
  /** The blob columns, by name. */
  readonly blobs: Readonly<Record<string, Uint8Array>>;
};

type ArtifactHeader = {
  readonly entity?: unknown;
  readonly blobs?: unknown;
};

const malformed = (detail: string) => httpError(400, `Malformed binary artifact: ${detail}`);

export const encodeBinaryArtifact = ({ entity, blobs }: BinaryArtifact): Buffer => {
  const names = Object.keys(blobs);
  const lengths = Object.fromEntries(names.map((name) => [name, blobs[name]!.byteLength]));
  const header = Buffer.from(JSON.stringify({ entity, blobs: lengths }), 'utf8');

  const prefix = Buffer.alloc(HEADER_LENGTH_BYTES);
  prefix.writeUInt32LE(header.byteLength);

  return Buffer.concat([prefix, header, ...names.map((name) => Buffer.from(blobs[name]!))]);
};

const readHeader = (body: Buffer): { header: ArtifactHeader; offset: number } => {
  if (body.byteLength < HEADER_LENGTH_BYTES) throw malformed('body is too short');

  const headerLength = body.readUInt32LE(0);
  const offset = HEADER_LENGTH_BYTES + headerLength;
  if (offset > body.byteLength) throw malformed('header length exceeds the body');

  try {
    const header: unknown = JSON.parse(body.toString('utf8', HEADER_LENGTH_BYTES, offset));
    if (typeof header !== 'object' || header === null) throw malformed('header is not an object');
    return { header: header as ArtifactHeader, offset };
  } catch (error) {
    throw error instanceof SyntaxError ? malformed('header is not valid JSON') : error;
  }
};

/** The declared byte length of each expected blob, in the order they were written. */
const readBlobLengths = (header: ArtifactHeader, names: readonly string[]): number[] => {
  const declared = (header.blobs ?? {}) as Record<string, unknown>;
  return names.map((name) => {
    const length = declared[name];
    if (typeof length !== 'number' || !Number.isInteger(length) || length < 0)
      throw malformed(`missing byte length for "${name}"`);
    return length;
  });
};

/**
 * Splits a request body back into metadata and blobs. Every failure is a 400 saying what did not
 * line up — a body whose declared lengths do not add up to the bytes received has been truncated
 * somewhere, and writing the prefix that did arrive would store a model that silently predicts
 * nonsense.
 */
export const decodeBinaryArtifact = (body: unknown, names: readonly string[]): BinaryArtifact => {
  if (!Buffer.isBuffer(body))
    throw httpError(400, 'Request body must be sent as application/octet-stream');

  const { header, offset } = readHeader(body);
  const entity = header.entity;
  if (typeof entity !== 'object' || entity === null || Array.isArray(entity))
    throw malformed('"entity" must be an object');

  const lengths = readBlobLengths(header, names);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (offset + total !== body.byteLength)
    throw malformed('declared blob lengths do not match the body');

  const blobs: Record<string, Uint8Array> = {};
  let at = offset;
  names.forEach((name, index) => {
    const length = lengths[index]!;
    blobs[name] = body.subarray(at, at + length);
    at += length;
  });

  return { entity: entity as Record<string, unknown>, blobs };
};
