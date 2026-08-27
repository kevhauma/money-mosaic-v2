import { Injectable } from '@angular/core';

/**
 * Camera side of a QR data transfer: opens the rear camera, watches its frames for QR codes, and
 * hands every decoded string to a callback. Nothing about the wire format lives here — the caller
 * feeds what comes out into a `QrFrameCollector`.
 *
 * Decoding prefers the browser's own `BarcodeDetector` (Chromium). Everywhere else a pure-JS
 * decoder is pulled in with a dynamic `import()` at the moment scanning starts, so it never lands
 * in the initial bundle.
 */

/** How often a video frame is inspected. Faster than the sender's frame rate, so nothing is missed. */
const SCAN_INTERVAL_MS = 60;

export type QrScannerFailure =
  'insecure-context' | 'permission-denied' | 'no-camera' | 'unavailable';

/** Carries a `reason` so the UI can react to *which* failure it was, not just print a string. */
export class QrCameraError extends Error {
  constructor(
    readonly reason: QrScannerFailure,
    message: string,
  ) {
    super(message);
    this.name = 'QrCameraError';
  }
}

type QrDetector = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>;

type BarcodeDetection = { rawValue: string };
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<BarcodeDetection[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const nativeDetector = (): QrDetector | null => {
  const constructor = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  if (!constructor) return null;

  const detector = new constructor({ formats: ['qr_code'] });
  return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
};

const fallbackDetector = async (): Promise<QrDetector> => {
  const { default: jsQR } = await import('jsqr');
  return async (video, canvas) => {
    const context = canvas.getContext('2d');
    if (!context || !video.videoWidth || !video.videoHeight) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    return (
      jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null
    );
  };
};

const asCameraError = (error: unknown): QrCameraError => {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new QrCameraError(
      'permission-denied',
      'Camera access was blocked. Allow the camera for this site in your browser, then try again.',
    );
  }
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  ) {
    return new QrCameraError(
      'no-camera',
      'No camera was found on this device. Use the file export and import instead.',
    );
  }
  return new QrCameraError(
    'unavailable',
    error instanceof Error ? error.message : 'The camera could not be started.',
  );
};

const requestCameraStream = async (): Promise<MediaStream> => {
  // `getUserMedia` is only exposed in a secure context — https, or localhost. Reaching a dev
  // server by LAN IP from a phone does *not* qualify, which is exactly the setup people try first.
  if (!globalThis.isSecureContext) {
    throw new QrCameraError(
      'insecure-context',
      'Your browser only allows camera access over HTTPS or on localhost. Open this app on localhost or over HTTPS to scan.',
    );
  }

  const media = navigator.mediaDevices as MediaDevices | undefined;
  if (!media?.getUserMedia) {
    throw new QrCameraError(
      'unavailable',
      "This browser doesn't support camera access. Use the file export and import instead.",
    );
  }

  try {
    return await media.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (error) {
    throw asCameraError(error);
  }
};

/**
 * Component-scoped, not `providedIn: 'root'` — one live camera belongs to one open dialog, and a
 * fresh instance torn down with its host is what keeps the track-release discipline honest (the
 * `ImportWizardSession` pattern from the coding-conventions skill).
 */
@Injectable()
export class QrCameraScanner {
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  /** Bumped by every `start` and every `stop`, so a run interrupted mid-await knows to bow out. */
  private generation = 0;

  async start(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    onText: (text: string) => void,
  ): Promise<void> {
    const generation = ++this.generation;
    const stream = await requestCameraStream();

    // `stop()` can land while the permission prompt is still up; release what we were just handed
    // rather than storing a track nobody will ever turn off.
    if (generation !== this.generation) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }

    this.stream = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // An autoplay refusal (or jsdom's unimplemented stub) doesn't stop frames being readable.
    }

    const detect = await this.resolveDetector();
    if (generation !== this.generation) return;

    if (!detect) {
      this.stop();
      throw new QrCameraError(
        'unavailable',
        "This browser can't decode QR codes. Use the file export and import instead.",
      );
    }

    this.timer = setInterval(() => void this.tick(video, canvas, detect, onText), SCAN_INTERVAL_MS);
  }

  /** Idempotent: clears the scan timer and releases every track, so the camera light goes out. */
  stop(): void {
    this.generation++;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }
    this.stream = null;
  }

  private resolveDetector(): Promise<QrDetector | null> {
    const native = nativeDetector();
    return native ? Promise.resolve(native) : fallbackDetector().catch(() => null);
  }

  private async tick(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    detect: QrDetector,
    onText: (text: string) => void,
  ): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const text = await detect(video, canvas);
      if (text) onText(text);
    } catch {
      // A frame the decoder chokes on is routine — the next one is 60ms away.
    } finally {
      this.busy = false;
    }
  }
}
