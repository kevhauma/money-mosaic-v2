import { eq } from 'drizzle-orm';
import express, { Router } from 'express';

import type { DrizzleDb } from '../db.js';
import {
  decodeBinaryArtifact,
  encodeBinaryArtifact,
  type BinaryArtifact,
} from '../http/binary-artifact.js';
import { toEntity } from '../http/entity-response.js';
import { notFound } from '../http/errors.js';
import { parseEntityBody } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { categoryModel } from '../schema/category-model.js';

/**
 * `/api/categoryModel` (TICKET-SRV-03) — the trained auto-categoriser, stored and served as
 * **binary**.
 *
 * It is a singleton like the six under `/api/settings`, but nothing else about it is alike: three
 * of its columns are megabytes of model weights, so the body is `application/octet-stream` in the
 * `binary-artifact` envelope rather than JSON. Everything else about it is ordinary — the row is
 * the user's, `GET` on a user who has never trained one is a 404, and the metadata fields are
 * validated against the same table as every other entity.
 */

/** The three `ArrayBuffer` fields of `CategoryModelArtifact`, in the order the envelope writes them. */
const BLOB_COLUMNS = ['modelTopology', 'weightSpecs', 'weightData'] as const;

/**
 * A ceiling for the model body alone. The app's `JSON_BODY_LIMIT` is 10mb, which a trained model
 * on a few years of transactions can exceed on its own — and a 413 on "save the model I just spent
 * a minute training" is the worst possible moment to discover a limit.
 */
export const ARTIFACT_BODY_LIMIT = '64mb';

const OCTET_STREAM = 'application/octet-stream';

export const createCategoryModelRouter = (db: DrizzleDb): Router => {
  const router = Router();

  router.get('/', (req, res) => {
    const user = authUserOf(req);
    const row = db.select().from(categoryModel).where(eq(categoryModel.userId, user.id)).get();
    if (row === undefined) throw notFound();

    const artifact: BinaryArtifact = {
      entity: toEntity(row, BLOB_COLUMNS),
      blobs: {
        modelTopology: row.modelTopology,
        weightSpecs: row.weightSpecs,
        weightData: row.weightData,
      },
    };

    res.type(OCTET_STREAM).send(encodeBinaryArtifact(artifact));
  });

  // Its own body parser, and its own limit: `express.json()` on the app would not touch an
  // octet-stream body anyway, and this keeps the larger ceiling on the one route that needs it.
  router.put('/', express.raw({ type: OCTET_STREAM, limit: ARTIFACT_BODY_LIMIT }), (req, res) => {
    const user = authUserOf(req);
    const { entity, blobs } = decodeBinaryArtifact(req.body, BLOB_COLUMNS);
    const values = parseEntityBody(categoryModel, { ...entity, ...blobs }, { mode: 'create' });

    // A `put`, like the repository's: training replaces whatever was there, it never merges.
    db.transaction((tx) => {
      tx.delete(categoryModel).where(eq(categoryModel.userId, user.id)).run();
      tx.insert(categoryModel)
        .values({ ...values, userId: user.id } as never)
        .run();
    });

    res.status(204).end();
  });

  router.delete('/', (req, res) => {
    const user = authUserOf(req);
    // Idempotent: clearing a model that was never trained leaves the client in the state it asked
    // for, which is the contract `CategoryModelRepository.clear` has always had.
    db.delete(categoryModel).where(eq(categoryModel.userId, user.id)).run();

    res.status(204).end();
  });

  return router;
};
