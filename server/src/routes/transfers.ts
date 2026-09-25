import { and, eq } from 'drizzle-orm';
import { Router, type Request } from 'express';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { notFound } from '../http/errors.js';
import { asArray, asRecord, inItem, parseEntityBody, toId } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import {
  createEntityRouter,
  deleteOwnedRow,
  insertOwnedRow,
  selectOwnedRow,
  updateOwnedRow,
} from './entity-router.js';
import { DERIVED_COLUMNS, deriveReimbursementTransferId } from './transactions.js';

/**
 * `/api/transfers` (TICKET-SRV-03's entity router) plus the three link operations TICKET-SRV-04
 * moves off the client.
 *
 * **One fact, two tables.** A link is a `Transfer` row *and* a `transferId` stamped on both legs;
 * an unlink is the row gone *and* both stamps cleared. Written as two HTTP calls, a dropped
 * connection between them leaves a transaction pointing at a transfer that does not exist (or a
 * transfer whose legs do not know about it), which every balance and transfer view then reads as
 * truth. So each is one endpoint running in one transaction.
 *
 * Linking also **clears the legs' category** (TICKET-TRF-01): a transfer is not spending or income,
 * so a rule-assigned or hand-set category must not survive the link — atomically with the stamp, or
 * a failure would leave a categorised transfer skewing every breakdown.
 */

/** What `POST /link` answers with — the shape `TransferLinkingService.linkManually` returns. */
type TransferLinkResult = {
  readonly transfer: Record<string, unknown>;
  readonly updatedTransactions: readonly [Record<string, unknown>, Record<string, unknown>];
};

/** The `:id` of a request, or a 404 — a path segment that is not an id names no transfer. */
const idOf = (req: Request): number => {
  const id = toId(req.params['id']);
  if (id === undefined) throw notFound();
  return id;
};

/**
 * Creates the `Transfer` and stamps both legs, inside the caller's transaction.
 *
 * `linkedAt` defaults to now so a client need not send a clock reading, but an explicit one is
 * honoured — the auto-matching pass stamps every link of a batch with the same instant.
 *
 * Ownership of both legs is established by `insertOwnedRow` **in this transaction** (they are
 * declared foreign keys, so `assertReferencesOwned` covers them), and again by each
 * `updateOwnedRow`: a leg belonging to someone else is a 404 and nothing is written.
 */
const linkTransfer = (tx: DbOrTx, body: unknown, userId: number): TransferLinkResult => {
  const values = parseEntityBody(
    transfers,
    { linkedAt: new Date().toISOString(), ...asRecord(body) },
    { mode: 'create' },
  );

  const transfer = insertOwnedRow(tx, transfers, values, userId);
  const transferId = transfer['id'] as number;

  const legIds = [values['fromTransactionId'] as number, values['toTransactionId'] as number];
  const updatedTransactions = legIds.map((legId) => {
    const updated = updateOwnedRow(
      tx,
      transactions,
      legId,
      // Explicit nulls, not omissions: this has to *clear* a category the rules or the user set.
      { transferId, categoryId: null, categoryManual: null },
      userId,
      deriveReimbursementTransferId,
    );
    if (updated === undefined) throw notFound();
    return toEntity(updated, DERIVED_COLUMNS);
  }) as [Record<string, unknown>, Record<string, unknown>];

  return { transfer: toEntity(transfer), updatedTransactions };
};

/** The override with its `reimbursementTransferId` dropped, which is what "cleared" means here. */
const withoutReimbursement = (override: unknown): Record<string, unknown> => {
  const rest = { ...asRecord(override) };
  delete rest['reimbursementTransferId'];
  return rest;
};

/**
 * Clears every `attributionOverride.reimbursementTransferId` that pointed at this transfer
 * (TICKET-TXN-03). The reference would otherwise name nothing, silently un-suppressing a leg that
 * was never re-checked. `mode`/`jointAccountId` are kept — only the stale reference is dropped, in
 * the same transaction as the unlink itself.
 */
const clearDanglingOverrides = (
  tx: DbOrTx,
  transferId: number,
  userId: number,
): { id: number; attributionOverride: Record<string, unknown> }[] => {
  const dangling = tx
    .select({ id: transactions.id, attributionOverride: transactions.attributionOverride })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.reimbursementTransferId, transferId)),
    )
    .all();

  return dangling.map((row) => {
    const attributionOverride = withoutReimbursement(row.attributionOverride);
    // Through `updateOwnedRow` with the derive, so the extracted column is cleared alongside the
    // JSON it was extracted from — the two can never disagree.
    if (
      updateOwnedRow(
        tx,
        transactions,
        row.id,
        { attributionOverride },
        userId,
        deriveReimbursementTransferId,
      ) === undefined
    )
      throw notFound();

    return { id: row.id, attributionOverride };
  });
};

export const createTransfersRouter = (db: DrizzleDb): Router => {
  const router = Router();

  // Registered before the shared router, so `/link` is matched as itself rather than as a `/:id`.
  router.post('/link', (req, res) => {
    const user = authUserOf(req);
    const result = db.transaction((tx) => linkTransfer(tx, req.body, user.id));

    res.status(201).json(result);
  });

  /**
   * A whole auto-matching pass in one transaction (the property TICKET-PERF-04 gave
   * `linkAutoBatch`): one candidate's write failing aborts the pass — zero new transfer rows, zero
   * stamped legs — rather than leaving the dataset half-linked.
   */
  router.post('/link/batch', (req, res) => {
    const user = authUserOf(req);
    const items = asArray(req.body);

    const links = db.transaction((tx) =>
      items.map((item, index) => inItem(index, () => linkTransfer(tx, item, user.id))),
    );

    res.status(201).json(links);
  });

  /**
   * Removes the link and clears both legs.
   *
   * Decision (TICKET-TRF-01): unlinking leaves the category **empty** rather than re-running the
   * rules engine. No pre-link category is persisted, so exact restoration is not possible, and
   * re-suggesting one would need a deliberate action of its own.
   */
  router.post('/:id/unlink', (req, res) => {
    const user = authUserOf(req);
    const id = idOf(req);

    const result = db.transaction((tx) => {
      // Read and delete in the same transaction: a transfer that is not this user's is a 404 here,
      // and cannot become someone else's between the two statements.
      const transfer = selectOwnedRow(tx, transfers, id, user.id);
      if (transfer === undefined) throw notFound();

      deleteOwnedRow(tx, transfers, id, user.id);

      for (const legId of [transfer['fromTransactionId'], transfer['toTransactionId']]) {
        // Not `updateOwnedRow`: a leg may already be gone (its transaction deleted, which cascades
        // the link away), and an unlink of the survivor is still a success.
        tx.update(transactions)
          .set({ transferId: null })
          .where(and(eq(transactions.id, legId as number), eq(transactions.userId, user.id)))
          .run();
      }

      return { clearedAttributionOverrides: clearDanglingOverrides(tx, id, user.id) };
    });

    res.json(result);
  });

  // The shared factory's `DELETE /:id` removes the `Transfer` row and nothing else — both legs
  // keep their `transferId` (a plain column, so no cascade reaches it). That is the orphan state
  // `POST /:id/unlink` above exists to prevent, so nothing in the client should be wired to it.
  router.use(createEntityRouter({ db, table: transfers }));

  return router;
};
