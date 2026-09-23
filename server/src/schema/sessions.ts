import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { users } from './users.js';

/**
 * One row per signed-in browser (TICKET-AUTH-01). The token is the cookie value: 32 random bytes
 * as hex.
 *
 * **No expiry column, on purpose.** A session lives until logout or until something deletes the
 * row — an admin resetting a password (TICKET-AUTH-03) or a user changing their own
 * (TICKET-AUTH-04). This is deliberately-unsecured local hosting; the non-goals are listed in the
 * ticket.
 *
 * The cascade is what makes deleting a user a single statement rather than a sweep.
 */
export const sessions = sqliteTable(
  'sessions',
  {
    token: text('token').primaryKey(),
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  // SQLite does not index a foreign key column on its own, so without this both the cascade above
  // and every "end all of this user's sessions" sweep (TICKET-AUTH-03 and TICKET-AUTH-04) scan the
  // whole table. Irrelevant at household scale, but this is the migration where it is free.
  (table) => [index('sessions_userId_idx').on(table.userId)],
);

export type SessionRow = typeof sessions.$inferSelect;
