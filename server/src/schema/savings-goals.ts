import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { ownerId } from './columns.js';

/**
 * One thing the user is saving toward (FR-FUT-2), ported from Dexie's `savingsGoals` store
 * (TICKET-SRV-02).
 *
 * `sortOrder` is not a display preference here the way it is on `accounts`/`categories`: goals are
 * funded top-down (TICKET-FUT-05), so this order decides which goal's ETA moves when another is
 * dragged above it. Dexie indexed it for that reason and so does this table.
 */
export const savingsGoals = sqliteTable(
  'savingsGoals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    name: text('name').notNull(),
    /** What it costs, in the app's currency. Always positive. */
    targetAmount: real('targetAmount').notNull(),
    /** Manual funding order — goals are paid for top-down, so this drives every ETA. */
    sortOrder: integer('sortOrder'),
    /** Optional "I want this by" date (ISO `YYYY-MM-DD`) — turns the ETA into on-track/behind. */
    targetDate: text('targetDate'),
    note: text('note'),
    archived: integer('archived', { mode: 'boolean' }).notNull(),
    /** ISO date the goal was created — the only ordering fallback before a manual order exists. */
    createdAt: text('createdAt').notNull(),
  },
  (table) => [
    index('savingsGoals_userId_idx').on(table.userId),
    index('savingsGoals_userId_sortOrder_idx').on(table.userId, table.sortOrder),
  ],
);

export type SavingsGoalRow = typeof savingsGoals.$inferSelect;
export type NewSavingsGoalRow = typeof savingsGoals.$inferInsert;
