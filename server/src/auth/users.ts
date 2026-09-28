import { eq } from 'drizzle-orm';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { users, type UserRow } from '../schema/users.js';
import type { PublicUser } from '../types.js';
import type { PasswordDigest } from './passwords.js';

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

/**
 * The row behind a resolved session (TICKET-AUTH-04). `requireAuth` hands routes a `SessionUser`,
 * which deliberately carries no digest — so changing a password, the one operation that has to
 * verify the old one, reads the row back by the id the session already proved.
 */
export const findUserById = (db: DrizzleDb, id: number): UserRow | undefined =>
  db.select().from(users).where(eq(users.id, id)).get();

/**
 * Stores a new password digest and stamps `passwordUpdatedAt` (TICKET-AUTH-04). The timestamp is
 * the whole point of writing this in one place: it is what tells a seeded `admin` account that has
 * never been changed from one that has — see `usingDefaultPassword`.
 */
export const updateUserPassword = (
  tx: DbOrTx,
  id: number,
  digest: PasswordDigest,
  changedAt: Date,
): void => {
  tx.update(users)
    .set({ ...digest, passwordUpdatedAt: changedAt })
    .where(eq(users.id, id))
    .run();
};

/** The one field a non-admin may change about themselves (TICKET-AUTH-04). */
export const updateUserDisplayName = (db: DrizzleDb, id: number, displayName: string): void => {
  db.update(users).set({ displayName }).where(eq(users.id, id)).run();
};
