import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

import { ownerPrimaryKey } from './columns.js';

/**
 * Transfer auto-matching settings (FR-TRF-4) — one row per user, ported from Dexie's
 * `transferSettings` singleton (TICKET-SRV-02).
 *
 * This is the first of the seven tables that stop being singletons: the `id = 1` convention only
 * made sense while a database belonged to one person, so the owner is the key now. A user with no
 * row still reads `DEFAULT_TRANSFER_SETTINGS`, exactly as the repository does today — except that
 * `seedUserDefaults` writes the row up front, so in practice there always is one.
 */
export const transferSettings = sqliteTable('transferSettings', {
  userId: ownerPrimaryKey(),
  matchWindowDays: integer('matchWindowDays').notNull(),
  autoLinkMediumConfidence: integer('autoLinkMediumConfidence', { mode: 'boolean' }).notNull(),
});

export type TransferSettingsRow = typeof transferSettings.$inferSelect;
export type NewTransferSettingsRow = typeof transferSettings.$inferInsert;
