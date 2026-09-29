import { eq, getTableColumns, getTableName, is } from 'drizzle-orm';
import { SQLiteTable, type SQLiteColumn } from 'drizzle-orm/sqlite-core';

import type { DbOrTx } from '../db.js';
import * as schema from '../schema/index.js';

/**
 * Which tables hold a user's data, and how to empty them — the one answer two very different
 * endpoints need: `DELETE /api/data` (FR-DAT-3, TICKET-SRV-04) clears a user's rows and keeps the
 * account, and `DELETE /api/admin/users/:id` (TICKET-AUTH-03) clears them and deletes the account
 * with them.
 *
 * **The table list is derived, never written down.** The client's `exportAll`/`deleteAll` were
 * generic over `appDb.tables` for exactly this reason: a table added later has to be covered
 * without anyone remembering this file. Here that means reading the Drizzle schema's own exports,
 * minus the two tables the server owns rather than the user.
 *
 * It lives here rather than in `routes/data.ts`, where it started, because "every row this user
 * owns" is not a fact about one endpoint — and the admin delete reaching into a sibling route
 * module for it would make that endpoint's blast radius depend on an import nobody expects.
 */

/** `users` and `sessions` are the server's own bookkeeping (TICKET-AUTH-01), not the user's data. */
const SERVER_OWN_TABLES = new Set(['users', 'sessions']);

/** A table of user-owned rows: `userId`, and (except on the singletons) a surrogate `id`. */
export type PerUserTable = SQLiteTable & { readonly userId: SQLiteColumn };

const columnOf = (table: SQLiteTable, name: string): SQLiteColumn | undefined =>
  (getTableColumns(table) as Record<string, SQLiteColumn>)[name];

export const ownerOf = (table: PerUserTable): SQLiteColumn => table.userId;

/** `undefined` on the singleton tables, where the owner *is* the key (TICKET-SRV-02). */
export const idOf = (table: PerUserTable): SQLiteColumn | undefined => columnOf(table, 'id');

/**
 * Every table whose rows belong to a user, read off the schema in its own declaration order.
 *
 * Widened to `unknown` first, the way `dexie-parity.spec.ts` does it: `Object.values` on the barrel
 * yields a union of every concrete table type, which no single type predicate is assignable to.
 */
export const PER_USER_TABLES: readonly PerUserTable[] = (Object.values(schema) as unknown[])
  .filter((value): value is SQLiteTable => is(value, SQLiteTable))
  .filter((table) => !SERVER_OWN_TABLES.has(getTableName(table)))
  .map((table) => table as PerUserTable);

/**
 * Deletes every row this user owns, in every table — `DELETE /api/data`, a `replace` import's first
 * half, and the data half of deleting the account itself.
 *
 * Opens no transaction: each caller already owns one, and "some of this user's tables are empty" is
 * the one state none of them may leave behind. The caller also owns the
 * `PRAGMA defer_foreign_keys` this needs — `loans.categoryId` is NO ACTION, so clearing
 * `categories` before `loans` is refused mid-transaction on an order that is otherwise nobody's
 * business.
 */
export const clearUserRows = (tx: DbOrTx, userId: number): void => {
  for (const table of PER_USER_TABLES) {
    tx.delete(table)
      .where(eq(ownerOf(table), userId))
      .run();
  }
};
