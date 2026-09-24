import { onTestFinished } from 'vitest';

import { openDatabase, runMigrations, type DatabaseHandle, type DrizzleDb } from './db.js';
import { users } from './schema/users.js';

/**
 * Testing-only database harness, the sibling of `app.testing.ts` (which boots the whole Express
 * app). Specs that only need tables — schema parity, constraints, seeding — take this instead, so
 * the four-line open/migrate/close dance is written once rather than per spec file.
 *
 * Cleanup registers through `onTestFinished` rather than a module-level `afterEach`: Node caches
 * this module across the spec files that import it, so a top-level hook would only ever attach to
 * whichever file imported it first.
 */

/** A migrated, empty **in-memory** database with foreign keys on. Never `server/data/`. */
export const freshDatabase = (): DatabaseHandle => {
  const handle = openDatabase(':memory:');
  onTestFinished(() => handle.close());
  runMigrations(handle);
  return handle;
};

/** A minimal user to own rows under test. Returns the assigned id. */
export const createTestUser = (db: DrizzleDb, email: string): number =>
  db
    .insert(users)
    .values({ email, displayName: email, passwordHash: 'hash', passwordSalt: 'salt' })
    .returning({ id: users.id })
    .get().id;
