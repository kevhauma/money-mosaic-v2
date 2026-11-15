import { eq, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES, DEFAULT_MAPPING_PROFILE_TEMPLATES } from 'shared/seed-data.js';

import {
  apiFetch,
  apiJson,
  signInAs,
  startTestAppWithDb,
  TEST_PASSWORD,
  type TestApp,
  type TestSession,
} from '../app.testing.js';
import { createApiToken } from '../auth/api-tokens.js';
import { readCookie, SESSION_COOKIE } from '../auth/cookies.js';
import { apiTokens } from '../schema/api-tokens.js';
import { ownerOf, PER_USER_TABLES } from '../operations/user-rows.js';
import { categoryModel } from '../schema/category-model.js';
import { sessions } from '../schema/sessions.js';
import { users } from '../schema/users.js';
import type { AdminUser } from '../types.js';
import { ENTITY_SAMPLES, seedFixtures } from './samples.testing.js';
import { SETTINGS_TABLES } from './settings.js';

/**
 * The admin panel's endpoints (TICKET-AUTH-03).
 *
 * Every promise the ticket makes is a promise about the **server**, not about a hidden button: a
 * non-admin is refused per endpoint, the last administrator cannot be removed by any of the three
 * routes that could, a reset ends the sessions it invalidates, and deleting an account takes every
 * row it owns with it. Each of those is a test here rather than a code reading.
 */

const BASE = '/api/admin/users';

/**
 * Every endpoint of the router, for the 401/403 sweeps. Each carries a body that would otherwise be
 * *valid*, so a refusal is the middleware's and not a 400 standing in for it.
 */
const ENDPOINTS: readonly {
  readonly method: string;
  readonly path: string;
  readonly body?: Record<string, unknown>;
}[] = [
  { method: 'GET', path: BASE },
  {
    method: 'POST',
    path: BASE,
    body: { email: 'intruder', displayName: 'Intruder', password: 'letmein' },
  },
  { method: 'PATCH', path: `${BASE}/1`, body: { displayName: 'Renamed' } },
  { method: 'POST', path: `${BASE}/1/password`, body: { password: 'letmein' } },
  { method: 'DELETE', path: `${BASE}/1` },
];

type AdminApp = { readonly app: TestApp; readonly admin: TestSession };

/**
 * An app with one administrator signed in, and **no** first-boot seed: every account in these tests
 * is one the test made, so "the last administrator" is a state the test controls rather than one it
 * inherits.
 */
const startAdminApp = async (): Promise<AdminApp> => {
  const app = await startTestAppWithDb({ seed: false });
  return { app, admin: await signInAs(app, 'root', 'admin') };
};

/** Signs in over HTTP, answering with the status and the cookie headers when it worked. */
const signIn = async (
  app: TestApp,
  email: string,
  password: string,
): Promise<{ status: number; headers: Record<string, string> }> => {
  const response = await fetch(`${app.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  for (const header of response.headers.getSetCookie()) {
    const token = readCookie(header.split(';')[0] ?? '', SESSION_COOKIE);
    if (token !== undefined)
      return { status: response.status, headers: { cookie: `${SESSION_COOKIE}=${token}` } };
  }
  return { status: response.status, headers: {} };
};

/** A session held by a real browser — what a reset or a disable has to invalidate. */
const heldSession = async (app: TestApp, email: string): Promise<TestSession> => {
  const { status, headers } = await signIn(app, email, TEST_PASSWORD);
  expect(status).toBe(200);
  return { id: 0, email, headers };
};

const createAccount = (
  { app, admin }: AdminApp,
  body: Record<string, unknown>,
): Promise<{ status: number; body: AdminUser }> =>
  apiJson<AdminUser>(app, BASE, { as: admin, method: 'POST', body });

const userCount = (app: TestApp): number => app.db.select().from(users).all().length;

describe('api: /api/admin/users authorisation', () => {
  it('answers 403 on every endpoint for a signed-in non-admin', async () => {
    const { app } = await startAdminApp();
    const member = await signInAs(app, 'member');

    for (const endpoint of ENDPOINTS) {
      const { status, body } = await apiJson<{ error: string }>(app, endpoint.path, {
        as: member,
        method: endpoint.method,
        body: endpoint.body,
      });

      expect(status, `${endpoint.method} ${endpoint.path}`).toBe(403);
      expect(body.error).toBe('This is an administrator-only action');
    }
  });

  it('answers 401 on every endpoint without a session', async () => {
    const { app } = await startAdminApp();

    for (const { method, path, body } of ENDPOINTS) {
      const response = await apiFetch(app, path, { method, body });
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });

  it('does not leak a password digest in the list an admin does get', async () => {
    const context = await startAdminApp();
    await createAccount(context, { email: 'ada', displayName: 'Ada', password: 'secret' });

    const { status, body } = await apiJson<AdminUser[]>(context.app, BASE, { as: context.admin });

    expect(status).toBe(200);
    expect(body).toHaveLength(2);
    expect(Object.keys(body[1]!).sort()).toEqual([
      'createdAt',
      'disabled',
      'displayName',
      'email',
      'id',
      'passwordUpdatedAt',
      'role',
    ]);
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });
});

describe('api: POST /api/admin/users', () => {
  it('creates an account that can sign in and opens a seeded, empty app', async () => {
    const context = await startAdminApp();

    const created = await createAccount(context, {
      email: '  Ada@Example.com ',
      displayName: 'Ada',
      password: 'lovelace',
    });

    expect(created.status).toBe(201);
    // Stored normalised, which is what makes the unique index case-insensitive in practice.
    expect(created.body).toMatchObject({ email: 'ada@example.com', role: 'user', disabled: false });

    const { status, headers } = await signIn(context.app, 'ada@example.com', 'lovelace');
    expect(status).toBe(200);

    const session: TestSession = { id: created.body.id, email: created.body.email, headers };
    const categories = await apiJson<unknown[]>(context.app, '/api/categories', { as: session });
    const profiles = await apiJson<unknown[]>(context.app, '/api/mappingProfiles', { as: session });
    const transfers = await apiJson<{ matchWindowDays: number }>(
      context.app,
      '/api/settings/transferSettings',
      { as: session },
    );
    const transactions = await apiJson<unknown[]>(context.app, '/api/transactions', {
      as: session,
    });

    expect(categories.body).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(profiles.body).toHaveLength(DEFAULT_MAPPING_PROFILE_TEMPLATES.length);
    expect(transfers.body.matchWindowDays).toBeGreaterThan(0);
    // Seeded, but empty of anybody's figures — the new account starts with no data of its own.
    expect(transactions.body).toEqual([]);
  });

  it('creates an administrator when asked, and an ordinary user when not', async () => {
    const context = await startAdminApp();

    const second = await createAccount(context, {
      email: 'grace',
      displayName: 'Grace',
      password: 'hopper',
      role: 'admin',
    });
    const third = await createAccount(context, {
      email: 'alan',
      displayName: 'Alan',
      password: 'turing',
    });

    expect(second.body.role).toBe('admin');
    expect(third.body.role).toBe('user');
  });

  it('refuses a duplicate email differing only in case or whitespace, and creates nothing', async () => {
    const context = await startAdminApp();
    await createAccount(context, { email: 'ada', displayName: 'Ada', password: 'lovelace' });
    const before = userCount(context.app);

    const duplicate = await createAccount(context, {
      email: '  ADA ',
      displayName: 'Impostor',
      password: 'other',
    });

    expect(duplicate.status).toBe(409);
    expect((duplicate.body as unknown as { error: string }).error).toBe(
      'An account with that email already exists',
    );
    expect(userCount(context.app)).toBe(before);
  });

  it('refuses a body missing a field, naming the field', async () => {
    const context = await startAdminApp();

    const { status, body } = await apiJson<{ error: string }>(context.app, BASE, {
      as: context.admin,
      method: 'POST',
      body: { email: 'ada', displayName: '', password: 'lovelace' },
    });

    expect(status).toBe(400);
    expect(body.error).toContain('displayName');
  });
});

describe('api: PATCH /api/admin/users/:id', () => {
  it('renames and promotes an account', async () => {
    const context = await startAdminApp();
    const { body: ada } = await createAccount(context, {
      email: 'ada',
      displayName: 'Ada',
      password: 'lovelace',
    });

    const { status, body } = await apiJson<AdminUser>(context.app, `${BASE}/${ada.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { displayName: 'Ada Lovelace', role: 'admin' },
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({ displayName: 'Ada Lovelace', role: 'admin' });
  });

  it('answers 404 for an id that is nobody', async () => {
    const context = await startAdminApp();

    const response = await apiFetch(context.app, `${BASE}/9999`, {
      as: context.admin,
      method: 'PATCH',
      body: { displayName: 'Nobody' },
    });

    expect(response.status).toBe(404);
  });

  it('disabling ends the sessions the user is already signed in on, and blocks a fresh sign-in', async () => {
    const context = await startAdminApp();
    const ada = await signInAs(context.app, 'ada');
    const held = await heldSession(context.app, 'ada');

    // The held cookie works right up to the moment the account is disabled.
    expect((await apiFetch(context.app, '/api/auth/me', { as: held })).status).toBe(200);

    const disabled = await apiJson<AdminUser>(context.app, `${BASE}/${ada.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { disabled: true },
    });

    expect(disabled.status).toBe(200);
    expect(disabled.body.disabled).toBe(true);
    expect((await apiFetch(context.app, '/api/auth/me', { as: held })).status).toBe(401);
    expect(context.app.db.select().from(sessions).where(eq(sessions.userId, ada.id)).all()).toEqual(
      [],
    );
    expect((await signIn(context.app, 'ada', TEST_PASSWORD)).status).toBe(401);
  });

  it('re-enabling an account lets it sign in again', async () => {
    const context = await startAdminApp();
    const ada = await signInAs(context.app, 'ada');

    await apiJson(context.app, `${BASE}/${ada.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { disabled: true },
    });
    await apiJson(context.app, `${BASE}/${ada.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { disabled: false },
    });

    expect((await signIn(context.app, 'ada', TEST_PASSWORD)).status).toBe(200);
  });
});

describe('api: POST /api/admin/users/:id/password', () => {
  it('sets a new password without the old one, refuses the old one, and ends every session', async () => {
    const context = await startAdminApp();
    const ada = await signInAs(context.app, 'ada');
    const held = await heldSession(context.app, 'ada');

    const reset = await apiJson<AdminUser>(context.app, `${BASE}/${ada.id}/password`, {
      as: context.admin,
      method: 'POST',
      body: { password: 'brand-new' },
    });

    expect(reset.status).toBe(200);
    // The cookie held across the reset is dead — an in-progress session cannot outlive it.
    expect((await apiFetch(context.app, '/api/auth/me', { as: held })).status).toBe(401);
    expect(context.app.db.select().from(sessions).where(eq(sessions.userId, ada.id)).all()).toEqual(
      [],
    );

    expect((await signIn(context.app, 'ada', TEST_PASSWORD)).status).toBe(401);
    expect((await signIn(context.app, 'ada', 'brand-new')).status).toBe(200);
  });

  it('stamps passwordUpdatedAt so the panel can show when it last changed', async () => {
    const context = await startAdminApp();
    const { body: ada } = await createAccount(context, {
      email: 'ada',
      displayName: 'Ada',
      password: 'lovelace',
    });

    const { body: reset } = await apiJson<AdminUser>(context.app, `${BASE}/${ada.id}/password`, {
      as: context.admin,
      method: 'POST',
      body: { password: 'brand-new' },
    });

    expect(new Date(reset.passwordUpdatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(ada.passwordUpdatedAt).getTime(),
    );
    expect(reset.createdAt).toBe(ada.createdAt);
  });

  it('refuses an empty password', async () => {
    const context = await startAdminApp();
    const ada = await signInAs(context.app, 'ada');

    const { status, body } = await apiJson<{ error: string }>(
      context.app,
      `${BASE}/${ada.id}/password`,
      { as: context.admin, method: 'POST', body: { password: '' } },
    );

    expect(status).toBe(400);
    expect(body.error).toContain('password');
  });
});

describe('api: the last administrator', () => {
  /** The three routes that could leave an installation with nobody able to administer it. */
  const attempts = [
    {
      what: 'demoted',
      request: { path: '', method: 'PATCH', body: { role: 'user' } },
      message:
        'This is the last administrator, so it cannot be demoted. Promote another account to administrator first.',
    },
    {
      what: 'disabled',
      request: { path: '', method: 'PATCH', body: { disabled: true } },
      message:
        'This is the last administrator, so it cannot be disabled. Promote another account to administrator first.',
    },
    {
      what: 'deleted',
      request: { path: '', method: 'DELETE', body: undefined },
      message:
        'This is the last administrator, so it cannot be deleted. Promote another account to administrator first.',
    },
  ] as const;

  it.each(attempts)('cannot be $what', async ({ request, message }) => {
    const context = await startAdminApp();
    // A second, ordinary account exists: the rule is about the last *administrator*, not the last
    // account.
    await signInAs(context.app, 'member');

    const { status, body } = await apiJson<{ error: string }>(
      context.app,
      `${BASE}/${context.admin.id}${request.path}`,
      { as: context.admin, method: request.method, body: request.body },
    );

    expect(status).toBe(409);
    expect(body.error).toBe(message);
    expect(
      context.app.db.select().from(users).where(eq(users.id, context.admin.id)).get(),
    ).toMatchObject({ role: 'admin', disabled: false });
  });

  it('may be demoted, disabled or deleted once another administrator exists', async () => {
    const context = await startAdminApp();
    const second = await signInAs(context.app, 'second', 'admin');

    // Demoting *yourself* is allowed while another admin remains — the ticket says so explicitly.
    const demoted = await apiJson<AdminUser>(context.app, `${BASE}/${context.admin.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { role: 'user' },
    });
    expect(demoted.status).toBe(200);
    expect(demoted.body.role).toBe('user');

    // And the other admin can then disable and delete the demoted account.
    const disabled = await apiJson(context.app, `${BASE}/${context.admin.id}`, {
      as: second,
      method: 'PATCH',
      body: { disabled: true },
    });
    expect(disabled.status).toBe(200);

    const deleted = await apiFetch(context.app, `${BASE}/${context.admin.id}`, {
      as: second,
      method: 'DELETE',
    });
    expect(deleted.status).toBe(204);
  });

  it('ignores a disabled administrator when counting who can still administer', async () => {
    const context = await startAdminApp();
    const spare = await signInAs(context.app, 'spare', 'admin');
    await apiJson(context.app, `${BASE}/${spare.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { disabled: true },
    });

    // Two rows have `role: 'admin'`, but only one of them can sign in — so the caller is still the
    // last administrator.
    const { status } = await apiJson(context.app, `${BASE}/${context.admin.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { role: 'user' },
    });

    expect(status).toBe(409);
  });
});

describe('api: an admin acting on their own account', () => {
  it('cannot disable or delete themselves, even with another administrator present', async () => {
    const context = await startAdminApp();
    await signInAs(context.app, 'second', 'admin');

    const disabled = await apiJson<{ error: string }>(context.app, `${BASE}/${context.admin.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { disabled: true },
    });
    expect(disabled.status).toBe(409);
    expect(disabled.body.error).toBe('You cannot disable your own account.');

    const deleted = await apiJson<{ error: string }>(context.app, `${BASE}/${context.admin.id}`, {
      as: context.admin,
      method: 'DELETE',
    });
    expect(deleted.status).toBe(409);
    expect(deleted.body.error).toBe('You cannot delete your own account.');

    expect(
      context.app.db.select().from(users).where(eq(users.id, context.admin.id)).get(),
    ).toMatchObject({ disabled: false });
  });

  it('cannot reset their own password from the panel — that would bypass TICKET-AUTH-04', async () => {
    const context = await startAdminApp();
    const before = context.app.db.select().from(users).where(eq(users.id, context.admin.id)).get();

    const { status, body } = await apiJson<{ error: string }>(
      context.app,
      `${BASE}/${context.admin.id}/password`,
      { as: context.admin, method: 'POST', body: { password: 'no-old-password-needed' } },
    );

    // This route asks for no current password, which is safe only aimed at somebody else. Allowed on
    // your own account it would mean a live session is enough to replace that account's password —
    // exactly what the self-service route in Settings exists to prevent.
    expect(status).toBe(409);
    expect(body.error).toBe(
      'Change your own password from Settings, where it asks for your current one.',
    );
    expect(context.app.db.select().from(users).where(eq(users.id, context.admin.id)).get()).toEqual(
      before,
    );
  });

  it('may still rename themselves from the panel', async () => {
    const context = await startAdminApp();

    const { status, body } = await apiJson<AdminUser>(context.app, `${BASE}/${context.admin.id}`, {
      as: context.admin,
      method: 'PATCH',
      body: { displayName: 'The Boss' },
    });

    expect(status).toBe(200);
    expect(body.displayName).toBe('The Boss');
  });
});

describe('api: DELETE /api/admin/users/:id', () => {
  /** One row in **every** user-owned table, so "everything they own" is an exact count. */
  const fillEveryTable = async (app: TestApp, user: TestSession): Promise<void> => {
    const fixtures = seedFixtures(app.db, user.id);
    for (const sample of ENTITY_SAMPLES) {
      const response = await apiFetch(app, sample.path, {
        as: user,
        method: 'POST',
        body: sample.create(fixtures),
      });
      expect(response.status, sample.path).toBe(201);
    }

    // An empty patch creates the singleton row from the shared defaults (`settings.ts`).
    for (const { name } of SETTINGS_TABLES) {
      const response = await apiFetch(app, `/api/settings/${name}`, {
        as: user,
        method: 'PATCH',
        body: {},
      });
      expect(response.status, name).toBe(200);
    }

    // The seventh singleton speaks binary rather than JSON, so it is written directly — a plausible
    // row is all this needs, not a real trained model.
    app.db
      .insert(categoryModel)
      .values({
        userId: user.id,
        modelTopology: Buffer.alloc(8),
        weightSpecs: Buffer.alloc(8),
        weightData: Buffer.alloc(8),
        categoryIdByIndex: [fixtures.categoryId],
        featureConfig: { dim: 64, charNgramMin: 3, charNgramMax: 5 },
        taxonomySignature: 'sig',
        metrics: { accuracy: 1, trainedSampleCount: 1, epochsRun: 1 },
        trainedAt: '2026-03-01T10:00:00.000Z',
        schemaVersion: 2,
      })
      .run();
  };

  const rowCounts = (app: TestApp, userId: number): Record<string, number> =>
    Object.fromEntries(
      PER_USER_TABLES.map((table) => [
        getTableName(table),
        app.db
          .select()
          .from(table)
          .where(eq(ownerOf(table), userId))
          .all().length,
      ]),
    );

  it('removes the account, its sessions, its API tokens and every row it owns, leaving everyone else intact', async () => {
    const context = await startAdminApp();
    const victim = await signInAs(context.app, 'victim');
    const bystander = await signInAs(context.app, 'bystander');
    await fillEveryTable(context.app, victim);
    await fillEveryTable(context.app, bystander);
    createApiToken(context.app.db, victim.id, 'laptop');
    createApiToken(context.app.db, bystander.id, 'laptop');

    const before = rowCounts(context.app, victim.id);
    const bystanderBefore = rowCounts(context.app, bystander.id);
    // The premise: every user-owned table holds at least one of the victim's rows, so the counts
    // after the delete are an assertion about all eighteen rather than about a convenient sample.
    expect(Object.entries(before).filter(([, rows]) => rows === 0)).toEqual([]);
    expect(
      context.app.db.select().from(sessions).where(eq(sessions.userId, victim.id)).all(),
    ).toHaveLength(1);

    const response = await apiFetch(context.app, `${BASE}/${victim.id}`, {
      as: context.admin,
      method: 'DELETE',
    });

    expect(response.status).toBe(204);
    expect(Object.values(rowCounts(context.app, victim.id))).toEqual(PER_USER_TABLES.map(() => 0));
    expect(
      context.app.db.select().from(users).where(eq(users.id, victim.id)).get(),
    ).toBeUndefined();
    expect(
      context.app.db.select().from(sessions).where(eq(sessions.userId, victim.id)).all(),
    ).toEqual([]);
    expect(
      context.app.db
        .select()
        .from(apiTokens)
        .all()
        .map((token) => token.userId),
    ).toEqual([bystander.id]);
    // Ids are unique per table across users, so a delete that filtered on the wrong column would
    // take somebody else's rows with it.
    expect(rowCounts(context.app, bystander.id)).toEqual(bystanderBefore);
  });

  it('answers 404 for an id that is nobody, without touching anything', async () => {
    const context = await startAdminApp();
    const before = userCount(context.app);

    const response = await apiFetch(context.app, `${BASE}/9999`, {
      as: context.admin,
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    expect(userCount(context.app)).toBe(before);
  });
});
