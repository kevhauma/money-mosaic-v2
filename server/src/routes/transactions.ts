import { count, eq, type SQL } from 'drizzle-orm';
import { Router, type Request } from 'express';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import type { DrizzleDb } from '../db.js';
import { httpError, notFound } from '../http/errors.js';
import { parseEntityBody, parseIdQuery, toId } from '../http/validate.js';
import type { HttpError } from '../middleware/error-handler.js';
import { authUserOf } from '../middleware/require-auth.js';
import { transactions } from '../schema/transactions.js';
import {
  createEntityRouter,
  deleteOwnedRow,
  insertOwnedRow,
  updateOwnedRow,
  type DeriveColumns,
} from './entity-router.js';

/**
 * `/api/transactions` (TICKET-SRV-03) — the shared entity router, plus the four reads and three
 * bulk writes `TransactionsRepository` has that no other repository does.
 *
 * The extra reads are **query parameters on the list endpoint** rather than sibling paths
 * (`/by-account/:id`): they are the same "give me this user's transactions" question with a
 * narrower `where`, and as parameters they compose — `?accountId=&importBatchId=` needs no third
 * route.
 *
 * The bulk writes each run in **one** SQLite transaction. A CSV import's worth of rows half
 * written is worse than none written: the client would have no way to tell which half, and the
 * duplicate fingerprints would fight the next import.
 */

/**
 * `attributionOverride.reimbursementTransferId`, kept in a column of its own so the lookup behind
 * `getByReimbursementTransferId` is an index seek rather than a scan of a JSON column (the index
 * Dexie has carried since TICKET-PERF-03). It is not a field of `Transaction` — the client sends
 * and reads the nested object — so the server writes it and hides it, and a body naming it is
 * rejected like any other unknown field.
 */
const DERIVED_COLUMNS = ['reimbursementTransferId'] as const;

type AttributionOverride = { reimbursementTransferId?: number } | null;

const deriveReimbursementTransferId: DeriveColumns = (values) => {
  // Only when the override itself is being written: a patch that leaves it alone must leave the
  // extracted copy alone too, or every unrelated patch would blank it.
  if (!('attributionOverride' in values)) return {};

  const override = values['attributionOverride'] as AttributionOverride;
  const raw = override?.reimbursementTransferId;
  if (raw === undefined || raw === null) return { reimbursementTransferId: null };

  // This column is written by the server, so it never passes through `parseEntityBody` — and
  // SQLite's INTEGER affinity keeps an unconvertible value as TEXT rather than rejecting it, which
  // would permanently break the index seek this column exists for. So it is checked here, with the
  // same "names the field" 400 the rest of the body gets.
  const id = toId(raw);
  if (id === undefined)
    throw httpError(
      400,
      'Invalid value for "attributionOverride.reimbursementTransferId": expected a positive integer',
    );

  return { reimbursementTransferId: id };
};

/** `?accountId=`, `?importBatchId=`, `?reimbursementTransferId=` — absent means "no filter". */
const listFilter = (req: Request): SQL[] => {
  const filters: [string, SQLiteColumn][] = [
    ['accountId', transactions.accountId],
    ['importBatchId', transactions.importBatchId],
    ['reimbursementTransferId', transactions.reimbursementTransferId],
  ];

  return filters.flatMap(([name, column]) => {
    const value = parseIdQuery(req.query, name);
    return value === undefined ? [] : [eq(column, value)];
  });
};

const asArray = (body: unknown): unknown[] => {
  if (!Array.isArray(body)) throw httpError(400, 'Request body must be an array');
  return body;
};

/**
 * Re-labels a deliberate 4xx with the batch position that caused it, so "expected a number" points
 * at one of four hundred rows. A 5xx is left exactly as it is — its message never reaches a client
 * and rewriting it would only obscure the log.
 */
const atItem = (index: number, error: unknown): unknown => {
  const status = (error as HttpError | null)?.status;
  if (typeof status !== 'number' || status >= 500) return error;
  return httpError(status, `${(error as Error).message} (item ${index})`);
};

const inItem = <T>(index: number, run: () => T): T => {
  try {
    return run();
  } catch (error) {
    throw atItem(index, error);
  }
};

const asId = (value: unknown): number => {
  const id = toId(value);
  if (id === undefined) throw httpError(400, 'Invalid value for "id": expected an integer');
  return id;
};

type BulkUpdate = { readonly id: number; readonly changes: unknown };

/** One `{ id, changes }` of a bulk patch, before its `changes` meet the table. */
const asBulkUpdate = (item: unknown): BulkUpdate => {
  const { id, changes } = (item ?? {}) as Partial<Record<keyof BulkUpdate, unknown>>;
  return { id: asId(id), changes };
};

export const createTransactionsRouter = (db: DrizzleDb): Router => {
  const router = Router();

  // Registered before the shared router, so `/count` and `/bulk` are matched as themselves rather
  // than as a `/:id` that is not an id.
  router.get('/count', (req, res) => {
    const user = authUserOf(req);
    const row = db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .get();

    res.json({ count: row?.value ?? 0 });
  });

  router.post('/bulk', (req, res) => {
    const user = authUserOf(req);
    const items = asArray(req.body);

    // Parsing happens *inside* the transaction: a malformed row at the end must roll back the ones
    // before it, not leave them written while the response says the batch failed.
    const ids = db.transaction((tx) =>
      items.map((item, index) =>
        inItem(index, () => {
          const values = parseEntityBody(transactions, item, {
            mode: 'create',
            derived: DERIVED_COLUMNS,
          });
          const row = insertOwnedRow(
            tx,
            transactions,
            values,
            user.id,
            deriveReimbursementTransferId,
          );
          return row['id'] as number;
        }),
      ),
    );

    res.status(201).json({ ids });
  });

  router.patch('/bulk', (req, res) => {
    const user = authUserOf(req);
    const items = asArray(req.body);

    const updated = db.transaction((tx) =>
      items.map((item, index) =>
        inItem(index, () => {
          const { id, changes } = asBulkUpdate(item);
          const values = parseEntityBody(transactions, changes, {
            mode: 'patch',
            derived: DERIVED_COLUMNS,
          });
          const row = updateOwnedRow(
            tx,
            transactions,
            id,
            values,
            user.id,
            deriveReimbursementTransferId,
          );
          if (row === undefined) throw notFound();
          return id;
        }),
      ),
    );

    // Rows, not items: two items naming the same id are one changed row, and a client
    // reconciling against its own optimistic update needs the row count.
    res.json({ updated: new Set(updated).size });
  });

  router.delete('/bulk', (req, res) => {
    const user = authUserOf(req);
    const items = asArray(req.body);

    db.transaction((tx) =>
      items.map((item, index) =>
        inItem(index, () => {
          const id = asId(item);
          if (!deleteOwnedRow(tx, transactions, id, user.id)) throw notFound();
          return id;
        }),
      ),
    );

    res.status(204).end();
  });

  router.use(
    createEntityRouter({
      db,
      table: transactions,
      listFilter,
      derived: DERIVED_COLUMNS,
      derive: deriveReimbursementTransferId,
    }),
  );

  return router;
};
