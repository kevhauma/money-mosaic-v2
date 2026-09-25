import { onTestFinished } from 'vitest';
import type { Express } from 'express';

import { createApp } from './app.js';
import { readCookie, SESSION_COOKIE } from './auth/cookies.js';
import { hashPassword } from './auth/passwords.js';
import { seedAdminUser } from './auth/seed.js';
import { openDatabase, runMigrations, type DatabaseHandle, type DrizzleDb } from './db.js';
import { users } from './schema/users.js';

/**
 * Testing-only harness for the backend specs. Every suite that needs a live server repeats the
 * same four steps — open a database, migrate it, listen on an ephemeral port, tear both down —
 * so they live here once instead of once per spec file.
 *
 * Cleanup registers through `onTestFinished` rather than a module-level `afterEach`: this module
 * is imported by several spec files and Node caches it, so a top-level hook would only ever
 * attach to whichever file imported it first.
 */

/** Listens on an ephemeral port and returns the base URL. The server closes when the test ends. */
export const startTestServer = async (app: Express): Promise<string> => {
  const server = app.listen(0);
  onTestFinished(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  await new Promise<void>((resolve) => server.once('listening', resolve));

  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('server has no TCP port');
  return `http://127.0.0.1:${address.port}`;
};

export type TestAppOptions = {
  readonly isDev?: boolean;
  /** Seed the first-boot `admin` / `admin` account, exactly as `index.ts` does. */
  readonly seed?: boolean;
};

export type TestApp = {
  readonly baseUrl: string;
  readonly handle: DatabaseHandle;
  /** The same Drizzle instance the app is serving, so a spec can assert on rows directly. */
  readonly db: DrizzleDb;
};

/**
 * Boots the real app against a migrated **in-memory** database — a backend spec never touches
 * `server/data/` — and seeds it the way a first boot would. Both the server and the database close
 * when the test ends.
 */
export const startTestAppWithDb = async ({
  isDev = false,
  seed = true,
}: TestAppOptions = {}): Promise<TestApp> => {
  const handle = openDatabase(':memory:');
  onTestFinished(() => handle.close());
  runMigrations(handle);
  if (seed) await seedAdminUser(handle.db);

  const baseUrl = await startTestServer(createApp({ handle, isDev }));
  return { baseUrl, handle, db: handle.db };
};

/** `startTestAppWithDb` for the specs that only need the URL. */
export const startTestApp = async (options: TestAppOptions = {}): Promise<string> =>
  (await startTestAppWithDb(options)).baseUrl;

/* --------------------------------------------------------------------------------------------
 * Signed-in requests (TICKET-SRV-03)
 *
 * Every entity endpoint is behind `requireAuth`, so a route spec's first two lines are always
 * "make a user, sign it in". Two users, in fact: the whole point of the isolation tests is that
 * one of them cannot see the other's rows.
 * ------------------------------------------------------------------------------------------ */

/** Password every test user is created with. Nothing here tests password strength. */
export const TEST_PASSWORD = 'test-password';

export type TestSession = {
  readonly id: number;
  readonly email: string;
  /** Headers that authenticate a `fetch` as this user. */
  readonly headers: Record<string, string>;
};

/**
 * The scrypt digest of `TEST_PASSWORD`, derived once. Key derivation is deliberately expensive
 * (~75ms), and a spec that makes two users per test would otherwise spend most of its time proving
 * scrypt still works — which `passwords.spec.ts` already does.
 */
let testDigest: Promise<Awaited<ReturnType<typeof hashPassword>>> | undefined;

const testPasswordDigest = (): Promise<Awaited<ReturnType<typeof hashPassword>>> =>
  (testDigest ??= hashPassword(TEST_PASSWORD));

/** The session token a login response handed back, read out of its `Set-Cookie` header. */
const sessionCookieOf = (response: Response): string => {
  for (const header of response.headers.getSetCookie()) {
    const token = readCookie(header.split(';')[0] ?? '', SESSION_COOKIE);
    if (token !== undefined) return token;
  }
  throw new Error('login did not set a session cookie');
};

/** Creates an ordinary (non-admin) user and signs it in over HTTP, cookie and all. */
export const signInAs = async (app: TestApp, email: string): Promise<TestSession> => {
  const id = app.db
    .insert(users)
    .values({
      email,
      displayName: email,
      ...(await testPasswordDigest()),
      role: 'user',
      disabled: false,
    })
    .returning({ id: users.id })
    .get().id;

  const response = await fetch(`${app.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  if (!response.ok) throw new Error(`could not sign in as ${email}`);

  return { id, email, headers: { cookie: `${SESSION_COOKIE}=${sessionCookieOf(response)}` } };
};

export type ApiRequest = {
  /** Omit to make the request signed-out, which is what the 401 checks do. */
  readonly as?: TestSession;
  readonly method?: string;
  /** Sent as a JSON body. Mutually exclusive with `binary`. */
  readonly body?: unknown;
  /** Sent as `application/octet-stream`, for the model artifact endpoints. */
  readonly binary?: Uint8Array;
};

/** One `/api` request, with or without a session. */
export const apiFetch = (
  app: TestApp,
  path: string,
  { as, method = 'GET', body, binary }: ApiRequest = {},
): Promise<Response> => {
  const headers: Record<string, string> = { ...as?.headers };
  if (binary !== undefined) headers['content-type'] = 'application/octet-stream';
  else if (body !== undefined) headers['content-type'] = 'application/json';

  return fetch(`${app.baseUrl}${path}`, {
    method,
    headers,
    body: binary ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
};

/** `apiFetch` for the (many) cases that want the status and the parsed body together. */
export const apiJson = async <T = unknown>(
  app: TestApp,
  path: string,
  request: ApiRequest = {},
): Promise<{ status: number; body: T }> => {
  const response = await apiFetch(app, path, request);
  const text = await response.text();
  return { status: response.status, body: (text === '' ? undefined : JSON.parse(text)) as T };
};

/* --------------------------------------------------------------------------------------------
 * Forced failures (TICKET-SRV-04)
 *
 * Every transactional endpoint has to answer the question "and if the *last* step fails?" with
 * "then nothing happened". A trigger that raises on one statement is how a spec asks it: no
 * production code learns it is being tested, and the failure lands exactly where the endpoint is
 * least defended rather than at the first validation it happens to reach.
 * ------------------------------------------------------------------------------------------ */

/** Makes the next `INSERT`/`UPDATE`/`DELETE` on a table abort, taking its transaction with it. */
export const abortOn = (
  app: TestApp,
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
): void => {
  app.handle.sqlite.exec(
    `CREATE TRIGGER abort_${event}_${table} BEFORE ${event} ON "${table}" ` +
      `BEGIN SELECT RAISE(ABORT, 'forced failure (test)'); END`,
  );
};
