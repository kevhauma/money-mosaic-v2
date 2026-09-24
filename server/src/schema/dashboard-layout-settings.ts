import { sqliteTable } from 'drizzle-orm/sqlite-core';

import type { DashboardRowId } from 'shared/entities.js';
import { json, ownerPrimaryKey } from './columns.js';

/**
 * The user's Dashboard row order and hidden rows (TICKET-STAT-14) — one row per user, ported from
 * Dexie's `dashboardLayoutSettings` singleton (TICKET-SRV-02).
 *
 * Both columns are JSON arrays of `DashboardRowId`, which is an ordered list by definition: the
 * order *is* the setting, so a set-shaped join table could not express it. `resolveDashboardRowOrder`
 * appends ids a saved layout does not know about, so a row written before a new Dashboard row
 * existed stays valid — which is also why neither column needs a CHECK against the union: an
 * unknown id is already handled as "not in the saved order", not as corruption.
 */
export const dashboardLayoutSettings = sqliteTable('dashboardLayoutSettings', {
  userId: ownerPrimaryKey(),
  rowOrder: json<DashboardRowId[]>('rowOrder').notNull(),
  hiddenRowIds: json<DashboardRowId[]>('hiddenRowIds').notNull(),
});

export type DashboardLayoutSettingsRow = typeof dashboardLayoutSettings.$inferSelect;
export type NewDashboardLayoutSettingsRow = typeof dashboardLayoutSettings.$inferInsert;
