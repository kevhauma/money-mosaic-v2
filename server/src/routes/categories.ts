import { and, eq } from 'drizzle-orm';
import { Router, type Request } from 'express';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { httpError, notFound } from '../http/errors.js';
import { toId } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { categories } from '../schema/categories.js';
import { loans } from '../schema/loans.js';
import { transactions } from '../schema/transactions.js';
import { createEntityRouter, deleteOwnedRow } from './entity-router.js';

/**
 * `/api/categories` (TICKET-SRV-03's entity router) with one endpoint of its own: a delete that
 * **refuses**, in words, when a loan is still tracking the category (TICKET-SRV-04).
 *
 * `loans.categoryId` is a NO ACTION foreign key by deliberate choice (see `schema/loans.ts`): the
 * column is NOT NULL so SET NULL is unavailable, CASCADE would silently destroy the loan's name,
 * principal, rate and term along with the category, and leaving it unconstrained is the orphan bug
 * that was there before — a loan pointing at nothing, its progress reading zero payments. So SQLite
 * refuses the delete. What it refuses with is `FOREIGN KEY constraint failed`, which no client may
 * ever be shown (`createErrorHandler` replaces every 5xx message) and which nobody could act on
 * anyway.
 *
 * This endpoint asks the question first — *which* loans track this category — and answers 409 naming
 * them. Built from a query, not from a caught constraint error's text: the constraint is the
 * backstop, the query is the explanation.
 */

/** The `:id` of a request, or a 404 — a path segment that is not an id names no category. */
const idOf = (req: Request): number => {
  const id = toId(req.params['id']);
  if (id === undefined) throw notFound();
  return id;
};

/** `"Car"` / `"Car" and "House"` / `"Car", "House" and "Boat"`. */
const nameList = (names: readonly string[]): string => {
  const quoted = names.map((name) => `"${name}"`);
  if (quoted.length <= 1) return quoted.join('');
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
};

/**
 * Refuses the delete if any of this user's loans tracks the category.
 *
 * Every loan counts, archived or not: an archived loan holds the constraint just as firmly, so
 * checking only the active ones would turn exactly the case this exists to explain back into the
 * 500 it replaced.
 */
const assertNoLoanTracks = (tx: DbOrTx, categoryId: number, userId: number): void => {
  const tracking = tx
    .select({ name: loans.name })
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.categoryId, categoryId)))
    .all();
  if (tracking.length === 0) return;

  const names = nameList(tracking.map((loan) => loan.name));
  throw httpError(
    409,
    `This category cannot be deleted while ${
      tracking.length === 1 ? 'the loan' : 'the loans'
    } ${names} ${tracking.length === 1 ? 'tracks' : 'track'} it. ` +
      `Point ${tracking.length === 1 ? 'that loan' : 'those loans'} at another category, or delete ${
        tracking.length === 1 ? 'it' : 'them'
      } first.`,
  );
};

export const createCategoriesRouter = (db: DrizzleDb): Router => {
  const router = Router();

  router.delete('/:id', (req, res) => {
    const user = authUserOf(req);
    const id = idOf(req);

    // The check and the delete share a transaction, so a loan created in between cannot be orphaned
    // by a delete that was refused a moment earlier for the right reason.
    db.transaction((tx) => {
      assertNoLoanTracks(tx, id, user.id);

      // Clear the category off its transactions *explicitly*, rather than leaving it to the
      // column's ON DELETE SET NULL. SET NULL clears `categoryId` and nothing else, but
      // `CategoriesStore.removeCategory` clears `categoryManual` alongside it — and that flag is
      // what `RulesEngineService` and the co-owner attribution both check before touching a row.
      // Leaving it set would produce a transaction with no category that the rules engine is
      // permanently forbidden from ever categorising again.
      tx.update(transactions)
        .set({ categoryId: null, categoryManual: false })
        .where(and(eq(transactions.userId, user.id), eq(transactions.categoryId, id)))
        .run();

      if (!deleteOwnedRow(tx, categories, id, user.id)) throw notFound();
    });

    res.status(204).end();
  });

  router.use(createEntityRouter({ db, table: categories }));

  return router;
};
