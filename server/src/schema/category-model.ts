import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { CategoryModelArtifact, FeatureConfig } from 'shared/entities.js';
import { bytes, json, ownerPrimaryKey } from './columns.js';

type ModelMetrics = CategoryModelArtifact['metrics'];

/**
 * The trained auto-categoriser model (FR-ML-4) — one row per user, ported from Dexie's
 * `categoryModel` singleton (TICKET-SRV-02).
 *
 * **The three `ArrayBuffer` fields are blobs, and that is a bug fix.** As recorded at the bottom
 * of TICKET-DAT-05, `JSON.stringify` turns an `ArrayBuffer` into `{}`, so the JSON export has
 * always silently lost the trained weights. A blob column round-trips the bytes, and a
 * server-stored model never passes through JSON at all.
 *
 * A user with no row has simply never trained a model, which every reader already handles.
 */
export const categoryModel = sqliteTable('categoryModel', {
  userId: ownerPrimaryKey(),
  modelTopology: bytes('modelTopology').notNull(),
  weightSpecs: bytes('weightSpecs').notNull(),
  weightData: bytes('weightData').notNull(),
  /** Output index -> category id. A dense array, so its position *is* the model's class index. */
  categoryIdByIndex: json<number[]>('categoryIdByIndex').notNull(),
  featureConfig: json<FeatureConfig>('featureConfig').notNull(),
  /** `taxonomySignature()` at training time — flips the model `stale` once categories change. */
  taxonomySignature: text('taxonomySignature').notNull(),
  metrics: json<ModelMetrics>('metrics').notNull(),
  trainedAt: text('trainedAt').notNull(),
  /** `MODEL_SCHEMA_VERSION` at training time, unrelated to this database's migration count. */
  schemaVersion: integer('schemaVersion').notNull(),
});

export type CategoryModelRow = typeof categoryModel.$inferSelect;
export type NewCategoryModelRow = typeof categoryModel.$inferInsert;
