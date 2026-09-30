import { eq, getTableName, sql } from 'drizzle-orm';
import { Router } from 'express';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { httpError } from '../http/errors.js';
import { assertReferencesOwned } from '../http/ownership.js';
import {
  asArray,
  asRecord,
  asReplacement,
  parseEntityBody,
  toId,
  type EntityValues,
} from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import {
  clearUserRows,
  idOf,
  ownerOf,
  TRANSPORT_TABLES,
  type PerUserTable,
} from '../operations/user-rows.js';
import { transactions } from '../schema/transactions.js';
import { DERIVED_COLUMNS, deriveReimbursementTransferId } from './transactions.js';

/**
 * `/api/data` (TICKET-SRV-04) — export everything, import everything, delete everything, each over
 * the signed-in user's rows and each in one SQLite transaction. The endpoints behind
 * `DataManagementRepository` (FR-DAT-1/2/3).
 *
 * **The table list is derived, never written down.** The client's three operations were generic over
 * the whole database for exactly this reason: a table added later is covered without anyone
 * remembering this file. It lives in `operations/user-rows.ts`, which the admin panel's delete-user
 * endpoint shares (TICKET-AUTH-03).
 *
 * **`categoryModel` is exported and imported by `/api/categoryModel`, not here.** It is megabytes of
 * `Float32` weights in three blob columns, and a JSON document is the one shape they cannot survive
 * — `JSON.stringify` turns an `ArrayBuffer` into `{}`, which is how the pre-v3 export silently lost
 * every trained weight it ever wrote (recorded at the bottom of TICKET-DAT-05). A backup carries the
 * transactions the model is trained *from*, so what it costs is one retraining rather than any data.
 * A `replace` import still clears the row, because it is the user's previous dataset's model and
 * keeping it would leave a model claiming to describe transactions that are gone.
 */

/**
 * The shape of the data model an export declares, and the highest version this server will accept
 * back. It is **not** the migration count — `/api/health` reports that — because the number a backup
 * carries has to mean "which shape of the data model is this", which is the question `importAll` has
 * always asked it.
 *
 * It starts at 16 because that is the version the pre-v3 browser database had reached when
 * TICKET-SRV-02 ported its schema, so a backup written by that app imports here unchanged. Raise it
 * in the same change as any migration that alters what a document carries — `data.spec.ts` pins the
 * refusal of a higher number, not the number itself, since there is no second declaration of the
 * schema left to compare against.
 */
export const DATA_SCHEMA_VERSION = 16;

/** Columns the server computes, which are neither exported nor accepted back (`ParseOptions`). */
const derivedOf = (table: PerUserTable): readonly string[] =>
  table === (transactions as unknown as PerUserTable) ? DERIVED_COLUMNS : [];

const deriveFor = (table: PerUserTable, values: EntityValues): EntityValues =>
  table === (transactions as unknown as PerUserTable) ? deriveReimbursementTransferId(values) : {};

export type ImportMode = 'replace' | 'merge';

const MODES: readonly ImportMode[] = ['replace', 'merge'];

/** The document `GET /export` produces and `POST /import` consumes. */
type DataDocument = {
  readonly schemaVersion: number;
  readonly tables: Record<string, readonly unknown[]>;
};

const asMode = (value: unknown): ImportMode => {
  if (typeof value !== 'string' || !MODES.includes(value as ImportMode))
    throw httpError(400, `Invalid value for "mode": expected one of ${MODES.join(', ')}`);
  return value as ImportMode;
};

/**
 * The payload of `POST /import`, before any row of it meets a table. The document is exactly what
 * `GET /export` produced, so a backup file is uploaded as it stands rather than being reshaped.
 */
const asImportBody = (body: unknown): { mode: ImportMode; document: DataDocument } => {
  const { mode, data } = asRecord(body);
  const { schemaVersion, tables } = asRecord(data);

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1)
    throw httpError(400, 'Invalid value for "schemaVersion": expected an integer');

  // The guard `importAll` has always applied against `appDb.verno`, moved to the side that now owns
  // the schema: a backup from a newer data model may name columns this server has never heard of,
  // and the failure mode of trying anyway is a half-imported dataset.
  if (schemaVersion > DATA_SCHEMA_VERSION)
    throw httpError(
      400,
      `This backup was created with a newer database schema (v${schemaVersion}) than this server supports (v${DATA_SCHEMA_VERSION}). Update the server before importing.`,
    );

  const document = asRecord(tables);
  return {
    mode: asMode(mode),
    document: {
      schemaVersion,
      tables: Object.fromEntries(
        Object.entries(document).map(([name, rows]) => [name, asArray(rows)]),
      ),
    },
  };
};

/** Every row of one table that belongs to this user, in entity shape. */
const exportTable = (tx: DbOrTx, table: PerUserTable, userId: number): unknown[] =>
  (
    tx
      .select()
      .from(table)
      .where(eq(ownerOf(table), userId))
      .all() as Record<string, unknown>[]
  ).map((row) => toEntity(row, derivedOf(table)));

/** One validated row, written under this user with the id the document gave it. */
const upsertRow = (
  tx: DbOrTx,
  table: PerUserTable,
  values: EntityValues,
  id: number | undefined,
  userId: number,
): void => {
  const idColumn = idOf(table);
  const key = idColumn === undefined ? eq(ownerOf(table), userId) : eq(idColumn, id!);

  const existing = tx
    .select({ userId: ownerOf(table) })
    .from(table)
    .where(key)
    .get() as { userId: number } | undefined;

  // Ids are unique per table across all users here, where a browser database's were unique to its
  // one owner. Reconciling that is TICKET-SRV-07's job; refusing to overwrite a stranger's row is
  // this endpoint's, and a 409 says which row rather than letting the upsert land on it.
  if (existing !== undefined && existing.userId !== userId)
    throw httpError(
      409,
      `This backup cannot be imported as it stands: id ${id} in "${getTableName(table)}" already belongs to another account.`,
    );

  if (existing === undefined) {
    tx.insert(table)
      .values({ ...values, ...(id === undefined ? {} : { id }), userId } as never)
      .run();
    return;
  }

  // `merge` is a `bulkPut`: the document's row **replaces** the stored one, field for field.
  // `values` carries only the keys the document had, and `toEntity` strips nulls on the way out —
  // so setting it directly would be a patch, leaving a field the backup does not have standing on
  // the stored row. `asReplacement` fills the absent nullable columns back in as null, which is
  // what writing the whole object gives you, and what `merge` has always meant here.
  tx.update(table)
    .set(asReplacement(table, values) as never)
    .where(key)
    .run();
};

/** A row of the document, validated against its table and keyed by the id it carries. */
const parseRow = (
  table: PerUserTable,
  row: unknown,
  index: number,
): { values: EntityValues; id: number | undefined } => {
  const values = parseEntityBody(table, row, { mode: 'create', derived: derivedOf(table) });
  const withDerived = { ...values, ...deriveFor(table, values) };

  if (idOf(table) === undefined) return { values: withDerived, id: undefined };

  // Ids are preserved, not reassigned: `accountId`, `categoryId`, `transferId` and the rest point at
  // them, so a row that arrives without one is a row whose references cannot be honoured.
  const id = toId(asRecord(row)['id']);
  if (id === undefined)
    throw httpError(
      400,
      `Row ${index} of "${getTableName(table)}" has no id, so the rows referencing it could not be kept consistent.`,
    );

  return { values: withDerived, id };
};

/**
 * The whole document, in one transaction (NFR-RESIL-1): a failure anywhere — a malformed row, an id
 * that belongs to someone else, a reference to a row that is not in the document — leaves every
 * table exactly as it was.
 */
const importDocument = (
  db: DrizzleDb,
  { mode, document }: { mode: ImportMode; document: DataDocument },
  userId: number,
): void => {
  db.transaction((tx) => {
    // The document's rows reference each other in both directions and arrive in table order, so
    // per-statement foreign-key checks would reject a transaction that is perfectly consistent by
    // the time it commits. Deferring them moves the check to COMMIT, where it belongs. SQLite
    // clears this at the end of the transaction on its own.
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);

    if (mode === 'replace') clearUserRows(tx, userId);

    const written: { table: PerUserTable; values: EntityValues }[] = [];
    for (const table of TRANSPORT_TABLES) {
      // A name the document does not carry is an empty table, and one this schema does not have is
      // ignored — which is how a backup from a version with a since-dropped table still loads.
      const rows = document.tables[getTableName(table)] ?? [];
      rows.forEach((row, index) => {
        const { values, id } = parseRow(table, row, index);
        upsertRow(tx, table, values, id, userId);
        written.push({ table, values });
      });
    }

    // Ownership is checked **after** the writes and **inside** the transaction: a reference may
    // point at a row that is later in the document, so it can only be resolved once everything is
    // in — and by then it is still this transaction, so nothing can change hands before COMMIT.
    //
    // It also subsumes the deferred foreign keys: "a row this user owns" is strictly narrower than
    // "a row", so nothing reaches COMMIT with a reference SQLite would reject. What changes is the
    // envelope — `assertReferencesOwned` answers a *path* with 404, and a document is not a path,
    // so a dangling reference is reported as the malformed payload it is. The wording keeps the
    // 404 rule's intent: it does not say which of the two happened.
    for (const { table, values } of written) {
      try {
        assertReferencesOwned(tx, table, values, userId);
      } catch {
        throw httpError(
          400,
          `This backup cannot be imported: a row in "${getTableName(table)}" references a row that is not in the backup, or belongs to another account. Nothing was imported.`,
        );
      }
    }
  });
};

export const createDataRouter = (db: DrizzleDb): Router => {
  const router = Router();

  /** Every table read in one transaction, so the document is a single consistent moment. */
  router.get('/export', (req, res) => {
    const user = authUserOf(req);

    const tables = db.transaction((tx) =>
      Object.fromEntries(
        TRANSPORT_TABLES.map((table) => [getTableName(table), exportTable(tx, table, user.id)]),
      ),
    );

    res.json({
      schemaVersion: DATA_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      tables,
    });
  });

  router.post('/import', (req, res) => {
    const user = authUserOf(req);
    // Shape and version are checked before the transaction opens: neither depends on any row, and a
    // rejected document must not have had a `BEGIN` of its own.
    const payload = asImportBody(req.body);

    importDocument(db, payload, user.id);

    res.status(204).end();
  });

  /** FR-DAT-3, scoped: every row of the signed-in user, and nobody else's. */
  router.delete('/', (req, res) => {
    const user = authUserOf(req);

    db.transaction((tx) => {
      // `loans.categoryId` is NO ACTION, so clearing `categories` before `loans` would be refused
      // mid-transaction on an order that is otherwise nobody's business.
      tx.run(sql`PRAGMA defer_foreign_keys = ON`);
      clearUserRows(tx, user.id);
    });

    res.status(204).end();
  });

  return router;
};
