import type { AppDataExport } from '@/core/data-access';

/**
 * The shape that actually goes through the QR codes — not `AppDataExport` itself.
 *
 * Two transforms sit between the export and the compressor, both aimed at the same problem: an
 * 8,000-transaction database gzips to ~757 KB as plain `AppDataExport` JSON, which is 829 frames
 * and far past what anyone will hold a phone still for.
 *
 * 1. **Bulk fields are dropped unless asked for.** `rawLine` and `rawRow` (TICKET-TXN-06's copy of
 *    the source CSV, stored twice per transaction) are ~68% of the compressed payload on their own
 *    — measured, not estimated. They feed one audit table on the transaction detail view and
 *    nothing else, so a transfer leaves them behind by default.
 * 2. **Rows go columnar.** One key list per table plus one value array per row, instead of
 *    repeating every key name on every row. Worth a further ~18% *after* step 1 — on its own it is
 *    worth almost nothing, because the raw CSV strings drown the key names out.
 *
 * Together: 829 frames → ~217 for the same database.
 */

/** `[keys, rows]` — every row is that table's values in `keys` order. */
export type QrTable = readonly [readonly string[], readonly unknown[][]];

export type QrTransferPayload = {
  /** Payload shape version, independent of the Dexie `schemaVersion` the export carries. */
  v: 1;
  schemaVersion: number;
  exportedAt: string;
  /** Table name → fields deliberately left out, so the receiving side can say so out loud. */
  omitted: Record<string, string[]>;
  tables: Record<string, QrTable>;
};

const PAYLOAD_VERSION = 1;

/**
 * Fields big enough to dominate a transfer and cheap enough to lose — omitted unless the sender
 * opts in. Keyed by table so a future bulk field elsewhere joins the list without new logic.
 */
export const OPTIONAL_BULK_FIELDS: Readonly<Record<string, readonly string[]>> = {
  transactions: ['rawLine', 'rawRow'],
};

/**
 * Marks a value absent, since a JSON array cannot hold `undefined` (it serialises to `null`, which
 * is a legitimate stored value in its own right — `trainingWindowYears`, for one). A real string
 * starting with the sentinel is escaped by doubling it, so the encoding stays lossless for any
 * input, including notes a user somehow typed a NUL into.
 */
const ABSENT = '\u0000';

const escape = (value: unknown): unknown =>
  typeof value === 'string' && value.startsWith(ABSENT) ? ABSENT + value : value;

const unescape = (value: unknown): unknown =>
  typeof value === 'string' && value.startsWith(ABSENT) ? value.slice(1) : value;

const toColumns = (rows: readonly unknown[], omit: readonly string[]): QrTable => {
  const keys: string[] = [];
  const seen = new Set<string>(omit);
  for (const row of rows) {
    for (const key of Object.keys(row as object)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }

  const values = rows.map((row) =>
    keys.map((key) => {
      const value = (row as Record<string, unknown>)[key];
      return value === undefined ? ABSENT : escape(value);
    }),
  );
  return [keys, values];
};

const fromColumns = ([keys, rows]: QrTable): unknown[] =>
  rows.map((values) => {
    const row: Record<string, unknown> = {};
    for (let index = 0; index < keys.length; index++) {
      const value = values[index];
      if (value !== ABSENT) row[keys[index]] = unescape(value);
    }
    return row;
  });

export const toTransferPayload = (
  data: AppDataExport,
  options: { includeRawRows: boolean },
): QrTransferPayload => {
  const omitted: Record<string, string[]> = {};
  const tables: Record<string, QrTable> = {};

  for (const [name, rows] of Object.entries(data.tables)) {
    const omit = options.includeRawRows ? [] : (OPTIONAL_BULK_FIELDS[name] ?? []);
    // Only claim a field was omitted when the table actually carried it.
    const dropped = omit.filter((field) =>
      rows.some((row) => (row as Record<string, unknown>)[field] !== undefined),
    );
    if (dropped.length) omitted[name] = dropped;
    tables[name] = toColumns(rows, omit);
  }

  return {
    v: PAYLOAD_VERSION,
    schemaVersion: data.schemaVersion,
    exportedAt: data.exportedAt,
    omitted,
    tables,
  };
};

export const fromTransferPayload = (payload: QrTransferPayload): AppDataExport => {
  if (payload.v !== PAYLOAD_VERSION) {
    throw new Error(
      `This transfer uses a payload format (v${String(payload.v)}) this app does not understand. Update both devices to the same version.`,
    );
  }

  const tables: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(payload.tables)) {
    tables[name] = fromColumns(table);
  }
  return { schemaVersion: payload.schemaVersion, exportedAt: payload.exportedAt, tables };
};
