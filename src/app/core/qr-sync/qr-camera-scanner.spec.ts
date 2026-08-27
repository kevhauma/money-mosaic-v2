import { vi } from 'vitest';
import { QrCameraError, QrCameraScanner } from './qr-camera-scanner';

type FakeTrack = { stop: ReturnType<typeof vi.fn> };

const fakeStream = (trackCount = 2): { stream: MediaStream; tracks: FakeTrack[] } => {
  const tracks: FakeTrack[] = Array.from({ length: trackCount }, () => ({ stop: vi.fn() }));
  return { stream: { getTracks: () => tracks } as unknown as MediaStream, tracks };
};

const namedError = (name: string): Error => Object.assign(new Error(name), { name });

const setMediaDevices = (getUserMedia: unknown): void => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: getUserMedia === undefined ? undefined : { getUserMedia },
    configurable: true,
  });
};

/** Stands in for Chromium's native detector, handing back whatever the test queued. */
const stubBarcodeDetector = (queue: string[]): void => {
  vi.stubGlobal(
    'BarcodeDetector',
    class {
      detect(): Promise<{ rawValue: string }[]> {
        const next = queue.shift();
        return Promise.resolve(next === undefined ? [] : [{ rawValue: next }]);
      }
    },
  );
};

const elements = (): { video: HTMLVideoElement; canvas: HTMLCanvasElement } => ({
  video: document.createElement('video'),
  canvas: document.createElement('canvas'),
});

/** Starts a scanner that is expected to fail, and hands back the error it threw. */
const failureOf = async (scanner: QrCameraScanner): Promise<QrCameraError> => {
  const { video, canvas } = elements();
  try {
    await scanner.start(video, canvas, () => {});
  } catch (error) {
    return error as QrCameraError;
  }
  throw new Error('expected the scanner to refuse to start');
};

describe('QrCameraScanner: failure modes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setMediaDevices(undefined);
  });

  it('names an insecure context rather than asking for a camera it cannot get', async () => {
    vi.stubGlobal('isSecureContext', false);

    const failure = await failureOf(new QrCameraScanner());

    expect(failure).toBeInstanceOf(QrCameraError);
    expect(failure.reason).toBe('insecure-context');
    expect(failure.message).toMatch(/HTTPS or on localhost/i);
  });

  it('distinguishes a denied permission from a missing camera', async () => {
    vi.stubGlobal('isSecureContext', true);

    setMediaDevices(vi.fn().mockRejectedValue(namedError('NotAllowedError')));
    const denied = await failureOf(new QrCameraScanner());

    setMediaDevices(vi.fn().mockRejectedValue(namedError('NotFoundError')));
    const missing = await failureOf(new QrCameraScanner());

    expect(denied.reason).toBe('permission-denied');
    expect(denied.message).toMatch(/blocked/i);
    expect(missing.reason).toBe('no-camera');
    expect(missing.message).toMatch(/No camera was found/i);
    expect(denied.message).not.toBe(missing.message);
  });

  it('says so plainly when the browser has no camera API at all', async () => {
    vi.stubGlobal('isSecureContext', true);
    setMediaDevices(undefined);

    const failure = await failureOf(new QrCameraScanner());

    expect(failure.reason).toBe('unavailable');
  });
});

describe('QrCameraScanner: camera lifetime', () => {
  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setMediaDevices(undefined);
  });

  it('reads codes off the camera and stops every track when told to stop', async () => {
    const { stream, tracks } = fakeStream();
    setMediaDevices(vi.fn().mockResolvedValue(stream));
    stubBarcodeDetector(['MMQR2|abcdef01|0|1|9a3c1e07|payload']);
    const seen: string[] = [];
    const scanner = new QrCameraScanner();
    const { video, canvas } = elements();

    await scanner.start(video, canvas, (text) => seen.push(text));
    await vi.advanceTimersByTimeAsync(200);

    expect(seen).toEqual(['MMQR2|abcdef01|0|1|9a3c1e07|payload']);

    scanner.stop();
    await vi.advanceTimersByTimeAsync(500);

    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true);
    // The scan timer is gone too, so nothing keeps polling a dead stream.
    expect(seen).toHaveLength(1);
  });

  it('is safe to stop twice — tracks are released once and the scanner stays quiet', async () => {
    const { stream, tracks } = fakeStream(1);
    setMediaDevices(vi.fn().mockResolvedValue(stream));
    stubBarcodeDetector([]);
    const scanner = new QrCameraScanner();
    const { video, canvas } = elements();

    await scanner.start(video, canvas, () => {});
    scanner.stop();
    scanner.stop();

    expect(tracks[0].stop).toHaveBeenCalledTimes(1);
  });

  it('releases a stream handed over after stop() — a permission prompt outlives a cancel', async () => {
    const { stream, tracks } = fakeStream();
    const scanner = new QrCameraScanner();
    let grantPermission: (value: MediaStream) => void = () => {};
    setMediaDevices(
      vi.fn().mockReturnValue(
        new Promise<MediaStream>((resolve) => {
          grantPermission = resolve;
        }),
      ),
    );
    stubBarcodeDetector([]);
    const { video, canvas } = elements();

    const starting = scanner.start(video, canvas, () => {});
    scanner.stop(); // user hit Cancel while the browser prompt was still up
    grantPermission(stream);
    await starting;

    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true);
  });
});
