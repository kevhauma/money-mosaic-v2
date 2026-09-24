import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import * as schema from './index.js';

/**
 * Parity between the Dexie schema the client still runs on and the Drizzle schema that replaces it
 * (TICKET-SRV-02).
 *
 * **Everything here is derived, nothing is listed.** The Dexie side is parsed out of `app-db.ts`'s
 * `.stores()` strings and the Drizzle side is read off the table objects, so a future Dexie table
 * or index cannot silently go unported — a hand-written list would only ever restate what was true
 * the day it was typed.
 *
 * `app-db.ts` is **read as a file, not imported**: the TICKET-SRV-01 ESLint guard forbids the
 * backend importing from `src/app/`, and an import would also drag Dexie into a Node test.
 */

const APP_DB_FILE = fileURLToPath(
  new URL('../../../src/app/core/data-access/app-db.ts', import.meta.url),
);

/** `users` and `sessions` are the server's own (TICKET-AUTH-01); Dexie never had an equivalent. */
const SERVER_ONLY_TABLES = new Set(['users', 'sessions']);

type DexieIndex = { readonly field: string; readonly unique: boolean };

/** Offset of the `}` matching the `{` the slice starts just inside of. */
const findObjectEnd = (source: string, start: number): number => {
  let depth = 1;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1;
    else if (source[cursor] === '}') {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  throw new Error('unbalanced .stores({ ... }) object in app-db.ts');
};

const parseIndexes = (spec: string): DexieIndex[] =>
  spec
    .split(',')
    .map((part) => part.trim())
    // The first entry is the primary key (`++id` or `id`), not an index.
    .slice(1)
    .filter((part) => part.length > 0)
    .map((part) => ({ field: part.replace(/^[&*+]+/, ''), unique: part.startsWith('&') }));

/**
 * Every `.stores({...})` block in declaration order, flattened to one entry per table — last
 * declaration wins. That is exactly Dexie's own rule: from `.version(11)` onward `app-db.ts`
 * declares only the tables that are new or whose indexes changed, and Dexie carries the rest
 * forward, so folding the blocks in order reproduces the schema a v16 database actually has.
 */
const readDexieSchema = (): Map<string, DexieIndex[]> => {
  const source = fs.readFileSync(APP_DB_FILE, 'utf8');
  const declarations = new Map<string, string>();

  const marker = '.stores({';
  for (let at = source.indexOf(marker); at !== -1; at = source.indexOf(marker, at + 1)) {
    const start = at + marker.length;
    const block = source.slice(start, findObjectEnd(source, start));
    for (const match of block.matchAll(/(\w+)\s*:\s*'([^']*)'/g)) {
      declarations.set(match[1]!, match[2]!);
    }
  }

  if (declarations.size === 0) throw new Error('parsed no .stores() declarations from app-db.ts');

  return new Map([...declarations].map(([table, spec]) => [table, parseIndexes(spec)]));
};

/**
 * A dotted Dexie keypath indexes a field *inside* a stored object. SQLite cannot, so
 * `transactions` extracts the one that was indexed into a scalar column named for its last
 * segment — `attributionOverride.reimbursementTransferId` becomes `reimbursementTransferId`.
 */
const columnFor = (field: string): string => field.slice(field.lastIndexOf('.') + 1);

const columnNames = (columns: readonly unknown[]): string[] =>
  columns.map((column) =>
    typeof column === 'object' && column !== null && 'name' in column ? String(column.name) : '',
  );

// Widened to `unknown` first: `Object.values` on the barrel yields a union of every concrete
// table type, which no single type predicate is assignable to.
const drizzleTables = (Object.values(schema) as unknown[])
  .filter((value): value is SQLiteTable => is(value, SQLiteTable))
  .map((table) => getTableConfig(table));

const tableNamed = (name: string) => {
  const table = drizzleTables.find((candidate) => candidate.name === name);
  if (table === undefined) throw new Error(`no Drizzle table named ${name}`);
  return table;
};

const dexieSchema = readDexieSchema();
const entityTables = drizzleTables.filter((table) => !SERVER_ONLY_TABLES.has(table.name));

describe('schema: Dexie parity', () => {
  it('parses the eighteen object stores out of app-db.ts', () => {
    // A guard on the parser itself: if the regex ever stopped matching, every assertion below
    // would pass vacuously against an empty map.
    expect([...dexieSchema.keys()].sort()).toEqual([
      'accounts',
      'appSettings',
      'categories',
      'categoryComparisonSettings',
      'categoryModel',
      'categoryModelSettings',
      'dashboardLayoutSettings',
      'forecastSettings',
      'importBatches',
      'loans',
      'mappingProfiles',
      'recurringOverrides',
      'rules',
      'salaryMetadata',
      'savingsGoals',
      'transactions',
      'transferSettings',
      'transfers',
    ]);
  });

  it('has a Drizzle table for every Dexie store, and no entity table Dexie does not have', () => {
    expect(entityTables.map((table) => table.name).sort()).toEqual([...dexieSchema.keys()].sort());
  });

  it.each([...dexieSchema].filter(([, indexes]) => indexes.length > 0))(
    'ports every index Dexie declared on %s',
    (name, indexes) => {
      const indexed = tableNamed(name).indexes.map((index) => ({
        columns: columnNames(index.config.columns),
        unique: index.config.unique,
      }));

      for (const { field, unique } of indexes) {
        // Composite `(userId, field)`, not a plain index: every query in the new API filters by
        // owner first, so a single-column index would have the wrong leading column.
        const match = indexed.find(
          (candidate) =>
            candidate.columns[0] === 'userId' && candidate.columns[1] === columnFor(field),
        );
        expect(match, `${name}.${field} is not indexed on (userId, field)`).toBeDefined();
        expect(match?.unique ?? false, `${name}.${field} uniqueness`).toBe(unique);
      }
    },
  );
});

describe('schema: row ownership', () => {
  it.each(entityTables.map((table) => [table.name, table] as const))(
    '%s is owned by a user, not null, indexed, and cascading',
    (name, table) => {
      const owner = table.columns.find((column) => column.name === 'userId');
      expect(owner, `${name} has no userId column`).toBeDefined();
      expect(owner?.notNull, `${name}.userId nullability`).toBe(true);

      const toUsers = table.foreignKeys.find(
        (key) => key.reference().foreignTable === schema.users,
      );
      expect(toUsers, `${name} does not reference users`).toBeDefined();
      expect(columnNames(toUsers!.reference().columns)).toEqual(['userId']);
      expect(toUsers!.onDelete, `${name}.userId delete behaviour`).toBe('cascade');

      // SQLite does not index a foreign key column on its own, so without an index both the
      // cascade and every user-scoped query scan the table. A singleton table keys its primary
      // key on the owner, which is an index already.
      const ownerIndexed = table.indexes.some(
        (index) => columnNames(index.config.columns)[0] === 'userId',
      );
      expect(owner?.primary === true || ownerIndexed, `${name}.userId is not indexed`).toBe(true);
    },
  );
});
