/**
 * The wire format the trained auto-categoriser travels in (TICKET-SRV-05), mirroring
 * `server/src/http/binary-artifact.ts`.
 *
 * ```text
 * [uint32 LE header length][header JSON, UTF-8][blob 1][blob 2]…
 * header = { entity: { …non-blob fields… }, blobs: { name: byteLength, … } }
 * ```
 *
 * **Why not JSON.** `CategoryModelArtifact` carries three `ArrayBuffer`s of `Float32` weights,
 * megabytes of them. Base64 in a JSON body costs a third more bytes plus an encode/decode pass at
 * each end, and `JSON.stringify` on an `ArrayBuffer` produces `{}` — which is exactly how the
 * pre-v3 export silently lost every trained weight it ever wrote (TICKET-DAT-05's closing note).
 *
 * Hand-mirrored rather than shared, like every other wire type: `src/**` and `server/**` may not
 * import each other, and the repo-root `shared/` workspace is for what both sides *persist*.
 * The blob order is fixed by the `names` argument, which both sides pass identically.
 */

/** Bytes of the length prefix in front of the header. */
const HEADER_LENGTH_BYTES = 4;

export type BinaryArtifact = {
  /** The row's ordinary fields, as they would appear in a JSON body. */
  readonly entity: Record<string, unknown>;
  /** The blob columns, by name. */
  readonly blobs: Readonly<Record<string, ArrayBuffer>>;
};

export const encodeBinaryArtifact = (
  { entity, blobs }: BinaryArtifact,
  names: readonly string[],
): ArrayBuffer => {
  const lengths = Object.fromEntries(names.map((name) => [name, blobs[name]!.byteLength]));
  const header = new TextEncoder().encode(JSON.stringify({ entity, blobs: lengths }));
  const total = names.reduce((sum, name) => sum + lengths[name]!, 0);

  const body = new Uint8Array(HEADER_LENGTH_BYTES + header.byteLength + total);
  new DataView(body.buffer).setUint32(0, header.byteLength, true);
  body.set(header, HEADER_LENGTH_BYTES);

  let at = HEADER_LENGTH_BYTES + header.byteLength;
  for (const name of names) {
    body.set(new Uint8Array(blobs[name]!), at);
    at += lengths[name]!;
  }

  return body.buffer;
};

export const decodeBinaryArtifact = (
  body: ArrayBuffer,
  names: readonly string[],
): BinaryArtifact => {
  const headerLength = new DataView(body).getUint32(0, true);
  const start = HEADER_LENGTH_BYTES + headerLength;
  const header = JSON.parse(
    new TextDecoder().decode(new Uint8Array(body, HEADER_LENGTH_BYTES, headerLength)),
  ) as { entity: Record<string, unknown>; blobs: Record<string, number> };

  const blobs: Record<string, ArrayBuffer> = {};
  let at = start;
  for (const name of names) {
    const length = header.blobs[name] ?? 0;
    blobs[name] = body.slice(at, at + length);
    at += length;
  }

  // A body whose declared lengths do not add up has been truncated in transit, and a model
  // assembled from the prefix that did arrive would predict nonsense without ever saying so.
  if (at !== body.byteLength) throw new Error('Malformed binary artifact: unexpected body length');

  return { entity: header.entity, blobs };
};
