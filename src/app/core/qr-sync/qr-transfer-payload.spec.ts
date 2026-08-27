import type { AppDataExport } from '@/core/data-access';
import { gzipBytes } from './qr-payload-codec';
import {
  OPTIONAL_BULK_FIELDS,
  fromTransferPayload,
  toTransferPayload,
  type QrTransferPayload,
} from './qr-transfer-payload';

const NUL = '\u0000';

const exportOf = (
  transactions: unknown[],
  extra: Record<string, unknown[]> = {},
): AppDataExport => ({
  schemaVersion: 16,
  exportedAt: '2026-08-27T10:00:00.000Z',
  tables: { transactions, ...extra },
});

const rawRow = (index: number): Record<string, string> => ({
  Rekeningnummer: 'BE68539007547034',
  Datum: `2026-01-${(index % 28) + 1}`,
  Omschrijving: `BETALING MET KAART HANDELAAR ${(index * 7919) % 900} BVBA`,
  Bedrag: `-${((index * 13) % 9000) / 100}`,
  'Naam tegenpartij': `HANDELAAR ${(index * 7919) % 900} BVBA`,
});

const transaction = (index: number): Record<string, unknown> => ({
  id: index,
  accountId: (index % 4) + 1,
  bookingDate: `2026-01-${(index % 28) + 1}`,
  amount: -(((index * 13) % 9000) / 100),
  currency: 'EUR',
  rawDescription: `BETALING MET KAART HANDELAAR ${(index * 7919) % 900} BVBA`,
  fingerprint: (index * 2654435761).toString(16),
  createdAt: '2026-01-01T00:00:00.000Z',
  // Optionals present on only some rows, so the columnar key union has holes to represent.
  ...(index % 3 === 0 ? { categoryId: (index % 25) + 1, categoryManual: true } : {}),
  ...(index % 5 === 0 ? { notes: `note ${index}` } : {}),
  rawLine: `BE68539007547034;2026-01-${(index % 28) + 1};BETALING MET KAART HANDELAAR ${(index * 7919) % 900} BVBA;-${((index * 13) % 9000) / 100}`,
  rawRow: rawRow(index),
});

const rows = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, index) => transaction(index));

const gzippedSize = async (value: unknown): Promise<number> =>
  (await gzipBytes(new TextEncoder().encode(JSON.stringify(value)))).length;

describe('qr-transfer-payload: round trip', () => {
  it('restores every row exactly when the raw CSV fields are carried', () => {
    const data = exportOf(rows(40));

    const restored = fromTransferPayload(toTransferPayload(data, { includeRawRows: true }));

    expect(restored).toEqual(data);
  });

  it('keeps an absent optional absent rather than turning it into null', () => {
    const data = exportOf([
      { id: 1, amount: 10 },
      { id: 2, amount: 20, categoryId: 7 },
    ]);

    const [first, second] = fromTransferPayload(toTransferPayload(data, { includeRawRows: true }))
      .tables['transactions'] as Record<string, unknown>[];

    expect('categoryId' in first).toBe(false);
    expect(second['categoryId']).toBe(7);
  });

  it('preserves a stored null, which is a value in its own right', () => {
    const data = exportOf([], { categoryModelSettings: [{ id: 1, trainingWindowYears: null }] });

    const [row] = fromTransferPayload(toTransferPayload(data, { includeRawRows: true })).tables[
      'categoryModelSettings'
    ] as Record<string, unknown>[];

    expect('trainingWindowYears' in row).toBe(true);
    expect(row['trainingWindowYears']).toBeNull();
  });

  it('round-trips a string that collides with the absent-value sentinel', () => {
    const data = exportOf([
      { id: 1, notes: NUL },
      { id: 2, notes: `${NUL}leading sentinel` },
      { id: 3, notes: 'ordinary' },
    ]);

    const restored = fromTransferPayload(toTransferPayload(data, { includeRawRows: true }));

    expect(restored.tables['transactions']).toEqual(data.tables['transactions']);
  });

  it('preserves nested objects and every table it does not know about', () => {
    const data = exportOf([{ id: 1, attributionOverride: { mode: 'shared', jointAccountId: 2 } }], {
      somethingAddedLater: [{ id: 1, nested: { deep: [1, 2, 3] } }],
    });

    expect(fromTransferPayload(toTransferPayload(data, { includeRawRows: true }))).toEqual(data);
  });

  it('refuses a payload shape it does not understand instead of importing nonsense', () => {
    const alien = { ...toTransferPayload(exportOf([]), { includeRawRows: true }), v: 99 };

    expect(() => fromTransferPayload(alien as unknown as QrTransferPayload)).toThrow(
      /payload format/i,
    );
  });
});

describe('qr-transfer-payload: omitting the bulk fields', () => {
  it('drops rawLine and rawRow by default and reports what it dropped', () => {
    const payload = toTransferPayload(exportOf(rows(20)), { includeRawRows: false });

    expect(payload.omitted).toEqual({ transactions: ['rawLine', 'rawRow'] });
    expect(payload.tables['transactions'][0]).not.toContain('rawLine');
    expect(payload.tables['transactions'][0]).not.toContain('rawRow');

    const restored = fromTransferPayload(payload);
    for (const row of restored.tables['transactions'] as Record<string, unknown>[]) {
      expect('rawLine' in row).toBe(false);
      expect('rawRow' in row).toBe(false);
      // Everything that isn't the source CSV still arrives.
      expect(row['fingerprint']).toEqual(expect.any(String));
      expect(row['amount']).toEqual(expect.any(Number));
    }
  });

  it('reports nothing omitted when the table never carried the field', () => {
    const payload = toTransferPayload(exportOf([{ id: 1, amount: 5 }]), { includeRawRows: false });

    expect(payload.omitted).toEqual({});
  });

  it('lists the fields it may drop, so the UI copy and the encoder cannot drift', () => {
    expect(OPTIONAL_BULK_FIELDS['transactions']).toEqual(['rawLine', 'rawRow']);
  });
});

describe('qr-transfer-payload: size', () => {
  it('is the reason for the whole module — both transforms have to actually pay off', async () => {
    // `rawRow` here has 5 columns; a real bank CSV has three times that, so the saving in
    // production is larger than what these bounds pin.
    const data = exportOf(rows(2000));

    const asIs = await gzippedSize(data);
    const columnarOnly = await gzippedSize(toTransferPayload(data, { includeRawRows: true }));
    const lean = await gzippedSize(toTransferPayload(data, { includeRawRows: false }));

    // The whole module has to earn its keep.
    expect(lean).toBeLessThan(asIs * 0.5);
    // Dropping the source CSV is the dominant win...
    expect(lean).toBeLessThan(columnarOnly * 0.6);
    // ...and going columnar on its own is almost worthless, because the raw CSV strings drown the
    // repeated key names out. That asymmetry is the finding this module is built on, so pin it.
    expect(columnarOnly).toBeGreaterThan(asIs * 0.9);
    expect(columnarOnly).toBeLessThan(asIs);
  });
});
