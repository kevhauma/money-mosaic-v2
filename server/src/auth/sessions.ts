import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

import type { DrizzleDb } from '../db.js';
import { sessions } from '../schema/sessions.js';
import { users } from '../schema/users.js';
import { toPublicUser } from './users.js';
import type { PublicUser } from '../types.js';

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
export const findSessionUser = (db: DrizzleDb, token: string): PublicUser | undefined => {
  const row = db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), eq(users.disabled, false)))
    .get();

  return row === undefined ? undefined : toPublicUser(row.user);
};

/** Ends a session. Deleting a token that was never a session is a no-op, not an error. */
export const deleteSession = (db: DrizzleDb, token: string): void => {
  db.delete(sessions).where(eq(sessions.token, token)).run();
};
