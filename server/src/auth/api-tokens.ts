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

/** One of a user's own tokens, as the Settings panel lists it (TICKET-MCP-05) — never the hash. */
export type OwnApiToken = {
  readonly id: number;
  readonly name: string;
  readonly createdAt: Date;
};

const OWN_TOKEN_COLUMNS = {
  id: apiTokens.id,
  name: apiTokens.name,
  createdAt: apiTokens.createdAt,
};

/** Creates a token for a user and returns it with its plain token — the only time that exists. */
export const issueApiToken = (
  db: DrizzleDb,
  userId: number,
  name: string,
): OwnApiToken & { readonly token: string } => {
  const token = `mm_${randomBytes(TOKEN_BYTES).toString('hex')}`;
  const row = db
    .insert(apiTokens)
    .values({ userId, name, tokenHash: hashToken(token) })
    .returning(OWN_TOKEN_COLUMNS)
    .get();
  return { ...row, token };
};

/** `issueApiToken`, keeping only the plain token. */
export const createApiToken = (db: DrizzleDb, userId: number, name: string): string =>
  issueApiToken(db, userId, name).token;

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

/** One user's tokens, oldest first (TICKET-MCP-05). */
export const listOwnApiTokens = (db: DrizzleDb, userId: number): OwnApiToken[] =>
  db
    .select(OWN_TOKEN_COLUMNS)
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(asc(apiTokens.id))
    .all();

/**
 * Deletes a token; answers whether one existed. With `userId`, only that user's token — the web
 * route's form (TICKET-MCP-05); the CLI omits it to revoke anyone's.
 */
export const revokeApiToken = (db: DrizzleDb, id: number, userId?: number): boolean =>
  db
    .delete(apiTokens)
    .where(
      and(eq(apiTokens.id, id), userId === undefined ? undefined : eq(apiTokens.userId, userId)),
    )
    .run().changes > 0;
