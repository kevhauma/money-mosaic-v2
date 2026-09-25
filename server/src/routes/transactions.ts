import { count, eq, inArray, type SQL } from 'drizzle-orm';
import { Router, type Request } from 'express';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import type { DrizzleDb } from '../db.js';
import { httpError, notFound } from '../http/errors.js';
import {
  asArray,
  asBulkUpdate,
  asId,
  asRecord,
  inItem,
  parseEntityBody,
  parseIdQuery,
  toId,
} from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import {
  doomedTransactions,
  removeTransactionsWithTransferCleanup,
} from '../operations/transfer-cleanup.js';
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
 *
 * `POST /delete` joins them in TICKET-SRV-04: deleting transactions is not one table's business,
 * because every transfer that linked one of them has to be unpicked in the same transaction.
 */

/** What every cleanup-shaped endpoint answers for a selection that turns out to be empty. */
const EMPTY_CLEANUP = {
  removedTransactionIds: [],
  unlinkedTransferIds: [],
  clearedTransferTransactionIds: [],
} as const;

/**
 * `attributionOverride.reimbursementTransferId`, kept in a column of its own so the lookup behind
 * `getByReimbursementTransferId` is an index seek rather than a scan of a JSON column (the index
 * Dexie has carried since TICKET-PERF-03). It is not a field of `Transaction` — the client sends
 * and reads the nested object — so the server writes it and hides it, and a body naming it is
 * rejected like any other unknown field.
 */
export const DERIVED_COLUMNS = ['reimbursementTransferId'] as const;

type AttributionOverride = { reimbursementTransferId?: number } | null;

/**
 * Exported because the import commit (TICKET-SRV-04) writes transactions too, and a row written
 * through a different endpoint must land with the same extracted column as one written here — or
 * `getByReimbursementTransferId` would miss it.
 */
export const deriveReimbursementTransferId: DeriveColumns = (values) => {
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

  /**
   * `POST /delete` — the operation behind `TransactionDeletionService.removeMany` (TICKET-SRV-04).
   *
   * Not `DELETE /bulk`, which deletes rows and nothing else: this one additionally repairs every
   * transfer that touched them, which is three tables' worth of writes and the reason it has to be
   * one endpoint. `POST` because the response is the cleanup report the stores mirror, and a body
   * on a `DELETE` is already the odd corner of the bulk endpoint above.
   */
  router.post('/delete', (req, res) => {
    const user = authUserOf(req);
    const requested = asArray(asRecord(req.body)['ids']).map((value, index) =>
      inItem(index, () => asId(value)),
    );
    const ids = [...new Set(requested)];

    const result = db.transaction((tx) => {
      if (ids.length === 0) return EMPTY_CLEANUP;

      // Read **inside** the transaction, so ownership established here cannot be revoked between
      // the check and the delete two statements later. The query is user-scoped, so an id this
      // user does not own simply does not come back.
      //
      // An id that matches nothing is **skipped, not refused** — matching `bulkDelete`, which this
      // replaces, and which is a no-op on a key that is not there. Refusing the whole request
      // would fail a stale selection wholesale: a row deleted in another tab, or one whose import
      // batch was just undone, is exactly the case the bulk-action bar hits. The two reasons an id
      // matches nothing — never existed, or belongs to someone else — are indistinguishable from
      // the caller's side by design (TICKET-SRV-03's 404-not-403 rule), so there is nothing to
      // tell apart here.
      const doomed = doomedTransactions(tx, user.id, inArray(transactions.id, ids));
      if (doomed.length === 0) return EMPTY_CLEANUP;

      return removeTransactionsWithTransferCleanup(tx, doomed, user.id);
    });

    res.json(result);
  });

  // The shared factory's deletes — and `DELETE /bulk` above — remove rows without running the
  // transfer cleanup, so a `Transfer` cascades away while its surviving leg keeps the stamp.
  // `POST /delete` is the one that cleans up; prefer it everywhere.
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
