import { createHash, randomBytes } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';

import type { DrizzleDb } from '../db.js';
import { apiTokens } from '../schema/api-tokens.js';
import { users } from '../schema/users.js';
import type { SessionUser } from '../types.js';
import { toSessionUser } from './session-user.js';

/**
 * Personal access tokens for `/mcp` (TICKET-MCP-01). A token is 32 random bytes as hex with an
 * `mm_` prefix, so a leaked one is recognisable; only its SHA-256 is stored. A fast hash is enough
 * here — the token is random, not a password, so there is nothing to brute-force a dictionary at.
 */
const TOKEN_BYTES = 32;

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** Creates a token for a user and returns the plain token — the only time it exists. */
export const createApiToken = (db: DrizzleDb, userId: number, name: string): string => {
  const token = `mm_${randomBytes(TOKEN_BYTES).toString('hex')}`;
  db.insert(apiTokens)
    .values({ userId, name, tokenHash: hashToken(token) })
    .run();
  return token;
};

/**
 * The user a token belongs to, or `undefined` for an unknown or revoked token, or one whose user
 * is disabled — the same rule `findSessionUser` applies to a cookie.
 */
export const findTokenUser = (db: DrizzleDb, token: string): SessionUser | undefined => {
  const row = db
    .select({ user: users })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .where(and(eq(apiTokens.tokenHash, hashToken(token)), eq(users.disabled, false)))
    .get();

  return row === undefined ? undefined : toSessionUser(row.user);
};

export type ApiTokenListing = {
  readonly id: number;
  readonly login: string;
  readonly name: string;
  readonly createdAt: Date;
};

/** Every token, oldest first — never the hash. */
export const listApiTokens = (db: DrizzleDb): ApiTokenListing[] =>
  db
    .select({
      id: apiTokens.id,
      login: users.email,
      name: apiTokens.name,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .orderBy(asc(apiTokens.id))
    .all();

/** Deletes a token; answers whether one existed. */
export const revokeApiToken = (db: DrizzleDb, id: number): boolean =>
  db.delete(apiTokens).where(eq(apiTokens.id, id)).run().changes > 0;
