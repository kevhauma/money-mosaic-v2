import { Injectable } from '@angular/core';
import type { AppDataExport } from '@/core/data-access';
import { decodePayload, encodePayload } from './qr-payload-codec';
import { buildQrFrames, fnv1aHex, newTransferId, parseQrFrame, type QrFrame } from './qr-frames';
import {
  fromTransferPayload,
  toTransferPayload,
  type QrTransferPayload,
} from './qr-transfer-payload';

/** What a completed scan yields: the export itself, plus what the sender chose to leave behind. */
export type QrTransferResult = {
  data: AppDataExport;
  /** Table name → fields the sender omitted. Empty when the whole database came across. */
  omitted: Record<string, string[]>;
};

export type QrEncodeOptions = {
  /**
   * Carry `rawLine`/`rawRow` — TICKET-TXN-06's copy of the source CSV — across as well. Off by
   * default: measured at ~68% of the compressed payload, for one audit table on the transaction
   * detail view. An 8,000-transaction database is ~217 frames without them and ~804 with.
   */
  includeRawRows: boolean;
};

/**
 * A second transport for the export/import machinery of TICKET-DAT-01: instead of writing a JSON
 * file and carrying it between devices, one browser blinks the export across the screen as QR
 * frames and the other reads them back through its camera. Nothing crosses a network — the payload
 * leaves the sending device as photons.
 *
 * This service owns the wire format and the chunking so the sender and scanner components stay
 * thin. It never writes anything: a decoded export goes into `DataManagementRepository.importAll`
 * through the same Replace-vs-Merge confirmation the file import uses, version guard included.
 */
@Injectable({ providedIn: 'root' })
export class QrSyncService {
  /** Export → transfer payload → gzip → Base64url → fixed-size frames, one string per QR symbol. */
  encode = async (
    data: AppDataExport,
    options: QrEncodeOptions = { includeRawRows: false },
  ): Promise<string[]> => {
    const payload = await encodePayload(JSON.stringify(toTransferPayload(data, options)));
    return buildQrFrames(payload, newTransferId());
  };

  /**
   * Reassembles frames (keyed by index, in any order) back into the original export. Throws with a
   * message worth showing the user on a foreign frame, a mixed-up transfer, a gap in the sequence,
   * or a checksum mismatch — so a corrupted scan is refused before any import is attempted.
   */
  decode = async (frames: Map<number, string>): Promise<QrTransferResult> => {
    const parsed = this.parseAll(frames);
    const [first] = parsed;

    if (
      parsed.some((frame) => frame.transferId !== first.transferId || frame.total !== first.total)
    ) {
      throw new Error(
        'The scanned codes came from two different transfers. Start the transfer again and scan only one screen.',
      );
    }
    if (parsed.length !== first.total) {
      throw new Error(
        `The transfer is incomplete — ${parsed.length} of ${first.total} frames were scanned.`,
      );
    }

    const ordered = [...parsed].sort((left, right) => left.index - right.index);
    if (ordered.some((frame, position) => frame.index !== position)) {
      throw new Error('The transfer is missing a frame. Keep scanning until every frame is in.');
    }

    const payload = ordered.map((frame) => frame.chunk).join('');
    if (fnv1aHex(payload) !== first.checksum) {
      throw new Error(
        'The scanned data failed its checksum, so nothing was imported. Run the transfer again.',
      );
    }

    const transfer = JSON.parse(await decodePayload(payload)) as QrTransferPayload;
    return { data: fromTransferPayload(transfer), omitted: transfer.omitted ?? {} };
  };

  private parseAll(frames: Map<number, string>): [QrFrame, ...QrFrame[]] {
    const parsed: QrFrame[] = [];
    for (const text of frames.values()) {
      const frame = parseQrFrame(text);
      if (!frame) {
        throw new Error('One of the scanned codes is not a Money Mosaic transfer frame.');
      }
      parsed.push(frame);
    }

    const [first, ...rest] = parsed;
    if (!first) throw new Error('No transfer frames were scanned.');
    return [first, ...rest];
  }
}
