import { getTableColumns, getTableName } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { httpError } from './errors.js';
import { JSON_ARRAY_COLUMNS } from '../schema/columns.js';

/**
 * Request-body validation for the entity API (TICKET-SRV-03), derived from the Drizzle table
 * rather than declared per endpoint.
 *
 * **This is a data-integrity measure, not a security one.** The client is trusted — it is the
 * app's own repository layer — but a shape mismatch after a refactor should fail loudly at the
 * boundary, naming the field, instead of writing a row that reads back broken three screens away.
 *
 * Deriving it from `getTableColumns` is what keeps that promise true for a column added later: a
 * hand-written schema per entity would be a second definition of the data model, and the day it
 * drifted from the first is the day this stops validating anything. The tables in turn are held to
 * the shared entity types by `schema/entities.spec.ts`, so the chain ends at `shared/entities.ts`.
 */

/** Values keyed by Drizzle **property** name (which is also the column name on every table here). */
export type EntityValues = Record<string, unknown>;

/**
 * Fields a body may carry and the server always ignores. `userId` comes from the session and from
 * nowhere else, so honouring one in a body would be the whole cross-user isolation hole; `id` is
 * assigned by SQLite, and honouring a supplied one would let a client collide with a row it cannot
 * see. Both are *ignored* rather than rejected, because a client that round-trips an entity it
 * just read will carry an `id` without meaning anything by it.
 */
const IGNORED_FIELDS = new Set(['id', 'userId']);

export type ParseOptions = {
  /** `create` additionally requires every NOT NULL column without a default. */
  readonly mode: 'create' | 'patch';
  /**
   * Columns the server computes for itself (`transactions.reimbursementTransferId`). They are not
   * fields of the shared entity type, so a body naming one is as malformed as one naming a column
   * that does not exist — and unlike `id`, no response ever hands one back to be round-tripped.
   */
  readonly derived?: readonly string[];
};

const columnsOf = (table: SQLiteTable): Record<string, SQLiteColumn> =>
  getTableColumns(table) as Record<string, SQLiteColumn>;

/** What the 400 says the field should have been — the column's own type, in words. */
const expectationOf = (column: SQLiteColumn): string => {
  const { enumValues } = column;
  if (enumValues !== undefined && enumValues.length > 0) return `one of ${enumValues.join(', ')}`;

  switch (column.dataType) {
    case 'number':
      return column.columnType === 'SQLiteInteger' ? 'an integer' : 'a number';
    case 'string':
      return 'a string';
    case 'boolean':
      return 'a boolean';
    case 'json':
      return JSON_ARRAY_COLUMNS.has(column.name) ? 'an array' : 'an object';
    case 'buffer':
      return 'binary data';
    default:
      return 'a supported value';
  }
};

/**
 * Whether a value may be stored in a column. The CHECK constraints in the schema would reject an
 * out-of-union string anyway, but only as a constraint failure — a 500 whose message the client is
 * never allowed to see. Checking the union here is what turns that into a 400 naming the field.
 */
const accepts = (column: SQLiteColumn, value: unknown): boolean => {
  const { enumValues } = column;
  if (enumValues !== undefined && enumValues.length > 0)
    return typeof value === 'string' && enumValues.includes(value);

  switch (column.dataType) {
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        (column.columnType !== 'SQLiteInteger' || Number.isInteger(value))
      );
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'json':
      if (typeof value !== 'object' || value === null) return false;
      // `$type<T>` is erased at runtime, so without the recorded shape a `number[]` column would
      // accept `{}` — a 200 whose body makes `.includes()` throw in the browser.
      return JSON_ARRAY_COLUMNS.has(column.name) === Array.isArray(value);
    case 'buffer':
      return value instanceof Uint8Array;
    default:
      return false;
  }
};

const invalid = (key: string, column: SQLiteColumn) =>
  httpError(400, `Invalid value for "${key}": expected ${expectationOf(column)}`);

/** A JSON body has to be an object before any field of it can be wrong. */
const asRecord = (body: unknown): Record<string, unknown> => {
  // Express leaves `req.body` undefined when a request carries no body at all, which is a valid
  // empty patch rather than a malformed one.
  if (body === undefined) return {};
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    throw httpError(400, 'Request body must be a JSON object');
  return body as Record<string, unknown>;
};

/** Every NOT NULL column the caller has to supply — the ones SQLite has no default for. */
const assertRequiredPresent = (
  columns: Record<string, SQLiteColumn>,
  values: EntityValues,
  derived: readonly string[],
): void => {
  for (const [key, column] of Object.entries(columns)) {
    if (IGNORED_FIELDS.has(key) || derived.includes(key)) continue;
    if (!column.notNull || column.hasDefault) continue;
    if (values[key] === undefined) throw httpError(400, `Missing required field "${key}"`);
  }
};

/**
 * Validates a request body against a table and returns the values to write, keyed by column.
 * Throws a 400 naming the offending field for an unknown one, a malformed one, or (on `create`) a
 * missing required one — and writes nothing, because it runs before the statement is built.
 */
export const parseEntityBody = (
  table: SQLiteTable,
  body: unknown,
  { mode, derived = [] }: ParseOptions,
): EntityValues => {
  const columns = columnsOf(table);
  const values: EntityValues = {};

  for (const [key, value] of Object.entries(asRecord(body))) {
    if (IGNORED_FIELDS.has(key)) continue;

    const column = columns[key];
    if (column === undefined || derived.includes(key))
      throw httpError(400, `Unknown field "${key}" for ${getTableName(table)}`);

    if (value === null || value === undefined) {
      // An explicit null clears an optional field — which is how the client's `undefined` arrives
      // once JSON has dropped it on the way out.
      if (column.notNull) throw invalid(key, column);
      values[key] = null;
      continue;
    }

    if (!accepts(column, value)) throw invalid(key, column);
    values[key] = value;
  }

  if (mode === 'create') assertRequiredPresent(columns, values, derived);
  return values;
};

/**
 * Fills in an explicit `null` for every optional column the caller left out, turning a validated
 * body into a **replacement** for the whole row rather than a patch of it. `SalaryMetadataRepository
 * .upsert` is a Dexie `put`, so its endpoint has to mean "this is the row now", clearing a note the
 * caller omitted instead of quietly keeping the old one.
 */
export const asReplacement = (table: SQLiteTable, values: EntityValues): EntityValues => {
  const replacement: EntityValues = { ...values };
  for (const [key, column] of Object.entries(columnsOf(table))) {
    if (IGNORED_FIELDS.has(key) || column.notNull) continue;
    replacement[key] ??= null;
  }
  return replacement;
};

/**
 * A row id, from a path segment, a query string or a bulk payload — `undefined` for anything that
 * is not a positive integer. Ids are assigned by SQLite and start at 1, so `0`, `-3`, `1.5` and
 * `"abc"` all name no row rather than a row that might exist.
 */
export const toId = (value: unknown): number | undefined => {
  // Digits only. Bare `Number()` would also accept `0x10` as 16, `1e1` as 10, and ` 1`/`+1` as 1 —
  // reinterpreting an id the caller did not write, where the contract is that a malformed entry is
  // rejected rather than silently turned into some other row.
  const id = typeof value === 'string' ? (/^\d+$/.test(value) ? Number(value) : NaN) : value;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : undefined;
};

/**
 * An `?accountId=` style filter. Absent is "no filter"; present but not an integer is a 400 naming
 * the parameter, since silently ignoring it would answer with the whole table.
 */
export const parseIdQuery = (query: unknown, name: string): number | undefined => {
  const raw = (query as Record<string, unknown> | undefined)?.[name];
  if (raw === undefined) return undefined;

  const id = typeof raw === 'string' ? toId(raw) : undefined;
  if (id === undefined) throw httpError(400, `Invalid value for "${name}": expected an integer`);
  return id;
};
