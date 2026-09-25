import { Router } from 'express';

import type { DrizzleDb } from '../db.js';
import { httpError, notFound } from '../http/errors.js';
import { toId } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { savingsGoals } from '../schema/savings-goals.js';
import { createEntityRouter, updateOwnedRow } from './entity-router.js';

/**
 * `/api/goals` (TICKET-SRV-03) — the shared entity router over `savingsGoals`, plus the one
 * operation `GoalsRepository` has that no other uniform entity does.
 *
 * **`PATCH /sort-order` takes the whole order, and applies it atomically.** Goals are funded
 * top-down (TICKET-FUT-05), so `sortOrder` decides which goal's ETA moves when another is dragged
 * above it — a half-applied reorder would leave two goals claiming one slot and the forecast
 * reading from an order the user never chose. One drag is one user action, so it is one request
 * and one transaction.
 */

type SortOrderUpdate = { readonly id: number; readonly sortOrder: number };

const asSortOrderUpdate = (item: unknown): SortOrderUpdate => {
  const { id, sortOrder } = (item ?? {}) as Partial<Record<keyof SortOrderUpdate, unknown>>;
  const parsedId = toId(id);
  if (parsedId === undefined) throw httpError(400, 'Invalid value for "id": expected an integer');
  if (typeof sortOrder !== 'number' || !Number.isInteger(sortOrder))
    throw httpError(400, 'Invalid value for "sortOrder": expected an integer');

  return { id: parsedId, sortOrder };
};

export const createGoalsRouter = (db: DrizzleDb): Router => {
  const router = Router();

  // Before the shared router, so `/sort-order` is not read as a `/:id` that is not an id.
  router.patch('/sort-order', (req, res) => {
    const user = authUserOf(req);
    if (!Array.isArray(req.body)) throw httpError(400, 'Request body must be an array');
    const updates = req.body.map(asSortOrderUpdate);

    db.transaction((tx) => {
      for (const { id, sortOrder } of updates) {
        // An id this user does not own is a 404, and the throw takes the whole reorder with it.
        if (updateOwnedRow(tx, savingsGoals, id, { sortOrder }, user.id) === undefined)
          throw notFound();
      }
    });

    res.status(204).end();
  });

  router.use(createEntityRouter({ db, table: savingsGoals }));

  return router;
};
