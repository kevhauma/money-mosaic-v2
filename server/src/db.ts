import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { MIGRATIONS_DIR } from './config.js';
import * as schema from './schema/index.js';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Either the database or an open transaction on it. A write helper that takes this can be called
 * standalone *or* composed into a caller's larger transaction, which is what lets `seedAdminUser`
 * make "create the user and give them their first-run data" a single atomic step.
 */
export type DbOrTx = DrizzleDb | Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

export type DatabaseHandle = {
  /** The raw better-sqlite3 connection — pragmas, migrations and health checks use it directly. */
  readonly sqlite: Database.Database;
  /** The single Drizzle instance every query goes through. */
  readonly db: DrizzleDb;
  readonly close: () => void;
};

const IN_MEMORY = ':memory:';

/** Bookkeeping table Drizzle's SQLite migrator writes one row into per applied migration. */
const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * Opens (and, for a file database, creates) the SQLite database with the pragmas this app relies
 * on: foreign keys enforced, and WAL journalling so a reader never blocks the writer. WAL is not
 * available to an in-memory database, which is why tests assert it against a temp file instead.
 */
export const openDatabase = (file: string): DatabaseHandle => {
  if (file !== IN_MEMORY) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const sqlite = new Database(file);
  sqlite.pragma('foreign_keys = ON');
  if (file !== IN_MEMORY) {
    sqlite.pragma('journal_mode = WAL');
  }

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
    close: () => sqlite.close(),
  };
};

/**
 * Applies every migration in `folder` that this database hasn't seen. Drizzle records what it has
 * applied in `__drizzle_migrations`, so a second run against the same file is a no-op.
 */
export const runMigrations = (handle: DatabaseHandle, folder: string = MIGRATIONS_DIR): void => {
  migrate(handle.db, { migrationsFolder: folder });
};

/**
 * How many migrations this database has applied — reported by `/api/health` so a client can tell
 * which shape of the schema it is talking to. Zero until the first migration lands.
 */
export const readSchemaVersion = (handle: DatabaseHandle): number => {
  const table = handle.sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(MIGRATIONS_TABLE);
  if (table === undefined) return 0;

  const row = handle.sqlite.prepare(`SELECT count(*) AS count FROM ${MIGRATIONS_TABLE}`).get() as
    { count?: number } | undefined;
  return row?.count ?? 0;
};
