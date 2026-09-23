import { onTestFinished } from 'vitest';
import type { Express } from 'express';

import { createApp } from './app.js';
import { openDatabase, runMigrations } from './db.js';

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

/**
 * Boots the real app against a migrated **in-memory** database — a backend spec never touches
 * `server/data/`. Both the server and the database close when the test ends.
 */
export const startTestApp = async ({ isDev = false } = {}): Promise<string> => {
  const handle = openDatabase(':memory:');
  onTestFinished(() => handle.close());
  runMigrations(handle);

  return startTestServer(createApp({ handle, isDev }));
};
