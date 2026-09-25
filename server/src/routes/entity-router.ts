import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { Router, type Request } from 'express';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { httpError, notFound } from '../http/errors.js';
import { assertReferencesOwned } from '../http/ownership.js';
import { parseEntityBody, toId, type EntityValues } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';

/**
 * The shared router behind every uniform entity (TICKET-SRV-03): `GET /`, `GET /:id`, `POST /`,
 * `PATCH /:id`, `DELETE /:id`, all scoped to the signed-in user.
 *
 * **Why a factory here, when duplication is usually the cheaper mistake.** Ten near-identical
 * routers rot differently in each copy, and the thing they would all be repeating — `where userId
 * = ? and id = ?` — is the one clause that must never be wrong. Written once, it is also *tested*
 * once against every table (`entity-router.spec.ts` drives the whole registry), which a copy per
 * entity could never claim.
 *
 * A per-entity router extends this rather than replacing it: it registers its own routes on its
 * own `Router` and mounts this one underneath, so a literal path like `/count` or `/bulk` is
 * matched before `/:id` ever sees it. The three `…OwnedRow` helpers below are the same write path
 * those extensions reuse, which is what lets a bulk endpoint be a loop inside one transaction
 * rather than a second implementation of the same rules.
 */

/** A per-user entity table: a surrogate `id` and the owner column every query filters on. */
export type OwnedTable = SQLiteTable & {
  readonly id: SQLiteColumn;
  readonly userId: SQLiteColumn;
};

/** Extra columns the server computes from a validated body (see `ParseOptions.derived`). */
export type DeriveColumns = (values: EntityValues) => EntityValues;

export type EntityRouterOptions = {
  readonly db: DrizzleDb;
  readonly table: OwnedTable;
  /** Extra `where` terms for `GET /`, from query parameters the entity supports. */
  readonly listFilter?: (req: Request) => readonly SQL[];
  /** Columns the server writes itself: rejected in a body, hidden from a response. */
  readonly derived?: readonly string[];
  /**
   * Computes those columns. Called with the validated body, so a patch that does not touch the
   * source field returns nothing and leaves the stored value alone.
   */
  readonly derive?: DeriveColumns;
};

/** Rows of this table belonging to this user, and nothing else. */
const ownedBy = (table: OwnedTable, userId: number, extra: readonly SQL[] = []): SQL =>
  and(eq(table.userId, userId), ...extra)!;

const rowWithId = (table: OwnedTable, id: number, userId: number): SQL =>
  and(eq(table.id, id), eq(table.userId, userId))!;

/**
 * The validated values, cast once. `parseEntityBody` has already checked that every key is a
 * column of this table and every value fits that column's type; Drizzle's insert/update types are
 * per-table and this module is deliberately table-agnostic, so the cast lives here rather than at
 * each of the five statements below.
 */
const write = (values: EntityValues): never => values as never;

export const selectOwnedRow = (
  tx: DbOrTx,
  table: OwnedTable,
  id: number,
  userId: number,
): Record<string, unknown> | undefined =>
  tx
    .select()
    .from(table)
    .where(rowWithId(table, id, userId))
    .get() as Record<string, unknown> | undefined;

/**
 * Inserts one validated body as a row owned by `userId`, after checking that every foreign key it
 * carries points at a row the same user owns — a mismatch is a 404 (`assertReferencesOwned`).
 */
export const insertOwnedRow = (
  tx: DbOrTx,
  table: OwnedTable,
  values: EntityValues,
  userId: number,
  derive?: DeriveColumns,
): Record<string, unknown> => {
  assertReferencesOwned(tx, table, values, userId);
  return tx
    .insert(table)
    .values(write({ ...values, ...derive?.(values), userId }))
    .returning()
    .get() as Record<string, unknown>;
};

/** Patches one row, or returns `undefined` when this user has no row with that id. */
export const updateOwnedRow = (
  tx: DbOrTx,
  table: OwnedTable,
  id: number,
  values: EntityValues,
  userId: number,
  derive?: DeriveColumns,
): Record<string, unknown> | undefined => {
  assertReferencesOwned(tx, table, values, userId);

  const changes = { ...values, ...derive?.(values) };
  // A patch that names no field is not an error; it just has nothing to write.
  if (Object.keys(changes).length === 0) return selectOwnedRow(tx, table, id, userId);

  return tx
    .update(table)
    .set(write(changes))
    .where(rowWithId(table, id, userId))
    .returning()
    .get() as Record<string, unknown> | undefined;
};

/** Deletes one row, reporting whether this user had one with that id. */
export const deleteOwnedRow = (
  tx: DbOrTx,
  table: OwnedTable,
  id: number,
  userId: number,
): boolean =>
  tx
    .delete(table)
    .where(rowWithId(table, id, userId))
    .returning({ id: table.id })
    .get() !== undefined;

/**
 * `GET /?ids=1,2,3` — the endpoint behind `TransfersRepository.getByIds`, and available on every
 * entity because it is the same question the list endpoint already answers with a narrower `where`.
 * A malformed entry is a 400: silently dropping it would answer with the wrong set of rows, and
 * silently ignoring the whole parameter would answer with all of them.
 */
const idsFilter = (table: OwnedTable, req: Request): SQL[] => {
  const raw = req.query['ids'];
  if (raw === undefined) return [];

  const parts = String(raw)
    .split(',')
    .filter((part) => part !== '');
  const ids = parts.map((part) => {
    const id = toId(part);
    if (id === undefined)
      throw httpError(400, 'Invalid value for "ids": expected a comma-separated list of integers');
    return id;
  });

  // `?ids=` with nothing after it asks for no rows, which is not the same as asking for all of
  // them — `bulkGet([])` returns `[]` and so must this.
  return ids.length === 0 ? [sql`1 = 0`] : [inArray(table.id, ids)];
};

/** The `:id` of a request, or a 404 — a path segment that is not an id names no row. */
const idOf = (req: Request): number => {
  const id = toId(req.params['id']);
  if (id === undefined) throw notFound();
  return id;
};

export const createEntityRouter = ({
  db,
  table,
  listFilter,
  derived,
  derive,
}: EntityRouterOptions): Router => {
  const router = Router();

  router.get('/', (req, res) => {
    const user = authUserOf(req);
    const rows = db
      .select()
      .from(table)
      .where(ownedBy(table, user.id, [...idsFilter(table, req), ...(listFilter?.(req) ?? [])]))
      .all() as Record<string, unknown>[];

    res.json(rows.map((row) => toEntity(row, derived)));
  });

  router.get('/:id', (req, res) => {
    const user = authUserOf(req);
    const row = selectOwnedRow(db, table, idOf(req), user.id);
    if (row === undefined) throw notFound();

    res.json(toEntity(row, derived));
  });

  router.post('/', (req, res) => {
    const user = authUserOf(req);
    const values = parseEntityBody(table, req.body, { mode: 'create', derived });

    // The reference check and the insert share a transaction, so a row cannot change hands in
    // between.
    const created = db.transaction((tx) => insertOwnedRow(tx, table, values, user.id, derive));

    res.status(201).json(toEntity(created, derived));
  });

  router.patch('/:id', (req, res) => {
    const user = authUserOf(req);
    const id = idOf(req);
    const values = parseEntityBody(table, req.body, { mode: 'patch', derived });

    const updated = db.transaction((tx) => updateOwnedRow(tx, table, id, values, user.id, derive));
    if (updated === undefined) throw notFound();

    res.json(toEntity(updated, derived));
  });

  router.delete('/:id', (req, res) => {
    const user = authUserOf(req);
    if (!deleteOwnedRow(db, table, idOf(req), user.id)) throw notFound();

    res.status(204).end();
  });

  return router;
};
