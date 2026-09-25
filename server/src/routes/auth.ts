import { Router } from 'express';

import { clearSessionCookie, readSessionToken, setSessionCookie } from '../auth/cookies.js';
import { unmatchableDigest, verifyPassword } from '../auth/passwords.js';
import { createSession, deleteSession } from '../auth/sessions.js';
import { findUserByEmail, toPublicUser } from '../auth/users.js';
import type { DrizzleDb } from '../db.js';
import { httpError } from '../http/errors.js';
import { authUserOf, createRequireAuth } from '../middleware/require-auth.js';

/**
 * One wording for a wrong password, an unknown identifier **and** a disabled account. Not security
 * theatre so much as simplicity: one failure path, one message, one test — and as a side effect
 * the response never confirms whether an account exists.
 */
const SIGN_IN_FAILED = 'Incorrect email or password';

/**
 * A digest nothing can match, verified against whenever the identifier is unknown.
 *
 * Without it the three failures are identical in wording but not in *cost*: an unknown identifier
 * returns before scrypt runs (~2ms) while a wrong password pays the full derivation (~75ms), and
 * that 40x gap answers "does this account exist?" from a single request — the exact question the
 * shared wording above exists to refuse. Built once at module load, since building it per request
 * would double the cost of every login.
 */
const absentUserDigest = unmatchableDigest();

type Credentials = { readonly email: string; readonly password: string };

/** A body that isn't two non-empty strings is a malformed request, not a failed sign-in. */
const readCredentials = (body: unknown): Credentials => {
  const { email, password } = (body ?? {}) as Partial<Record<keyof Credentials, unknown>>;
  if (
    typeof email !== 'string' ||
    email.trim() === '' ||
    typeof password !== 'string' ||
    password === ''
  ) {
    throw httpError(400, 'Email and password are required');
  }
  return { email, password };
};

/**
 * `/api/auth` — sign in, sign out, who am I (TICKET-AUTH-01). Login and logout are two of the
 * three routes in the app that are not behind `requireAuth`; `me` is behind it, since "no valid
 * session" is exactly the 401 it answers with.
 */
export const createAuthRouter = (db: DrizzleDb): Router => {
  const router = Router();
  const requireAuth = createRequireAuth(db);

  router.post('/login', async (req, res) => {
    const { email, password } = readCredentials(req.body);

    const user = findUserByEmail(db, email);

    // Always derive, then branch once. The `await` must not sit inside the condition below: a
    // short-circuit would skip the derivation for an unknown identifier and reopen the timing
    // gap described at `absentUserDigest`.
    const passwordOk = await verifyPassword(password, user ?? (await absentUserDigest));
    if (user === undefined || user.disabled || !passwordOk) throw httpError(401, SIGN_IN_FAILED);

    setSessionCookie(res, createSession(db, user.id));
    res.json(toPublicUser(user));
  });

  router.post('/logout', (req, res) => {
    const token = readSessionToken(req);
    // Idempotent: signing out without a session is a success, not an error — it leaves the client
    // in exactly the state it asked for.
    if (token !== undefined) deleteSession(db, token);
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json(authUserOf(req));
  });

  return router;
};
