/**
 * The wire format for a QR data transfer — one frame per QR symbol, all of it plain ASCII so the
 * symbol stays in byte mode with no encoding surprises:
 *
 * ```
 * MMQR2|4f2a91bc|12|60|9a3c1e07|<chunk>
 * ──┬── ────┬─── ─┬ ─┬ ────┬─── ───┬───
 *   │       │     │  │     │       └ this frame's slice of the Base64url payload
 *   │       │     │  │     └ FNV-1a checksum (8 hex) of the WHOLE Base64url payload
 *   │       │     │  └ number of frames in the transfer
 *   │       │     └ 0-based position of this chunk
 *   │       └ transfer id (8 hex) — tells two transfers shown back to back apart
 *   └ format id + version — a foreign QR code is rejected before anything else is parsed
 * ```
 *
 * The checksum covers the whole payload rather than each chunk on purpose: there is no
 * back-channel from the scanner to the sender, so a transfer can only ever be accepted or
 * rejected as a unit (per-frame repair would need a fountain code — see the ticket's notes).
 */

export const QR_FORMAT_ID = 'MMQR2';

/**
 * Hard ceiling on the length of a whole frame string, header included — the one number that makes
 * a frame scannable. A QR symbol at error-correction level M holds 2,331 bytes at its densest
 * (version 40, byte mode), so this leaves close to half the symbol spare: deliberately, because a
 * phone camera reads a sparser symbol off a screen far more reliably than a maximally dense one.
 */
export const QR_FRAME_CHAR_CEILING = 1280;

/** Widest header this format can produce: `MMQR2` + 8-hex id + 4-digit index + 4-digit total +
 * 8-hex checksum + the five separators. Four digits each is headroom — {@link QR_MAX_FRAMES}
 * needs three. */
const MAX_HEADER_CHARS = QR_FORMAT_ID.length + 8 + 4 + 4 + 8 + 5;

/**
 * Base64url payload characters carried by one frame. Derived from the ceiling rather than picked
 * alongside it, so the two can never drift into emitting a frame no camera can read.
 */
export const QR_CHUNK_CHARS = QR_FRAME_CHAR_CEILING - MAX_HEADER_CHARS;

/**
 * Refuse to start a transfer longer than this. At {@link QR_FRAME_INTERVAL_MS} a full pass over
 * 250 frames already takes ~31s, and the scanner needs more than one pass to catch stragglers.
 */
export const QR_MAX_FRAMES = 250;

/** How long each frame stays on screen (~8 fps) — slow enough for a phone camera to catch. */
export const QR_FRAME_INTERVAL_MS = 125;

export type QrFrame = {
  transferId: string;
  index: number;
  total: number;
  checksum: string;
  chunk: string;
};

const HEX_8 = /^[0-9a-f]{8}$/;

/** FNV-1a (32-bit), as 8 lowercase hex characters. Not cryptographic — this catches corruption. */
export const fnv1aHex = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const newTransferId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/** Splits a Base64url payload into frames, each one a complete, self-describing QR frame string. */
export const buildQrFrames = (payload: string, transferId: string): string[] => {
  const checksum = fnv1aHex(payload);
  const total = Math.max(1, Math.ceil(payload.length / QR_CHUNK_CHARS));
  const frames: string[] = [];
  for (let index = 0; index < total; index++) {
    const chunk = payload.slice(index * QR_CHUNK_CHARS, (index + 1) * QR_CHUNK_CHARS);
    frames.push([QR_FORMAT_ID, transferId, index, total, checksum, chunk].join('|'));
  }
  return frames;
};

/** Returns `null` for anything that is not a well-formed frame of this format. */
export const parseQrFrame = (text: string): QrFrame | null => {
  const parts = text.split('|');
  if (parts.length !== 6 || parts[0] !== QR_FORMAT_ID) return null;

  const [, transferId, rawIndex, rawTotal, checksum, chunk] = parts;
  if (!HEX_8.test(transferId) || !HEX_8.test(checksum)) return null;

  const index = Number(rawIndex);
  const total = Number(rawTotal);
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (total < 1 || index < 0 || index >= total) return null;

  return { transferId, index, total, checksum, chunk };
};

/**
 * Accumulates the frames of one transfer as they are scanned. The sender loops forever and has no
 * way of knowing what the scanner already has, so frames arrive out of order and over and over;
 * the collector keeps one copy per index and ignores anything from a different transfer.
 */
export class QrFrameCollector {
  private readonly frames = new Map<number, string>();
  private header: { transferId: string; total: number } | null = null;

  get transferId(): string | null {
    return this.header?.transferId ?? null;
  }

  get total(): number | null {
    return this.header?.total ?? null;
  }

  get collected(): number {
    return this.frames.size;
  }

  get isComplete(): boolean {
    return this.header !== null && this.frames.size === this.header.total;
  }

  /** `true` when the text belonged to the transfer in progress — whether new or a duplicate. */
  accept(text: string): boolean {
    const frame = parseQrFrame(text);
    if (!frame) return false;

    this.header ??= { transferId: frame.transferId, total: frame.total };
    if (frame.transferId !== this.header.transferId || frame.total !== this.header.total) {
      return false;
    }

    this.frames.set(frame.index, text);
    return true;
  }

  /** The frames collected so far, keyed by index — the shape `QrSyncService.decode` takes. */
  snapshot(): Map<number, string> {
    return new Map(this.frames);
  }

  reset(): void {
    this.frames.clear();
    this.header = null;
  }
}
