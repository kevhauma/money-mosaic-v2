import { Router, type Request } from 'express';

import { hashPassword } from '../auth/passwords.js';
import { deleteUserSessions } from '../auth/sessions.js';
import {
  createUser,
  deleteUserWithData,
  enabledAdminCount,
  findUserByEmail,
  findUserById,
  listUsers,
  toAdminUser,
  updateUser,
  updateUserPassword,
  type UserChanges,
} from '../auth/users.js';
import type { DrizzleDb } from '../db.js';
import { httpError, notFound } from '../http/errors.js';
import { asRecord, toId } from '../http/validate.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { authUserOf } from '../middleware/require-auth.js';
import type { UserRow } from '../schema/users.js';
import type { SessionUser, UserRole } from '../types.js';

/**
 * `/api/admin/users` (TICKET-AUTH-03) — the endpoints behind the admin panel: list every account,
 * create one, rename/promote/disable it, reset its password, delete it and everything it owns.
 *
 * **Every rule here is enforced on the server.** The client hides the panel from a non-admin and
 * greys out the buttons that would break an invariant, but neither of those is the guarantee: the
 * whole router mounts behind `requireAdmin` (403), and each refusal below is a 409 the client cannot
 * talk its way past.
 *
 * The refusals are plain 409s with prose and deliberately carry no `clientCode`: unlike
 * TICKET-AUTH-04's wrong-current-password 401, the client does not *branch* on any of them — it
 * shows the sentence the server chose, on the panel the admin is already looking at. A code exists
 * for a failure a client must handle differently, not for one it must display.
 */

const ROLES: readonly UserRole[] = ['admin', 'user'];

/** A duplicate is refused by identifier, which is compared lowercased and trimmed. */
const DUPLICATE_EMAIL = 'An account with that email already exists';

/**
 * The three invariants that keep an installation administrable, one wording each. Each names the
 * action it refused, because "the last administrator" on its own does not say what was attempted.
 */
const LAST_ADMIN: Record<'demoted' | 'disabled' | 'deleted', string> = {
  demoted:
    'This is the last administrator, so it cannot be demoted. Promote another account to administrator first.',
  disabled:
    'This is the last administrator, so it cannot be disabled. Promote another account to administrator first.',
  deleted:
    'This is the last administrator, so it cannot be deleted. Promote another account to administrator first.',
};

/** What an admin aiming the two irreversible actions at themselves is told. */
const NOT_YOURSELF: Record<'disable' | 'delete' | 'reset', string> = {
  disable: 'You cannot disable your own account.',
  delete: 'You cannot delete your own account.',
  // Not an arbitrary restriction: this route sets a password *without* asking for the current one,
  // which is safe only because the person it targets is not the person making the request.
  // Self-targeted it would undo TICKET-AUTH-04 — the whole point of which is that holding a live
  // session is not enough to replace that account's password. Settings is where you change your own.
  reset: 'Change your own password from Settings, where it asks for your current one.',
};

const readNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '')
    throw httpError(400, `Invalid value for "${field}": expected a non-empty string`);
  return value.trim();
};

/** Not trimmed, unlike the fields above: a password is whatever was typed, spaces included. */
const readPassword = (body: unknown): string => {
  const { password } = asRecord(body);
  if (typeof password !== 'string' || password === '')
    throw httpError(400, 'Invalid value for "password": expected a non-empty string');
  return password;
};

const readRole = (value: unknown): UserRole => {
  if (typeof value !== 'string' || !ROLES.includes(value as UserRole))
    throw httpError(400, `Invalid value for "role": expected one of ${ROLES.join(', ')}`);
  return value as UserRole;
};

const readBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean')
    throw httpError(400, `Invalid value for "${field}": expected a boolean`);
  return value;
};

type NewAccount = {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
  readonly role: UserRole;
};

/**
 * `POST /`'s body. `role` is optional and defaults to `user` — the panel's create dialog offers the
 * choice, but an omitted role must never widen into an administrator.
 */
const readNewAccount = (body: unknown): NewAccount => {
  const record = asRecord(body);
  return {
    email: readNonEmptyString(record['email'], 'email'),
    displayName: readNonEmptyString(record['displayName'], 'displayName'),
    password: readPassword(body),
    role: record['role'] === undefined ? 'user' : readRole(record['role']),
  };
};

/**
 * `PATCH /:id`'s body: any subset of the three fields. A field the body does not name is left
 * alone, so a rename cannot silently re-assert a role read a minute earlier.
 */
const readChanges = (body: unknown): UserChanges => {
  const { displayName, role, disabled } = asRecord(body);
  return {
    ...(displayName === undefined
      ? {}
      : { displayName: readNonEmptyString(displayName, 'displayName') }),
    ...(role === undefined ? {} : { role: readRole(role) }),
    ...(disabled === undefined ? {} : { disabled: readBoolean(disabled, 'disabled') }),
  };
};

/** The account a `:id` route is about, or a 404 — a path segment that is not an id names no row. */
const targetOf = (db: DrizzleDb, req: Request): UserRow => {
  const id = toId(req.params['id']);
  const row = id === undefined ? undefined : findUserById(db, id);
  if (row === undefined) throw notFound();
  return row;
};

/**
 * Refuses an action that would leave the installation with no administrator who can sign in.
 *
 * Checked **before** the "not yourself" rules below, and that order is the whole reason all five
 * messages are reachable: only an enabled admin can call this router, so the last enabled admin is
 * always the caller. Were the self-rules first, a sole admin deleting their own account would be
 * told "you cannot delete your own account" — true, but not the reason, and it would suggest that
 * having somebody else do it would work. With two admins the self-rules are what answer, and
 * demoting yourself stays allowed exactly as the ticket asks.
 */
const assertAdminRemains = (
  db: DrizzleDb,
  target: UserRow,
  action: keyof typeof LAST_ADMIN,
): void => {
  if (target.role !== 'admin' || target.disabled) return;
  if (enabledAdminCount(db) <= 1) throw httpError(409, LAST_ADMIN[action]);
};

const assertNotSelf = (
  caller: SessionUser,
  target: UserRow,
  action: keyof typeof NOT_YOURSELF,
): void => {
  if (caller.id === target.id) throw httpError(409, NOT_YOURSELF[action]);
};

export const createAdminUsersRouter = (db: DrizzleDb): Router => {
  const router = Router();

  // On the router rather than on each route, so an endpoint added later is administrator-only by
  // existing here — the same reasoning `app.routes.ts` guards the shell with one guard.
  router.use(requireAdmin);

  router.get('/', (_req, res) => {
    res.json(listUsers(db).map(toAdminUser));
  });

  router.post('/', async (req, res) => {
    const account = readNewAccount(req.body);

    // Checked here so the answer is a 409 naming the identifier rather than the 500 a UNIQUE
    // constraint would become (`createErrorHandler` withholds a 5xx message on purpose). The unique
    // index is still the guarantee; this is the wording. Two admins creating the same email in the
    // same ~75ms would collide on the index and see that 500, which is the whole of the race.
    if (findUserByEmail(db, account.email) !== undefined) throw httpError(409, DUPLICATE_EMAIL);

    // Before the transaction `createUser` opens: `hashPassword` is deliberately slow (~75ms), and
    // holding a SQLite write transaction open across an await blocks every other writer for that
    // long.
    const digest = await hashPassword(account.password);

    res.status(201).json(toAdminUser(createUser(db, { ...account, digest })));
  });

  router.patch('/:id', (req, res) => {
    const caller = authUserOf(req);
    const target = targetOf(db, req);
    const changes = readChanges(req.body);

    if (changes.role === 'user') assertAdminRemains(db, target, 'demoted');
    if (changes.disabled === true) {
      assertAdminRemains(db, target, 'disabled');
      assertNotSelf(caller, target, 'disable');
    }

    // Cannot be `undefined`: `targetOf` just read the row by this id, and nothing between the two
    // can delete it — this router is the only thing that deletes a user, and Node is single-threaded.
    const updated = updateUser(db, target.id, changes) ?? target;

    // Disabling locks them out of the browsers they are *already* signed in on, not merely out of a
    // fresh sign-in. `findSessionUser` joins on `disabled = false`, so their sessions stopped
    // resolving the moment the row was written; deleting the rows is what stops them lingering
    // until a logout that will never come. Deliberately not in the same transaction as the patch
    // above: the order means the worst a failure between them can leave is dead session rows for an
    // account that is already locked out.
    if (changes.disabled === true) deleteUserSessions(db, target.id);

    res.json(toAdminUser(updated));
  });

  /**
   * Sets a password directly, with **no current password** — that is the point of an admin reset:
   * the person who forgot theirs is not the person making the request. Which is also why it refuses
   * to target the caller: on your own account that rule would mean a live session is enough to
   * replace the password, and TICKET-AUTH-04 exists precisely so that it is not.
   */
  router.post('/:id/password', async (req, res) => {
    const caller = authUserOf(req);
    const target = targetOf(db, req);
    assertNotSelf(caller, target, 'reset');
    const password = readPassword(req.body);

    const digest = await hashPassword(password);
    const changedAt = new Date();

    // Read back rather than synthesized from `target`: the row was read before the ~75ms hash above,
    // and a delete landing in that window would otherwise make both writes silent no-ops while this
    // still answered 200, telling an admin they had changed the password of an account that no
    // longer exists.
    const updated = db.transaction((tx) => {
      const row = updateUserPassword(tx, target.id, digest, changedAt);
      // Same transaction as the digest: a password that changed while the sessions using the old one
      // survived is the one outcome this endpoint must never leave behind.
      deleteUserSessions(tx, target.id);
      return row;
    });
    if (updated === undefined) throw notFound();

    res.json(toAdminUser(updated));
  });

  router.delete('/:id', (req, res) => {
    const caller = authUserOf(req);
    const target = targetOf(db, req);

    assertAdminRemains(db, target, 'deleted');
    assertNotSelf(caller, target, 'delete');

    deleteUserWithData(db, target.id);

    res.status(204).end();
  });

  return router;
};
