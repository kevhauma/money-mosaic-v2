import {
  decodePayload,
  encodePayload,
  fromBase64Url,
  gunzipBytes,
  gzipBytes,
  toBase64Url,
} from './qr-payload-codec';

const bytesOf = (values: number[]): Uint8Array => Uint8Array.from(values);

describe('qr-payload-codec: Base64url', () => {
  it('restores the stripped padding at every remainder, so every payload length round-trips', () => {
    // Lengths 1..4 cover byte counts that Base64-encode to 2, 3, 4 and 4+2 characters — i.e. every
    // `length % 4` the padding-stripped encoding can produce.
    for (let length = 1; length <= 8; length++) {
      const bytes = bytesOf(Array.from({ length }, (_, index) => (index * 37 + 200) % 256));
      const encoded = toBase64Url(bytes);

      expect(encoded).not.toContain('=');
      expect(encoded).not.toMatch(/[+/]/);
      expect(Array.from(fromBase64Url(encoded))).toEqual(Array.from(bytes));
    }
  });

  it('uses the URL-safe alphabet for the bytes that would otherwise produce + and /', () => {
    // Standard Base64 gives "++++" for the first triple and "/+++" for the second.
    expect(toBase64Url(bytesOf([0xfb, 0xef, 0xbe]))).toBe('----');
    expect(toBase64Url(bytesOf([0xff, 0xef, 0xbe]))).toBe('_---');
  });

  it('encodes a payload larger than one chunking pass of the binary loop', () => {
    // The loop slices at 0x2000 bytes to keep `String.fromCharCode(...)` off the call stack limit;
    // this is the only case that exercises more than a single slice.
    const bytes = bytesOf(Array.from({ length: 0x2000 * 3 + 17 }, (_, index) => index % 256));

    expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
  });
});

describe('qr-payload-codec: gzip', () => {
  it('round-trips bytes through the platform compressor', async () => {
    const bytes = new TextEncoder().encode('the same sentence, over and over. '.repeat(200));

    const compressed = await gzipBytes(bytes);

    expect(compressed.length).toBeLessThan(bytes.length / 10);
    expect(Array.from(await gunzipBytes(compressed))).toEqual(Array.from(bytes));
  });

  it('rejects data that is not gzip rather than returning nonsense', async () => {
    await expect(gunzipBytes(bytesOf([1, 2, 3, 4, 5, 6, 7, 8]))).rejects.toThrow();
  });
});

describe('qr-payload-codec: encodePayload', () => {
  it('round-trips text, including multi-byte characters', async () => {
    const text = JSON.stringify({ note: 'Café — naïve €10 🏦', rows: Array.from({ length: 50 }) });

    expect(await decodePayload(await encodePayload(text))).toBe(text);
  });

  it('produces a payload shorter than the text it carries, even after Base64 expansion', async () => {
    const text = JSON.stringify(
      Array.from({ length: 400 }, (_, index) => ({ id: index, description: 'Supermarket' })),
    );

    expect((await encodePayload(text)).length).toBeLessThan(text.length);
  });
});
