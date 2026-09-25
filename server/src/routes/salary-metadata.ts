import { and, eq } from 'drizzle-orm';
import { Router } from 'express';

import type { DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { asReplacement, parseEntityBody } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { salaryMetadata } from '../schema/salary-metadata.js';
import { createEntityRouter, insertOwnedRow, updateOwnedRow } from './entity-router.js';

/**
 * `/api/salaryMetadata` (TICKET-SRV-03) — the shared entity router, plus the upsert
 * `SalaryMetadataRepository` needs.
 *
 * **`PUT /` is keyed by `yearMonth`, not by id**, because the repository's `upsert` is: the income
 * page edits "March 2026", looks up whether a row for that month exists, and `put`s either way.
 * `(userId, yearMonth)` is uniquely indexed, so letting the client `POST` a second row for a month
 * it already has would answer with a UNIQUE constraint failure — a 500 whose message the client is
 * never shown. One endpoint that means "this is March now" removes the race and the dead end.
 *
 * `PUT` replaces, it does not merge: a Dexie `put` writes the whole row, so a `note` the caller
 * left out is cleared rather than quietly kept (`asReplacement`).
 */
export const createSalaryMetadataRouter = (db: DrizzleDb): Router => {
  const router = Router();

  router.put('/', (req, res) => {
    const user = authUserOf(req);
    const values = parseEntityBody(salaryMetadata, req.body, { mode: 'create' });
    const yearMonth = values['yearMonth'] as string;

    const row = db.transaction((tx) => {
      const existing = tx
        .select({ id: salaryMetadata.id })
        .from(salaryMetadata)
        .where(and(eq(salaryMetadata.userId, user.id), eq(salaryMetadata.yearMonth, yearMonth)))
        .get();

      return existing === undefined
        ? insertOwnedRow(tx, salaryMetadata, values, user.id)
        : updateOwnedRow(
            tx,
            salaryMetadata,
            existing.id,
            asReplacement(salaryMetadata, values),
            user.id,
          );
    });

    // An insert or update that wrote nothing is a bug, not an empty month: answering `{}` with a
    // 200 would hand the client a `SalaryMetadata` missing every field it declares.
    if (row === undefined) throw new Error('salaryMetadata upsert returned no row');

    res.json(toEntity(row));
  });

  router.use(createEntityRouter({ db, table: salaryMetadata }));

  return router;
};
