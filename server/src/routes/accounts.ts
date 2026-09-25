import { eq } from 'drizzle-orm';
import { Router, type Request } from 'express';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { notFound } from '../http/errors.js';
import { ownsRow } from '../http/ownership.js';
import { toId } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import {
  doomedTransactions,
  removeTransactionsWithTransferCleanup,
  type RemoveTransactionsWithCleanupResult,
} from '../operations/transfer-cleanup.js';
import { accounts } from '../schema/accounts.js';
import { transactions } from '../schema/transactions.js';
import { createEntityRouter, deleteOwnedRow } from './entity-router.js';

/**
 * `/api/accounts` (TICKET-SRV-03's entity router) plus the two cascading writes TICKET-SRV-04 moves
 * off the client.
 *
 * **Why `DELETE /:id` is replaced rather than left to the shared router.** `transactions.accountId`
 * cascades, so SQLite would already remove an account's transactions — and `transfers` cascades off
 * those, so the links would go too. What no constraint can do is clear the `transferId` still
 * stamped on a transaction in *another* account that was linked to one of them (FR-TRF-2 links
 * across the whole dataset). Left behind, that stamp is an orphan reference the transfer views read
 * as a live link. So the delete runs the same cleanup the client's `AccountDeletionService` did, in
 * one transaction, and answers with what it removed so the stores can mirror it.
 *
 * Clearing an account keeps the row — the user re-imports a corrected export onto a clean slate
 * (TICKET-ACC-01) while keeping the account's settings and mapping profiles. Delete is
 * "clear + remove the row", sharing one cascade so the two cannot drift.
 */

/** The `:id` of a request, or a 404 — a path segment that is not an id names no account. */
const idOf = (req: Request): number => {
  const id = toId(req.params['id']);
  if (id === undefined) throw notFound();
  return id;
};

/**
 * Removes an account's transactions and repairs every transfer that touched them.
 *
 * The ownership check is the first statement **of the transaction that writes**, not a separate
 * request before it: an account handed away (or deleted) between the two would otherwise be a
 * cascade running on rows the caller no longer owns.
 */
const cascadeTransactions = (
  tx: DbOrTx,
  accountId: number,
  userId: number,
): RemoveTransactionsWithCleanupResult => {
  if (!ownsRow(tx, accounts, accountId, userId)) throw notFound();

  const doomed = doomedTransactions(tx, userId, eq(transactions.accountId, accountId));
  return removeTransactionsWithTransferCleanup(tx, doomed, userId);
};

export const createAccountsRouter = (db: DrizzleDb): Router => {
  const router = Router();

  // Registered before the shared router: `/:id/transactions/delete` is a longer path than `/:id`,
  // but `DELETE /:id` below would otherwise be the shared router's, without the cascade.
  router.post('/:id/transactions/delete', (req, res) => {
    const user = authUserOf(req);
    const id = idOf(req);

    res.json(db.transaction((tx) => cascadeTransactions(tx, id, user.id)));
  });

  /**
   * The account plus everything hanging off it. Answers **200 with the cascade report** rather than
   * the shared router's bare 204: `AccountsStore.removeAccount` mirrors the removed transactions,
   * the removed transfers and the cleared stamps into their stores, and it has no other way to
   * learn what went with the account.
   */
  router.delete('/:id', (req, res) => {
    const user = authUserOf(req);
    const id = idOf(req);

    const result = db.transaction((tx) => {
      const cascade = cascadeTransactions(tx, id, user.id);
      // Last, so a failure anywhere above leaves the account and its rows exactly as they were.
      if (!deleteOwnedRow(tx, accounts, id, user.id)) throw notFound();
      return cascade;
    });

    res.json(result);
  });

  router.use(createEntityRouter({ db, table: accounts }));

  return router;
};
