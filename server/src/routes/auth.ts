import { Router } from 'express';

import { clearSessionCookie, readSessionToken, setSessionCookie } from '../auth/cookies.js';
import { hashPassword, unmatchableDigest, verifyPassword } from '../auth/passwords.js';
import { toSessionUser } from '../auth/session-user.js';
import { createSession, deleteOtherSessions, deleteSession } from '../auth/sessions.js';
import {
  findUserByEmail,
  findUserById,
  updateUserDisplayName,
  updateUserPassword,
} from '../auth/users.js';
import type { DrizzleDb } from '../db.js';
import { httpError } from '../http/errors.js';
import { asRecord } from '../http/validate.js';
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

/** What a wrong `currentPassword` is answered with — a 401, since it is a failed *re*-authentication. */
const WRONG_CURRENT_PASSWORD = 'Current password is incorrect';

/**
 * The machine-readable half of that answer, because this route's 401 is ambiguous: `requireAuth`
 * ahead of it answers 401 too, for a session that expired while the form sat open. Same status, same
 * URL, opposite handling — one belongs inline on the form, the other has to sign the user out — so
 * the client needs something other than prose to tell them apart (TICKET-AUTH-04). Mirrored in
 * `src/app/core/auth/auth-endpoints.ts`.
 */
const WRONG_CURRENT_PASSWORD_CODE = 'wrong_current_password';

type PasswordChange = { readonly currentPassword: string; readonly newPassword: string };

/**
 * Both fields are required and neither may be empty (TICKET-AUTH-04). There is deliberately no
 * strength rule beyond "not empty": this server is a LAN box whose seeded credentials are
 * `admin`/`admin`, and a policy the brief does not ask for would only lock people out of their own
 * data. There is no `id` either — see the route.
 */
const readPasswordChange = (body: unknown): PasswordChange => {
  const { currentPassword, newPassword } = asRecord(body);
  if (
    typeof currentPassword !== 'string' ||
    currentPassword === '' ||
    typeof newPassword !== 'string' ||
    newPassword === ''
  ) {
    throw httpError(400, 'Current and new password are required');
  }
  return { currentPassword, newPassword };
};

/** The only field of themselves a non-admin may change (TICKET-AUTH-04). */
const readDisplayName = (body: unknown): string => {
  const { displayName } = asRecord(body);
  if (typeof displayName !== 'string' || displayName.trim() === '') {
    throw httpError(400, 'Display name is required');
  }
  return displayName.trim();
};

/**
 * `/api/auth` — sign in, sign out, who am I (TICKET-AUTH-01), change your own password and display
 * name (TICKET-AUTH-04). Login and logout are two of the three routes in the app that are not
 * behind `requireAuth`; `me` is behind it, since "no valid session" is exactly the 401 it answers
 * with, and so are the two self-service routes below.
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
    // `toSessionUser`, not `toPublicUser`: a fresh sign-in is the moment the default-password
    // reminder has to be decidable, and making the client fetch `me` straight after a login it just
    // completed would be a second round trip for a fact this response already holds.
    res.json(toSessionUser(user));
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

  /**
   * Changes the **caller's own** password (TICKET-AUTH-04). There is no id parameter anywhere on
   * this route: the account comes from the session cookie and from nowhere else, so there is no
   * shape of request that could aim it at somebody else's password. Resetting another account's
   * password is an admin operation and lives on the admin routes (TICKET-AUTH-03).
   */
  router.post('/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = readPasswordChange(req.body);
    const { id } = authUserOf(req);

    // The session carries a `SessionUser`, which holds no digest — so the row is read back by the
    // id the cookie already proved, and the old password is verified against it.
    const row = findUserById(db, id);
    if (row === undefined || !(await verifyPassword(currentPassword, row)))
      throw httpError(401, WRONG_CURRENT_PASSWORD, WRONG_CURRENT_PASSWORD_CODE);

    // Derived before the transaction: `hashPassword` is deliberately slow (~75ms), and holding a
    // SQLite write transaction open across an await would block every other writer for that long.
    const digest = await hashPassword(newPassword);
    const changedAt = new Date();
    // Cannot be undefined behind `requireAuth` — that middleware read the same cookie to get here.
    // The fallback is chosen to fail *safe* rather than open: an empty token matches no session row,
    // so it would end every session of this user including the caller's, which is the cautious half
    // of the two possible mistakes.
    const callerToken = readSessionToken(req) ?? '';

    db.transaction((tx) => {
      updateUserPassword(tx, id, digest, changedAt);
      // Same transaction as the digest: a password that changed while the other sessions survived is
      // the one outcome this endpoint must never leave behind.
      deleteOtherSessions(tx, id, callerToken);
    });

    // The caller's own cookie is untouched and still valid, and the updated user carries
    // `usingDefaultPassword: false` (`passwordUpdatedAt` has moved off `createdAt`), so the client
    // can drop its reminder without re-fetching `me`.
    res.json(toSessionUser({ ...row, ...digest, passwordUpdatedAt: changedAt }));
  });

  /** Renames the caller — the one field a non-admin may change about themselves (TICKET-AUTH-04). */
  router.patch('/me', requireAuth, (req, res) => {
    const displayName = readDisplayName(req.body);
    const user = authUserOf(req);

    updateUserDisplayName(db, user.id, displayName);

    // Answered from the session user plus the field just written, rather than by reading the row
    // back: the update targeted one column of one id, so a second `SELECT` would only be a slower
    // way of saying the same thing.
    res.json({ ...user, displayName });
  });

  return router;
};
