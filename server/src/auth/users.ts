import { and, asc, count, eq, sql } from 'drizzle-orm';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { clearUserRows } from '../operations/user-rows.js';
import { seedUserDefaults } from '../seed-user-defaults.js';
import { users, type UserRow } from '../schema/users.js';
import type { AdminUser, PublicUser, UserRole } from '../types.js';
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

/**
 * The same row as the admin panel's list describes it (TICKET-AUTH-03) — `toPublicUser` plus the
 * three fields an administrator needs, and still not a digest: this goes through `toPublicUser`
 * rather than spreading the row, so "can a hash reach the wire?" has one answer and not two.
 */
export const toAdminUser = (row: UserRow): AdminUser => ({
  ...toPublicUser(row),
  disabled: row.disabled,
  createdAt: row.createdAt.toISOString(),
  passwordUpdatedAt: row.passwordUpdatedAt.toISOString(),
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
 *
 * Answers the updated row, or `undefined` when no account has that id — which is how a caller that
 * read the row before the deliberately-slow hash learns the account was deleted in the meantime.
 */
export const updateUserPassword = (
  tx: DbOrTx,
  id: number,
  digest: PasswordDigest,
  changedAt: Date,
): UserRow | undefined =>
  tx
    .update(users)
    .set({ ...digest, passwordUpdatedAt: changedAt })
    .where(eq(users.id, id))
    .returning()
    .get();

/** The one field a non-admin may change about themselves (TICKET-AUTH-04). */
export const updateUserDisplayName = (db: DrizzleDb, id: number, displayName: string): void => {
  db.update(users).set({ displayName }).where(eq(users.id, id)).run();
};

/* --------------------------------------------------------------------------------------------
 * Managing the other accounts (TICKET-AUTH-03)
 *
 * The write side of the admin panel. It lives here, with the rest of the `users` table's access,
 * rather than inside the router: an account and the rows it owns have to be created and destroyed
 * together, and that transaction is a property of the table, not of an HTTP method.
 * ------------------------------------------------------------------------------------------ */

/** Every account, oldest first, so the list does not reorder itself as rows are edited. */
export const listUsers = (db: DrizzleDb): UserRow[] =>
  db.select().from(users).orderBy(asc(users.id)).all();

export type NewUser = {
  readonly email: string;
  readonly displayName: string;
  readonly digest: PasswordDigest;
  readonly role: UserRole;
};

/**
 * Creates an account **and its first-run data** in one transaction — the same pairing
 * `seedAdminUser` makes on first boot, for the same reason: a user left holding no categories, no
 * mapping profiles and no transfer settings opens an app that cannot import a statement, and
 * nothing would ever retry the missing half.
 *
 * `createdAt === passwordUpdatedAt` on a fresh account, as on the seeded one. Only the seeded
 * identifier is nagged about it (`usingDefaultPassword`) — an admin choosing somebody's first
 * password has not left a *shared* secret in place.
 */
export const createUser = (
  db: DrizzleDb,
  { email, displayName, digest, role }: NewUser,
): UserRow => {
  const now = new Date();

  return db.transaction((tx) => {
    const row = tx
      .insert(users)
      .values({
        email: normaliseEmail(email),
        displayName,
        ...digest,
        role,
        disabled: false,
        createdAt: now,
        passwordUpdatedAt: now,
      })
      .returning()
      .get();

    seedUserDefaults(tx, row.id);
    return row;
  });
};

/** The three fields an admin may change about somebody else. */
export type UserChanges = {
  readonly displayName?: string;
  readonly role?: UserRole;
  readonly disabled?: boolean;
};

/**
 * Patches an account, or answers `undefined` when no account has that id. A patch naming no field
 * is not an error — it reads the row back, the way the entity API's `PATCH` does.
 */
export const updateUser = (db: DrizzleDb, id: number, changes: UserChanges): UserRow | undefined =>
  Object.keys(changes).length === 0
    ? findUserById(db, id)
    : db.update(users).set(changes).where(eq(users.id, id)).returning().get();

/**
 * How many administrators could actually sign in right now.
 *
 * `disabled` counts, not just the role: an installation whose only enabled admin has just been
 * demoted, disabled or deleted cannot be administered by anybody, which is the one state the
 * invariants in `admin-users.ts` exist to keep out — and a disabled admin is no more use for that
 * than no admin at all.
 */
export const enabledAdminCount = (db: DrizzleDb): number =>
  db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.disabled, false)))
    .get()?.value ?? 0;

/**
 * Deletes an account **and every row it owns**, in one transaction (TICKET-AUTH-03) — the single
 * most destructive operation in the app.
 *
 * The rows are cleared explicitly rather than left to the `ON DELETE CASCADE` on every `userId`:
 * the cascade would do it, but `loans.categoryId` is NO ACTION, so the order SQLite happens to
 * cascade in is a constraint failure waiting to happen. `defer_foreign_keys` moves every check to
 * COMMIT, which is also what makes the deletion order nobody's business. `sessions` is left to its
 * own cascade — it references only the user, so nothing can refuse it.
 */
export const deleteUserWithData = (db: DrizzleDb, id: number): void => {
  db.transaction((tx) => {
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);
    clearUserRows(tx, id);
    tx.delete(users).where(eq(users.id, id)).run();
  });
};
