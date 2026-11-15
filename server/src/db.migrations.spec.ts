import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MIGRATIONS_DIR } from './config.js';
import { openDatabase, readSchemaVersion, runMigrations, type DatabaseHandle } from './db.js';

const opened: DatabaseHandle[] = [];
const tempDirs: string[] = [];

const openMemory = (): DatabaseHandle => {
  const handle = openDatabase(':memory:');
  opened.push(handle);
  return handle;
};

/**
 * Writes a throwaway migrations folder in the same shape `drizzle-kit generate` produces, so
 * idempotency is exercised against a migration that owns its own throwaway table, independent of
 * whatever the repo's `server/drizzle` folder currently holds.
 */
const writeMigrationsFolder = (sql: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-server-migrations-'));
  tempDirs.push(dir);
  const tag = '0000_test_migration';
  fs.writeFileSync(path.join(dir, `${tag}.sql`), sql, 'utf8');
  fs.mkdirSync(path.join(dir, 'meta'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'meta', '_journal.json'),
    JSON.stringify({
      version: '7',
      dialect: 'sqlite',
      entries: [{ idx: 0, version: '6', when: Date.now(), tag, breakpoints: true }],
    }),
    'utf8',
  );
  return dir;
};

const countMigrationRows = (handle: DatabaseHandle): number =>
  (
    handle.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get() as {
      count: number;
    }
  ).count;

afterEach(() => {
  for (const handle of opened.splice(0)) handle.close();
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('db: runMigrations', () => {
  it('applies a pending migration once and does nothing on a second run', () => {
    const folder = writeMigrationsFolder('CREATE TABLE widget (id integer PRIMARY KEY);');
    const handle = openMemory();

    runMigrations(handle, folder);
    expect(countMigrationRows(handle)).toBe(1);
    handle.sqlite.prepare('INSERT INTO widget (id) VALUES (1)').run();

    runMigrations(handle, folder);

    expect(countMigrationRows(handle)).toBe(1);
    expect(handle.sqlite.prepare('SELECT count(*) AS count FROM widget').get()).toEqual({
      count: 1,
    });
  });

  it('applies the repo migrations folder cleanly, twice', () => {
    const handle = openMemory();

    expect(() => runMigrations(handle, MIGRATIONS_DIR)).not.toThrow();
    const first = readSchemaVersion(handle);
    expect(() => runMigrations(handle, MIGRATIONS_DIR)).not.toThrow();

    expect(readSchemaVersion(handle)).toBe(first);
  });

  it('brings a database one migration behind up to date, with its rows intact', () => {
    // The repo folder minus its newest journal entry: a database as the previous release left it.
    const behind = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-server-migrations-'));
    tempDirs.push(behind);
    fs.cpSync(MIGRATIONS_DIR, behind, { recursive: true });
    const journalFile = path.join(behind, 'meta', '_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8')) as { entries: unknown[] };
    fs.writeFileSync(
      journalFile,
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, -1) }),
    );
    const handle = openMemory();
    runMigrations(handle, behind);
    handle.sqlite
      .prepare(
        `INSERT INTO users (email, displayName, passwordHash, passwordSalt) VALUES ('a', 'a', 'h', 's')`,
      )
      .run();

    runMigrations(handle, MIGRATIONS_DIR);

    expect(readSchemaVersion(handle)).toBe(journal.entries.length);
    expect(handle.sqlite.prepare('SELECT count(*) AS count FROM users').get()).toEqual({
      count: 1,
    });
  });

  it('ships a migrations journal drizzle-kit can extend', () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8'),
    ) as { dialect: string; entries: unknown[] };

    expect(journal.dialect).toBe('sqlite');
    expect(Array.isArray(journal.entries)).toBe(true);
  });
});
