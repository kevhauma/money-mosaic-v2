import { and, eq } from 'drizzle-orm';
import { Router, type Request } from 'express';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { notFound } from '../http/errors.js';
import {
  asArray,
  asBulkUpdate,
  asRecord,
  inItem,
  parseEntityBody,
  toId,
  type EntityValues,
} from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { removeTransactionsWithTransferCleanup } from '../operations/transfer-cleanup.js';
import { importBatches } from '../schema/import-batches.js';
import { transactions } from '../schema/transactions.js';
import { deleteOwnedRow, insertOwnedRow, selectOwnedRow, updateOwnedRow } from './entity-router.js';
import { DERIVED_COLUMNS, deriveReimbursementTransferId } from './transactions.js';

/**
 * `/api/import` (TICKET-SRV-04) — committing an import and undoing one, each in a single SQLite
 * transaction.
 *
 * **Why these cannot be repository calls.** Committing writes an `ImportBatch` and then the
 * transactions that carry its id; undoing deletes those transactions, the transfers that linked
 * them and the batch row. Split across two HTTP calls, the gap between them is exactly where the
 * data gets corrupted — transactions pointing at a batch that was never written, or a batch left
 * behind with nothing in it. One endpoint, one transaction, no gap.
 *
 * **The CSV never crosses the wire.** Parsing, mapping, fingerprinting and the duplicate decision
 * stay in the client's Web Worker: they need no database, they are already off the main thread, and
 * moving them would mean uploading files and streaming progress back for no correctness gain. What
 * arrives here is the set of rows the client already decided to keep, plus the backfill patches for
 * rows it recognised (TICKET-TXN-06), and the batch that records the counts.
 */

/** The body `POST /commit` takes, before any of it meets a table. */
type CommitBody = {
  /** The `ImportBatch` to create. Its `rowsAdded`/`rowsDuplicate` are the client's own counts. */
  readonly batch: unknown;
  /** The accepted rows, without an `importBatchId` — this endpoint assigns it. */
  readonly transactions: readonly unknown[];
  /** `{ id, changes }` patches for rows that already existed, in `bulkUpdate` shape. */
  readonly backfill: readonly unknown[];
};

/**
 * `importBatchId` is **assigned by this endpoint**, from the batch it just created, so it is
 * declared derived: a row that arrived carrying one would be naming a batch other than the one it
 * is being imported into, which is a malformed request rather than a preference to honour.
 */
const COMMIT_DERIVED = [...DERIVED_COLUMNS, 'importBatchId'] as const;

const asCommitBody = (body: unknown): CommitBody => {
  const { batch, transactions: rows, backfill } = asRecord(body);
  return {
    batch,
    transactions: asArray(rows),
    // Absent is "nothing to backfill", which is the common case.
    backfill: backfill === undefined ? [] : asArray(backfill),
  };
};

/** The `:batchId` of a request. A path segment that is not an id names no batch. */
const batchIdOf = (req: Request): number => {
  const id = toId(req.params['batchId']);
  if (id === undefined) throw notFound();
  return id;
};

/**
 * The transactions a batch created — the **one** query both `undo-preview` and `undo` read through,
 * so the cost the confirm dialog states and the rows the undo removes cannot disagree
 * (TICKET-IMP-13). User-scoped, so it is also the ownership check: another user's batch id selects
 * nothing.
 */
const batchTransactions = (
  tx: DbOrTx,
  batchId: number,
  userId: number,
): { id: number; transferId: number | null; categoryManual: boolean | null }[] =>
  tx
    .select({
      id: transactions.id,
      transferId: transactions.transferId,
      categoryManual: transactions.categoryManual,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.importBatchId, batchId)))
    .all();

/** One accepted row, written with the new batch's id stamped on it. */
const insertImported = (
  tx: DbOrTx,
  row: unknown,
  batchId: number,
  userId: number,
): Record<string, unknown> => {
  const values = parseEntityBody(transactions, row, { mode: 'create', derived: COMMIT_DERIVED });
  const inserted = insertOwnedRow(tx, transactions, values, userId, (parsed: EntityValues) => ({
    ...deriveReimbursementTransferId(parsed),
    importBatchId: batchId,
  }));

  // `importBatchId` is hidden from a body but not from a response: the client's `addedTransactions`
  // carry it, and it is what a later undo finds them by.
  return toEntity(inserted, DERIVED_COLUMNS);
};

/** One `rawLine`/`rawRow` backfill of a row that already existed (TICKET-TXN-06). */
const applyBackfill = (
  tx: DbOrTx,
  update: unknown,
  userId: number,
): { id: number; changes: EntityValues } => {
  const { id, changes } = asBulkUpdate(update);
  const values = parseEntityBody(transactions, changes, {
    mode: 'patch',
    derived: DERIVED_COLUMNS,
  });
  // Which fields to fill in is the client's decision (it is the side that knows what the existing
  // row was missing, and TICKET-TXN-06's "never overwritten" rule lives there); that a patch may
  // only touch this user's own row is not, and `updateOwnedRow` is what holds it.
  if (updateOwnedRow(tx, transactions, id, values, userId) === undefined) throw notFound();

  return { id, changes: values };
};

export const createImportRouter = (db: DrizzleDb): Router => {
  const router = Router();

  /**
   * The whole of `ImportService.commitImport`'s write half, in one transaction: the batch, the
   * accepted rows carrying its id, and the backfill patches. Validation happens **inside** the
   * transaction, so a malformed row at position four hundred rolls back the three hundred and
   * ninety-nine before it rather than leaving them written under a batch the response says failed.
   */
  router.post('/commit', (req, res) => {
    const user = authUserOf(req);
    const body = asCommitBody(req.body);

    const result = db.transaction((tx) => {
      const batchValues = parseEntityBody(importBatches, body.batch, { mode: 'create' });
      const batchId = insertOwnedRow(tx, importBatches, batchValues, user.id)['id'] as number;

      const addedTransactions = body.transactions.map((row, index) =>
        inItem(index, () => insertImported(tx, row, batchId, user.id)),
      );
      const backfilledTransactions = body.backfill.map((update, index) =>
        inItem(index, () => applyBackfill(tx, update, user.id)),
      );

      // The invariant `commitImport` has always asserted, now inside the transaction it protects:
      // before this ticket it threw *after* the rows were written, leaving exactly the half-state
      // it was checking for. Here it aborts the transaction, so nothing is written at all.
      const batch = selectOwnedRow(tx, importBatches, batchId, user.id);
      if (batch === undefined) throw new Error('Import batch failed to persist');

      return {
        batch: toEntity(batch),
        addedTransactions,
        // The count the client sent, read back off the stored batch rather than echoed, so the
        // number in the response is the number in the history.
        duplicateCount: batch['rowsDuplicate'] as number,
        backfilledTransactions,
      };
    });

    res.status(201).json(result);
  });

  /**
   * What undoing this batch would cost, without doing it (TICKET-IMP-13) — so the confirm dialog
   * can state it rather than asking the user to guess. Read-only.
   */
  router.get('/:batchId/undo-preview', (req, res) => {
    const user = authUserOf(req);
    const rows = batchTransactions(db, batchIdOf(req), user.id);

    res.json({
      rowCount: rows.length,
      manuallyCategorisedCount: rows.filter((row) => row.categoryManual === true).length,
      transferLinkedCount: rows.filter((row) => row.transferId != null).length,
    });
  });

  /**
   * Deletes the batch and everything it created, in one transaction.
   *
   * A removed transaction may have been auto-linked to one from a **different** import (FR-TRF-2
   * links across the whole dataset), so the shared cleanup repairs that surviving side — the reason
   * this spans three tables rather than two.
   *
   * **An already-undone batch reports zeroes rather than a 404**, which is `previewUndo`'s stated
   * contract and what makes a double-undo a no-op instead of a surprise. The same answer covers a
   * batch id that was never assigned, and one belonging to another user: every statement below is
   * `where userId = ?`, so a foreign id selects nothing and deletes nothing, and the response says
   * as much without confirming whether it exists.
   */
  router.post('/:batchId/undo', (req, res) => {
    const user = authUserOf(req);
    const batchId = batchIdOf(req);

    const result = db.transaction((tx) => {
      const rows = batchTransactions(tx, batchId, user.id);
      const { unlinkedTransferIds, clearedTransferTransactionIds } =
        removeTransactionsWithTransferCleanup(tx, rows, user.id);

      deleteOwnedRow(tx, importBatches, batchId, user.id);

      return { unlinkedTransferIds, clearedTransferTransactionIds };
    });

    res.json(result);
  });

  return router;
};
