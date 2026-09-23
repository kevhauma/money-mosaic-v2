import { eq } from 'drizzle-orm';

import type { DrizzleDb } from '../db.js';
import { users, type UserRow } from '../schema/users.js';
import type { PublicUser } from '../types.js';

/**
 * Identifiers are compared lowercased and trimmed, so `Admin ` and `admin` are the same account.
 * Stored normalised too, which is what makes the unique index case-insensitive in practice.
 */
export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/**
 * The one place a stored row becomes something a response may contain. `passwordHash` and
 * `passwordSalt` are dropped here and nowhere else, so there is a single line to read when asking
 * "can a digest reach the wire?".
 */
export const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  email: row.email,
  displayName: row.displayName,
  role: row.role,
});

export const findUserByEmail = (db: DrizzleDb, email: string): UserRow | undefined =>
  db
    .select()
    .from(users)
    .where(eq(users.email, normaliseEmail(email)))
    .get();
