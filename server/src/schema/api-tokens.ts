import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { users } from './users.js';

/**
 * Personal access tokens for the MCP endpoint (TICKET-MCP-01). Only the SHA-256 of a token is
 * stored; the token itself is printed once by `token:create` and never kept.
 *
 * Server bookkeeping like `sessions`, not user data: it is left out of exports, `DELETE /api/data`
 * and `PER_USER_TABLES` (`operations/user-rows.ts`), and the cascade removes it with its user.
 */
export const apiTokens = sqliteTable(
  'apiTokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tokenHash: text('tokenHash').notNull().unique(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index('apiTokens_userId_idx').on(table.userId)],
);

export type ApiTokenRow = typeof apiTokens.$inferSelect;
