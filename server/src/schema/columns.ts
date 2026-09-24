import { sql } from 'drizzle-orm';
import { blob, check, integer, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

import { users } from './users.js';

/**
 * Column builders shared by the eighteen ported entity tables (TICKET-SRV-02).
 *
 * The Dexie schema these tables come from belonged to one person, so nothing in it said who owned
 * a row. Here every row does, and the rules that make that hold — not null, cascading, indexed —
 * are written once here rather than eighteen times.
 */

/**
 * The owner column on an entity table: not null, and cascading, so deleting a user is one
 * statement instead of eighteen (TICKET-AUTH-03). Pair it with `ownerIndex` — SQLite does not
 * index a foreign key column on its own, so without that index both the cascade and every
 * user-scoped query scan the table.
 */
export const ownerId = () =>
  integer('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' });

/**
 * The owner column on a **singleton** table — one row per user, keyed by the owner itself
 * (TICKET-SRV-02). The seven Dexie singletons were all keyed `id = 1`, a convention that only
 * makes sense while a database belongs to one person; the id is gone and the owner is the key.
 *
 * `notNull()` is not redundant on an `INTEGER PRIMARY KEY`: SQLite treats that column as a rowid
 * alias, where inserting NULL means "assign one for me" rather than "reject this row".
 */
export const ownerPrimaryKey = () =>
  integer('userId')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' });

/**
 * A nested object stored as JSON text — `Rule.conditions`, `MappingProfile.columns`,
 * `Account.coOwners`, `Transaction.rawRow` and the rest. IndexedDB stored structured clones and
 * needed no serialisation step; SQLite has no such luxury, and Drizzle's `json` mode is where the
 * `JSON.parse`/`stringify` pair lives so no call site repeats it.
 *
 * A JSON column cannot be indexed usefully, and none of these were indexed in Dexie either — with
 * one exception, `attributionOverride.reimbursementTransferId`, which `transactions` extracts into
 * a scalar column of its own.
 */
export const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>();

/**
 * A binary column for the three `ArrayBuffer` fields of `CategoryModelArtifact`. Reads back as a
 * `Buffer` (a `Uint8Array` subclass), byte for byte — which incidentally fixes the silent
 * model-weight loss recorded in TICKET-DAT-05, where `JSON.stringify` turned each buffer into an
 * empty object, because a server-stored model never passes through JSON at all.
 */
export const bytes = (name: string) => blob(name, { mode: 'buffer' }).$type<Uint8Array>();

/**
 * A CHECK pinning a text column to the members of its TypeScript union. Drizzle's `enum` on a
 * SQLite text column is types-only — it generates a bare `text` column, so nothing stops an
 * unexpected string arriving in a request body and then being handed back to the client typed as
 * the union (the reasoning `users_role_check` was added under, TICKET-AUTH-01).
 *
 * A NULL never fails a CHECK in SQLite, so the same helper covers optional columns.
 */
export const inList = (name: string, column: AnySQLiteColumn, values: readonly string[]) =>
  check(name, sql`${column} IN (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`);
