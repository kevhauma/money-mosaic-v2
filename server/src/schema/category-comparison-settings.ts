import { sqliteTable } from 'drizzle-orm/sqlite-core';

import { json, ownerPrimaryKey } from './columns.js';

/**
 * Category ids left out of the Dashboard's category period comparison panel — one row per user,
 * ported from Dexie's `categoryComparisonSettings` singleton (TICKET-SRV-02).
 *
 * The ids are a JSON array rather than a join table: nothing queries "which users exclude
 * category 7", the list is read whole every time, and a join table would need its own cascade
 * story for a preference that is fine to hold a stale id. A user with no row excludes nothing,
 * which is what `DEFAULT_CATEGORY_COMPARISON_SETTINGS` already says.
 */
export const categoryComparisonSettings = sqliteTable('categoryComparisonSettings', {
  userId: ownerPrimaryKey(),
  excludedCategoryIds: json<number[]>('excludedCategoryIds').notNull(),
});

export type CategoryComparisonSettingsRow = typeof categoryComparisonSettings.$inferSelect;
export type NewCategoryComparisonSettingsRow = typeof categoryComparisonSettings.$inferInsert;
