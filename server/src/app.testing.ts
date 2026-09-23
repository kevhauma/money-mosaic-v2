import { onTestFinished } from 'vitest';
import type { Express } from 'express';

import { createApp } from './app.js';
import { seedAdminUser } from './auth/seed.js';
import { openDatabase, runMigrations, type DatabaseHandle, type DrizzleDb } from './db.js';

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
