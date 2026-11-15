import { Router, type Request } from 'express';

import type { DrizzleDb } from '../db.js';
import { notFound } from '../http/errors.js';
import { toId } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { deleteCategory } from '../operations/category-delete.js';
import { categories } from '../schema/categories.js';
import { createEntityRouter } from './entity-router.js';

/**
 * `/api/categories` (TICKET-SRV-03's entity router) with one endpoint of its own: a delete that
 * **refuses**, in words, while a loan tracks the category (TICKET-SRV-04) or a rule assigns it
 * (TICKET-CAT-12).
 *
 * `loans.categoryId` is a NO ACTION foreign key, so SQLite would refuse the delete anyway — with
 * `FOREIGN KEY constraint failed`, which no client may be shown. A rule's target is JSON with no
 * key at all, so nothing would refuse it, and the rule would be left aiming at nothing. The
 * operation asks the question first and answers 409 naming the blockers.
 */

/** The `:id` of a request, or a 404 — a path segment that is not an id names no category. */
const idOf = (req: Request): number => {
  const id = toId(req.params['id']);
  if (id === undefined) throw notFound();
  return id;
};

export const createCategoriesRouter = (db: DrizzleDb): Router => {
  const router = Router();

  router.delete('/:id', (req, res) => {
    const user = authUserOf(req);
    const id = idOf(req);
    db.transaction((tx) => deleteCategory(tx, user.id, id));
    res.status(204).end();
  });

  router.use(createEntityRouter({ db, table: categories }));

  return router;
};
