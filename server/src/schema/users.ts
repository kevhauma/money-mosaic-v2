import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { UserRole } from '../types.js';

const ROLES: readonly [UserRole, ...UserRole[]] = ['admin', 'user'];

/**
 * Who can sign in (TICKET-AUTH-01). Column names are camelCase to match the entity field names the
 * rest of the data model uses, so a row and its JSON shape read the same.
 *
 * `email` is free text, not a validated address: this server is reached over a LAN by people who
 * were told "admin/admin", and the seeded account's identifier is literally `admin`. It is stored
 * lowercased and trimmed (see `normaliseEmail`) so the unique index is the case-insensitive one
 * people expect.
 */
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    displayName: text('displayName').notNull(),
    /** Hex scrypt digest of the password. Never leaves the server. */
    passwordHash: text('passwordHash').notNull(),
    /** Hex per-user salt, so the same password hashes differently for two users. */
    passwordSalt: text('passwordSalt').notNull(),
    role: text('role', { enum: ROLES }).notNull().default('user'),
    disabled: integer('disabled', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    /**
     * Stamped on every password change. Equal to `createdAt` while the seeded password is untouched,
     * which is how TICKET-AUTH-04 spots an installation still running `admin` / `admin`.
     */
    passwordUpdatedAt: integer('passwordUpdatedAt', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  // Drizzle's `enum` on a SQLite text column is types-only — it generates a bare `text` column, so
  // nothing stops an unexpected string being written and then handed to the client typed as
  // `UserRole`. TICKET-AUTH-03 accepts a role from a request body, where the type system cannot
  // help either. Retrofitting a CHECK to SQLite means rebuilding the table, so it goes in here.
  (table) => [check('users_role_check', sql`${table.role} IN ('admin', 'user')`)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
