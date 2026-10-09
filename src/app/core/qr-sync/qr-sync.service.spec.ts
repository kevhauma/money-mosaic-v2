import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DataManagementRepository, type AppDataExport } from '@/core/data-access';
import { untilRequested, withApiTesting } from '@/core/data-access/api-client.testing';
import { QR_FORMAT_ID, QR_FRAME_CHAR_CEILING, parseQrFrame } from './qr-frames';
import { QrSyncService } from './qr-sync.service';

/** A payload big enough to need many frames, and varied enough that gzip can't flatten it away. */
const bigExport = (rows: number, schemaVersion = 14): AppDataExport => ({
  schemaVersion,
  exportedAt: '2026-08-27T10:00:00.000Z',
  tables: {
    accounts: [{ id: 1, name: 'Chequing', iban: 'BE68539007547034' }],
    transactions: Array.from({ length: rows }, (_, index) => ({
      id: index,
      accountId: 1,
      date: `2026-0${(index % 9) + 1}-1${index % 10}`,
      amount: Math.round(Math.sin(index) * 100_000) / 100,
      description: `Payment ${index} to counterparty ${(index * 7919) % 5000}`,
      counterparty: `Shop ${(index * 104_729) % 900}`,
    })),
  },
});

const shuffledFrames = (frames: string[]): Map<number, string> => {
  const collected = new Map<number, string>();
  // Deliberately not in index order: a real scanner catches whatever the loop happens to be on.
  for (const position of [...frames.keys()].sort(
    (left, right) => ((left * 7) % 11) - ((right * 7) % 11),
  )) {
    const frame = parseQrFrame(frames[position]);
    collected.set(frame?.index ?? position, frames[position]);
  }
  return collected;
};

describe('QrSyncService: encode', () => {
  const service = new QrSyncService();

  it('round-trips a multi-frame export back to the original object', async () => {
    const data = bigExport(400);
    const frames = await service.encode(data, { includeRawRows: true });

    expect(frames.length).toBeGreaterThan(1);
    // Encoded with the raw CSV carried, so the round trip has to be exact.
    expect((await service.decode(shuffledFrames(frames))).data).toEqual(data);
  });

  it('leaves the source-CSV fields behind by default, and says which it dropped', async () => {
    const data = bigExport(400);
    data.tables['transactions'] = (data.tables['transactions'] as Record<string, unknown>[]).map(
      (row, index) => ({ ...row, rawLine: `line ${index}`, rawRow: { Bedrag: String(index) } }),
    );

    const lean = await service.encode(data);
    const full = await service.encode(data, { includeRawRows: true });
    const received = await service.decode(new Map(lean.map((frame, index) => [index, frame])));

    expect(lean.length).toBeLessThan(full.length);
    expect(received.omitted).toEqual({ transactions: ['rawLine', 'rawRow'] });
    expect(received.data.tables['transactions'][0]).not.toHaveProperty('rawLine');
    expect(received.data.tables['transactions']).toHaveLength(400);
  });

  it('keeps every emitted frame inside the scannable character ceiling', async () => {
    const frames = await service.encode(bigExport(2000));

    expect(frames.length).toBeGreaterThan(5);
    for (const frame of frames) {
      expect(frame.length).toBeLessThanOrEqual(QR_FRAME_CHAR_CEILING);
    }
  });

  it('emits exactly one frame for a payload that fits in a single code', async () => {
    const frames = await service.encode({
      schemaVersion: 14,
      exportedAt: '2026-08-27T10:00:00.000Z',
      tables: { accounts: [] },
    });

    expect(frames).toHaveLength(1);
    expect(parseQrFrame(frames[0])?.total).toBe(1);
  });

  it('compresses — the frames carry far less than the raw JSON', async () => {
    const data = bigExport(400);
    const frames = await service.encode(data);
    const carried = frames.reduce((total, frame) => total + frame.length, 0);

    expect(carried).toBeLessThan(JSON.stringify(data).length);
  });
});

describe('QrSyncService: decode', () => {
  const service = new QrSyncService();

  it('rejects a corrupted payload on the checksum, before anything is parsed', async () => {
    const frames = await service.encode(bigExport(400));
    const tampered = new Map(frames.map((frame, index) => [index, frame]));
    const victim = parseQrFrame(frames[1]);
    tampered.set(
      1,
      [QR_FORMAT_ID, victim?.transferId, 1, victim?.total, victim?.checksum, 'AAAA'].join('|'),
    );

    await expect(service.decode(tampered)).rejects.toThrow(/checksum/i);
  });

  it('rejects frames that came from two different transfers', async () => {
    const first = await service.encode(bigExport(400));
    const second = await service.encode(bigExport(400));
    const mixed = new Map(first.map((frame, index) => [index, frame]));
    mixed.set(1, second[1]);

    await expect(service.decode(mixed)).rejects.toThrow(/different transfers/i);
  });

  it('rejects a code that is not a Money Mosaic transfer frame', async () => {
    await expect(service.decode(new Map([[0, 'https://example.com']]))).rejects.toThrow(
      /not a Money Mosaic transfer frame/i,
    );
  });

  it('refuses an incomplete transfer rather than importing a partial database', async () => {
    const frames = await service.encode(bigExport(400));
    const partial = new Map(frames.slice(0, -1).map((frame, index) => [index, frame]));

    await expect(service.decode(partial)).rejects.toThrow(/incomplete/i);
  });

  it('refuses an empty scan', async () => {
    await expect(service.decode(new Map())).rejects.toThrow(/No transfer frames/i);
  });
});

describe('QrSyncService: the schema-version guard applies to QR payloads too', () => {
  withApiTesting();

  /**
   * The guard itself moved to the side that owns the schema (TICKET-SRV-04): the import refuses a
   * document from a newer data model **before** its transaction opens, so nothing is written. What
   * is still this service's business is that a QR-delivered document reaches the server unchanged —
   * version and all — and that the refusal arrives back as a rejection carrying the sentence the
   * user is shown.
   *
   * Since TICKET-SRV-11 the document travels as staged bytes and the refusal comes back on the
   * second request, so "unchanged" is asserted against what was staged rather than against a JSON
   * body. A QR transfer is far too small to need staging — 250 frames is a quarter of a megabyte —
   * but it shares the one import path on purpose, so it is this path it has to survive.
   */
  it('hands a newer-schema export to the endpoint unchanged, and surfaces its refusal', async () => {
    const service = new QrSyncService();
    const repository = TestBed.inject(DataManagementRepository);
    const http = TestBed.inject(HttpTestingController);
    const frames = await service.encode(bigExport(50, 99));

    const { data } = await service.decode(new Map(frames.map((frame, index) => [index, frame])));
    expect(data.schemaVersion).toBe(99);

    const settled = repository.importAll(data, 'merge');

    const staged = http.expectOne('/api/data/import/staged');
    const document = JSON.parse(await (staged.request.body as Blob).text()) as AppDataExport;
    expect(document.schemaVersion).toBe(99);
    staged.flush({ uploadId: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' });

    await untilRequested();

    http.expectOne('/api/data/import').flush(
      {
        error:
          'This backup was created with a newer database schema (v99) than this server supports (v16). Update the server before importing.',
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(settled).rejects.toThrow(/newer database schema/i);
  });
});
