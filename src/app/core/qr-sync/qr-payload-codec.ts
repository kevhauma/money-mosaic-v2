/**
 * Payload codec for QR transfers: JSON text ⇄ a Base64url string small enough to blink across a
 * screen. Compression is the platform's own `CompressionStream('gzip')` — no dependency, and the
 * same algorithm on both sides of the transfer.
 *
 * NOTE: the stream plumbing here deliberately avoids `Blob.stream()` and `Response.arrayBuffer()`,
 * however much shorter they would read. jsdom implements neither, so the whole codec (and every
 * spec that round-trips through it) would only be runnable in a real browser.
 */

/** `String.fromCharCode(...spread)` blows the call stack on large arrays; feed it in slices. */
const BINARY_CHUNK = 0x2000;

const streamOf = (bytes: Uint8Array): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

const readAll = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.length;
  }

  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

const through = (bytes: Uint8Array, transform: GenericTransformStream): Promise<Uint8Array> =>
  readAll(streamOf(bytes).pipeThrough(transform as ReadableWritablePair<Uint8Array, Uint8Array>));

export const gzipBytes = (bytes: Uint8Array): Promise<Uint8Array> =>
  through(bytes, new CompressionStream('gzip'));

export const gunzipBytes = (bytes: Uint8Array): Promise<Uint8Array> =>
  through(bytes, new DecompressionStream('gzip'));

export const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BINARY_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BINARY_CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const fromBase64Url = (text: string): Uint8Array => {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

/** UTF-8 text → gzip → Base64url. */
export const encodePayload = async (text: string): Promise<string> =>
  toBase64Url(await gzipBytes(new TextEncoder().encode(text)));

/** Base64url → gunzip → UTF-8 text. */
export const decodePayload = async (payload: string): Promise<string> =>
  new TextDecoder().decode(await gunzipBytes(fromBase64Url(payload)));
