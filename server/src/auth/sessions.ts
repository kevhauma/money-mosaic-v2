import { randomBytes } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { sessions } from '../schema/sessions.js';
import { users } from '../schema/users.js';
import { toSessionUser } from './session-user.js';
import type { SessionUser } from '../types.js';

/** 32 random bytes as hex — the cookie value, and the `sessions` primary key. */
const TOKEN_BYTES = 32;

/** Starts a session for a user and returns the token to hand back as a cookie. */
export const createSession = (db: DrizzleDb, userId: number): string => {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  db.insert(sessions).values({ token, userId, createdAt: new Date() }).run();
  return token;
};

/**
 * Resolves a token to the user it belongs to, or `undefined` for a token that is unknown, whose
 * row was deleted, or whose user has since been disabled — a disabled account loses its open
 * sessions as well as its ability to sign in.
 */
export const findSessionUser = (db: DrizzleDb, token: string): SessionUser | undefined => {
  const row = db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), eq(users.disabled, false)))
    .get();

  return row === undefined ? undefined : toSessionUser(row.user);
};

/** Ends a session. Deleting a token that was never a session is a no-op, not an error. */
export const deleteSession = (db: DrizzleDb, token: string): void => {
  db.delete(sessions).where(eq(sessions.token, token)).run();
};

/**
 * Ends **every** session of a user (TICKET-AUTH-03) — what an admin resetting somebody's password
 * or disabling their account does to the browsers they are already signed in on.
 *
 * No `keepToken` counterpart to `deleteOtherSessions`: this is somebody else's account being acted
 * on, so there is no session of theirs that deserves to survive it. An admin who aims either
 * operation at their *own* account is signed out here along with everyone else, which is the honest
 * outcome — "every session of that user" cannot have an exception for the one doing the resetting
 * without the guarantee becoming "every session except possibly one".
 */
export const deleteUserSessions = (tx: DbOrTx, userId: number): void => {
  tx.delete(sessions).where(eq(sessions.userId, userId)).run();
};

/**
 * Ends every session of a user **except** the one making the request (TICKET-AUTH-04).
 *
 * Keeping the caller's own token is deliberate: the realistic reason to change a password on a LAN
 * box is "I think someone else is signed in as me", and the answer to that should sign *them* out,
 * not log you out of the tab you just typed your new password into.
 */
export const deleteOtherSessions = (tx: DbOrTx, userId: number, keepToken: string): void => {
  tx.delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.token, keepToken)))
    .run();
};
