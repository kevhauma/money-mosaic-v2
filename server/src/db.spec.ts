import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { openDatabase, readSchemaVersion, runMigrations, type DatabaseHandle } from './db.js';

const opened: DatabaseHandle[] = [];
const tempDirs: string[] = [];

/** Opens an in-memory database and closes it after the test. */
const openMemory = (): DatabaseHandle => {
  const handle = openDatabase(':memory:');
  opened.push(handle);
  return handle;
};

/**
 * Opens a file database under the OS temp dir — never `server/data/`. WAL is the one thing an
 * in-memory database cannot report (SQLite answers `memory`), so that pragma needs a real file.
 */
const openTempFile = (): { handle: DatabaseHandle; file: string } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-server-db-'));
  tempDirs.push(dir);
  const file = path.join(dir, 'nested', 'money-mosaic.sqlite');
  const handle = openDatabase(file);
  opened.push(handle);
  return { handle, file };
};

afterEach(() => {
  for (const handle of opened.splice(0)) handle.close();
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('db: openDatabase', () => {
  it('creates the database file and its parent directory on first open', () => {
    const { handle, file } = openTempFile();

    expect(fs.existsSync(file)).toBe(true);
    expect(handle.sqlite.open).toBe(true);
  });

  it('enforces foreign keys and journals in WAL mode', () => {
    const { handle } = openTempFile();

    expect(handle.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(handle.sqlite.pragma('journal_mode', { simple: true })).toBe('wal');
  });

  it('enforces foreign keys on an in-memory database too', () => {
    expect(openMemory().sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
  });
});

describe('db: readSchemaVersion', () => {
  it('reports 0 before any migration has run', () => {
    expect(readSchemaVersion(openMemory())).toBe(0);
  });

  it('counts the migrations the database has applied', () => {
    const handle = openMemory();
    runMigrations(handle);

    // TICKET-AUTH-01 landed the first migration (`users` + `sessions`), so the count is no longer
    // zero — what matters here is that the bookkeeping table exists and is readable.
    expect(readSchemaVersion(handle)).toBeGreaterThan(0);
    expect(
      handle.sqlite
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
        .get('__drizzle_migrations'),
    ).toBeDefined();
  });
});
