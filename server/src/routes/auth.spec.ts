import express from 'express';
import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

const verifyPasswordCalls = vi.hoisted(() => vi.fn());

// The login route answers a wrong password and an unknown identifier with the same body, but that
// is only half the promise: if an unknown identifier skipped the key derivation it would answer in
// ~2ms against ~75ms, and the difference alone would confirm whether an account exists. Timings
// are too flaky to assert directly, so this counts derivations instead — the thing that makes them
// equal. The mock delegates to the real implementation.
vi.mock('../auth/passwords.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../auth/passwords.js')>();
  return {
    ...actual,
    verifyPassword: (
      password: string,
      digest: Parameters<typeof actual.verifyPassword>[1],
    ): Promise<boolean> => {
      verifyPasswordCalls();
      return actual.verifyPassword(password, digest);
    },
  };
});

import { startTestAppWithDb, startTestServer, type TestApp } from '../app.testing.js';
import { SESSION_COOKIE, readCookie } from '../auth/cookies.js';
import { hashPassword } from '../auth/passwords.js';
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from '../auth/seed.js';
import type { DrizzleDb } from '../db.js';
import { createErrorHandler } from '../middleware/error-handler.js';
import { authUserOf, createRequireAuth } from '../middleware/require-auth.js';
import { sessions } from '../schema/sessions.js';
import { users } from '../schema/users.js';
import type { PublicUser } from '../types.js';

const JSON_HEADERS = { 'content-type': 'application/json' };

const login = (baseUrl: string, email: unknown, password: unknown): Promise<Response> =>
  fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });

/** The session token a response handed back, read out of its `Set-Cookie` header. */
const sessionCookieOf = (response: Response): string | undefined => {
  for (const header of response.headers.getSetCookie()) {
    const token = readCookie(header.split(';')[0] ?? '', SESSION_COOKIE);
    if (token !== undefined) return token;
  }
  return undefined;
};

const withCookie = (token: string): Record<string, string> => ({
  cookie: `${SESSION_COOKIE}=${token}`,
});

/** Signs in and returns the session token, failing loudly if the credentials were rejected. */
const signIn = async (baseUrl: string, email: string, password: string): Promise<string> => {
  const response = await login(baseUrl, email, password);
  expect(response.status).toBe(200);
  const token = sessionCookieOf(response);
  if (token === undefined) throw new Error('login did not set a session cookie');
  return token;
};

const addUser = async (
  db: DrizzleDb,
  user: { email: string; password: string; disabled?: boolean },
): Promise<void> => {
  db.insert(users)
    .values({
      email: user.email,
      displayName: user.email,
      ...(await hashPassword(user.password)),
      role: 'user',
      disabled: user.disabled ?? false,
    })
    .run();
};

const seededApp = (): Promise<TestApp> => startTestAppWithDb();

describe('api: POST /api/auth/login', () => {
  it('signs the seeded admin in and returns the public user with an HttpOnly cookie', async () => {
    const { baseUrl, db } = await seededApp();

    const response = await login(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    expect(response.status).toBe(200);
    const body = (await response.json()) as PublicUser;
    expect(body).toEqual({
      id: expect.any(Number) as number,
      email: 'admin',
      displayName: 'Administrator',
      role: 'admin',
    });

    const cookie = response.headers.getSetCookie().join('; ');
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const token = sessionCookieOf(response);
    expect(db.select().from(sessions).where(eq(sessions.token, token!)).get()).toMatchObject({
      userId: body.id,
    });
  });

  it('accepts the identifier case-insensitively and with surrounding whitespace', async () => {
    const { baseUrl } = await seededApp();

    expect((await login(baseUrl, '  ADMIN ', SEED_ADMIN_PASSWORD)).status).toBe(200);
  });

  it('answers a wrong password, an unknown email and a disabled account identically', async () => {
    const { baseUrl, db } = await seededApp();
    await addUser(db, { email: 'blocked', password: 'letmein', disabled: true });

    const responses = await Promise.all([
      login(baseUrl, SEED_ADMIN_EMAIL, 'not-the-password'),
      login(baseUrl, 'nobody-here', 'not-the-password'),
      login(baseUrl, 'blocked', 'letmein'),
    ]);

    const bodies = await Promise.all(responses.map((response) => response.text()));
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401]);
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).toBe(JSON.stringify({ error: 'Incorrect email or password' }));
    expect(responses.flatMap((response) => response.headers.getSetCookie())).toEqual([]);
    expect(db.select().from(sessions).all()).toEqual([]);
  });

  it('derives a password hash even for an unknown identifier, so the three answers cost the same', async () => {
    const { baseUrl } = await seededApp();
    verifyPasswordCalls.mockClear();

    await login(baseUrl, 'nobody-here', 'not-the-password');

    // Returning early on `user === undefined` would leave this at 0 and reopen the timing gap.
    expect(verifyPasswordCalls).toHaveBeenCalledTimes(1);
  });

  it('answers a body that is not two strings with 400, not a failed sign-in', async () => {
    const { baseUrl } = await seededApp();

    expect((await login(baseUrl, SEED_ADMIN_EMAIL, undefined)).status).toBe(400);
    expect((await login(baseUrl, '   ', SEED_ADMIN_PASSWORD)).status).toBe(400);
    expect((await login(baseUrl, 42, SEED_ADMIN_PASSWORD)).status).toBe(400);
  });
});

describe('api: GET /api/auth/me', () => {
  it('returns the signed-in user for a valid cookie', async () => {
    const { baseUrl } = await seededApp();
    const token = await signIn(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    const response = await fetch(`${baseUrl}/api/auth/me`, { headers: withCookie(token) });

    expect(response.status).toBe(200);
    expect((await response.json()) as PublicUser).toMatchObject({ email: 'admin', role: 'admin' });
  });

  it('401s for a missing, malformed or deleted-session cookie', async () => {
    const { baseUrl, db } = await seededApp();
    const token = await signIn(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
    db.delete(sessions).where(eq(sessions.token, token)).run();

    const statuses = await Promise.all(
      [
        fetch(`${baseUrl}/api/auth/me`),
        fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: 'not-a-cookie' } }),
        // Undecodable percent sequence — this answered 500 before the cookie reader caught it.
        fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: 'mm_session=%zz' } }),
        fetch(`${baseUrl}/api/auth/me`, { headers: withCookie('0'.repeat(64)) }),
        fetch(`${baseUrl}/api/auth/me`, { headers: withCookie(token) }),
      ].map(async (request) => (await request).status),
    );

    expect(statuses).toEqual([401, 401, 401, 401, 401]);
  });
});

describe('api: POST /api/auth/logout', () => {
  it('deletes the session row, clears the cookie, and 401s if the cookie is reused', async () => {
    const { baseUrl, db } = await seededApp();
    const token = await signIn(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: withCookie(token),
    });

    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie().join('; ')).toContain(`${SESSION_COOKIE}=;`);
    expect(db.select().from(sessions).all()).toEqual([]);

    const reused = await fetch(`${baseUrl}/api/auth/me`, { headers: withCookie(token) });
    expect(reused.status).toBe(401);
  });

  it('is idempotent: signing out without a session is a 204', async () => {
    const { baseUrl } = await seededApp();

    expect((await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' })).status).toBe(204);
  });
});

describe('api: auth responses never carry a password digest', () => {
  it('leaks neither the hash nor the salt in any auth response', async () => {
    const { baseUrl, db } = await seededApp();
    const stored = db.select().from(users).get();
    const token = await signIn(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    const serialised = (
      await Promise.all(
        [
          login(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD),
          login(baseUrl, SEED_ADMIN_EMAIL, 'wrong'),
          fetch(`${baseUrl}/api/auth/me`, { headers: withCookie(token) }),
          fetch(`${baseUrl}/api/auth/me`),
          fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: withCookie(token) }),
        ].map(async (request) => {
          const response = await request;
          return `${await response.text()} ${response.headers.getSetCookie().join(' ')}`;
        }),
      )
    ).join('\n');

    expect(serialised).not.toContain(stored!.passwordHash);
    expect(serialised).not.toContain(stored!.passwordSalt);
    expect(serialised).not.toContain('passwordHash');
    expect(serialised).not.toContain('passwordSalt');
  });
});

describe('api: requireAuth', () => {
  /** A throwaway app with one protected route, mounted behind the real middleware. */
  const startGuardedServer = (db: DrizzleDb): Promise<string> => {
    const app = express();
    app.get('/guarded', createRequireAuth(db), (req, res) => {
      res.json(authUserOf(req));
    });
    app.use(createErrorHandler(() => undefined));
    return startTestServer(app);
  };

  it('rejects an unauthenticated request and passes an authenticated one through', async () => {
    const { baseUrl, db } = await seededApp();
    const guardedUrl = await startGuardedServer(db);

    const anonymous = await fetch(`${guardedUrl}/guarded`);
    expect(anonymous.status).toBe(401);
    expect((await anonymous.json()) as { error: string }).toEqual({ error: 'Not signed in' });

    const token = await signIn(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
    const authenticated = await fetch(`${guardedUrl}/guarded`, { headers: withCookie(token) });

    expect(authenticated.status).toBe(200);
    expect((await authenticated.json()) as PublicUser).toMatchObject({ email: 'admin' });
  });

  it('rejects a session whose user was disabled after signing in', async () => {
    const { baseUrl, db } = await seededApp();
    const guardedUrl = await startGuardedServer(db);
    const token = await signIn(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    db.update(users).set({ disabled: true }).where(eq(users.email, 'admin')).run();

    expect((await fetch(`${guardedUrl}/guarded`, { headers: withCookie(token) })).status).toBe(401);
  });
});

describe('db: sessions cascade', () => {
  it('deletes the sessions of a user that is deleted', async () => {
    const { baseUrl, db } = await seededApp();
    await signIn(baseUrl, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
    expect(db.select().from(sessions).all()).toHaveLength(1);

    db.delete(users).where(eq(users.email, 'admin')).run();

    expect(db.select().from(sessions).all()).toEqual([]);
  });
});
