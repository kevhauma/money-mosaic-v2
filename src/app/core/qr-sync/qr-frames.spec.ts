import {
  QR_CHUNK_CHARS,
  QR_FORMAT_ID,
  QR_FRAME_CHAR_CEILING,
  QrFrameCollector,
  buildQrFrames,
  fnv1aHex,
  newTransferId,
  parseQrFrame,
} from './qr-frames';

const payloadOf = (length: number): string => 'A'.repeat(length);

describe('qr-frames: buildQrFrames', () => {
  it('keeps every frame inside the scannable character ceiling', () => {
    const frames = buildQrFrames(payloadOf(QR_CHUNK_CHARS * 12 + 7), 'abcdef01');

    expect(frames).toHaveLength(13);
    for (const frame of frames) {
      expect(frame.length).toBeLessThanOrEqual(QR_FRAME_CHAR_CEILING);
    }
  });

  it('leaves the chunk size in the range a level-M symbol reads reliably off a screen', () => {
    // The ticket's working target; a later tweak that drops out of it needs a real camera test.
    expect(QR_CHUNK_CHARS).toBeGreaterThanOrEqual(1200);
    expect(QR_CHUNK_CHARS).toBeLessThanOrEqual(1600);
  });

  it('produces exactly one frame for a payload that fits in one chunk', () => {
    expect(buildQrFrames(payloadOf(QR_CHUNK_CHARS), 'abcdef01')).toHaveLength(1);
    expect(buildQrFrames('', 'abcdef01')).toHaveLength(1);
  });

  it('stamps every frame with the same transfer id and whole-payload checksum', () => {
    const payload = payloadOf(QR_CHUNK_CHARS * 3);
    const frames = buildQrFrames(payload, 'abcdef01').map((frame) => parseQrFrame(frame));

    expect(frames.every((frame) => frame?.transferId === 'abcdef01')).toBe(true);
    expect(frames.every((frame) => frame?.checksum === fnv1aHex(payload))).toBe(true);
    expect(frames.map((frame) => frame?.index)).toEqual([0, 1, 2]);
  });

  it('mints a fresh 8-hex transfer id each time', () => {
    expect(newTransferId()).toMatch(/^[0-9a-f]{8}$/);
    expect(newTransferId()).not.toBe(newTransferId());
  });
});

describe('qr-frames: parseQrFrame', () => {
  it('rejects anything that is not a frame of this format', () => {
    expect(parseQrFrame('https://example.com')).toBeNull();
    expect(parseQrFrame('OTHER|abcdef01|0|1|9a3c1e07|data')).toBeNull();
    expect(parseQrFrame(`${QR_FORMAT_ID}|abcdef01|0|1|9a3c1e07`)).toBeNull();
    expect(parseQrFrame(`${QR_FORMAT_ID}|NOTHEX!!|0|1|9a3c1e07|data`)).toBeNull();
    expect(parseQrFrame(`${QR_FORMAT_ID}|abcdef01|3|2|9a3c1e07|data`)).toBeNull();
    expect(parseQrFrame(`${QR_FORMAT_ID}|abcdef01|x|2|9a3c1e07|data`)).toBeNull();
  });
});

describe('qr-frames: QrFrameCollector', () => {
  const frames = buildQrFrames(payloadOf(QR_CHUNK_CHARS * 2 + 5), 'abcdef01');

  it('accepts frames out of order and ignores repeats, since the sender loops forever', () => {
    const collector = new QrFrameCollector();

    for (const frame of [frames[2], frames[0], frames[2], frames[2]]) {
      expect(collector.accept(frame)).toBe(true);
    }

    expect(collector.collected).toBe(2);
    expect(collector.total).toBe(3);
    expect(collector.isComplete).toBe(false);

    collector.accept(frames[1]);
    expect(collector.isComplete).toBe(true);
    expect([...collector.snapshot().keys()].sort()).toEqual([0, 1, 2]);
  });

  it('ignores frames belonging to a different transfer', () => {
    const collector = new QrFrameCollector();
    const other = buildQrFrames(payloadOf(QR_CHUNK_CHARS * 2 + 5), 'facefeed');

    collector.accept(frames[0]);
    expect(collector.accept(other[1])).toBe(false);
    expect(collector.accept('not a frame at all')).toBe(false);

    expect(collector.transferId).toBe('abcdef01');
    expect(collector.collected).toBe(1);
  });

  it('forgets the transfer in progress on reset', () => {
    const collector = new QrFrameCollector();
    collector.accept(frames[0]);
    collector.reset();

    expect(collector.collected).toBe(0);
    expect(collector.transferId).toBeNull();
    expect(collector.total).toBeNull();
  });
});
