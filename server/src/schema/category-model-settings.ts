import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

import { ownerPrimaryKey } from './columns.js';

/**
 * The user's chosen training-window preset (TICKET-ML-17) — one row per user, ported from Dexie's
 * `categoryModelSettings` singleton (TICKET-SRV-02).
 *
 * Its own table rather than a field on `categoryModel` for the reason Dexie gave it one: the
 * preference must persist, and be changeable, before a model has ever been trained — when there
 * is no artifact row to hang it off.
 *
 * `NULL` means unrestricted: train on the user's entire categorised history. That is the same
 * value `DEFAULT_CATEGORY_MODEL_SETTINGS` carries, so a missing row and a row holding NULL read
 * alike.
 */
export const categoryModelSettings = sqliteTable('categoryModelSettings', {
  userId: ownerPrimaryKey(),
  trainingWindowYears: integer('trainingWindowYears'),
});

export type CategoryModelSettingsRow = typeof categoryModelSettings.$inferSelect;
export type NewCategoryModelSettingsRow = typeof categoryModelSettings.$inferInsert;
