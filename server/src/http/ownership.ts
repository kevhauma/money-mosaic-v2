import { and, eq, getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, type SQLiteColumn, type SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { DbOrTx } from '../db.js';
import { accounts } from '../schema/accounts.js';
import { importBatches } from '../schema/import-batches.js';
import { mappingProfiles } from '../schema/mapping-profiles.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import { users } from '../schema/users.js';
import { notFound } from './errors.js';
import type { EntityValues } from './validate.js';

/**
 * The write-path half of per-user isolation (TICKET-SRV-03): a row one user owns may not reference
 * a row another user owns.
 *
 * **Reads were never at risk** — every query the API issues carries `where userId = ?`. The gap
 * TICKET-SRV-02 left open is on the way *in*: `transactions.accountId` is a foreign key to
 * `accounts.id` and nothing but this check stops it naming someone else's account. Closing it in
 * the schema would mean composite `(userId, parentId)` keys on eighteen tables, a bigger change
 * than that ticket; closing it here is one query per referencing field, on the one code path that
 * can create the situation.
 *
 * A reference the caller does not own is a **404**, not a 403 — the same answer as an id that was
 * never assigned, because from the caller's side those are the same thing.
 */

/** A foreign-key field of a table, and the table its value has to be found in. */
export type OwnedReference = {
  /** Drizzle property name, which is also the field name in a request body. */
  readonly key: string;
  readonly parent: SQLiteTable;
};

const cache = new Map<SQLiteTable, readonly OwnedReference[]>();

/**
 * The references a foreign key *cannot* express, so `getTableConfig` cannot see them.
 *
 * Each of these columns is deliberately plain rather than a foreign key, and each schema file says
 * why: an import batch is a historical record that outlives the account it loaded,
 * `mappingProfiles.defaultAccountId` outlives the account it points at, `transactions.transferId`
 * would close a reference cycle with `transfers`, `importBatchId` must survive its batch being
 * undone, and `mergedIntoTransactionId` names a series that may already be gone. All good reasons
 * not to constrain them in SQLite — and none of them a reason to let a request point one at
 * *another user's* row.
 *
 * Without this map the derivation would be silently incomplete: the field would validate, store,
 * and dangle. It is the one hand-written inventory here, so `ownership.spec.ts` pins it.
 */
const SOFT_REFERENCES = new Map<SQLiteTable, readonly OwnedReference[]>([
  [
    importBatches,
    [
      { key: 'accountId', parent: accounts },
      { key: 'mappingProfileId', parent: mappingProfiles },
    ],
  ],
  [mappingProfiles, [{ key: 'defaultAccountId', parent: accounts }]],
  [
    transactions,
    [
      { key: 'transferId', parent: transfers },
      { key: 'importBatchId', parent: importBatches },
    ],
  ],
  [recurringOverrides, [{ key: 'mergedIntoTransactionId', parent: transactions }]],
]);

/**
 * Every reference of a table except its owner column: the declared foreign keys, read off the
 * schema, plus the soft references above.
 *
 * Deriving the foreign keys rather than listing them means a new one is covered the moment it is
 * declared — listing them would be a second inventory to keep in step, where adding a `categoryId`
 * would compile, migrate, and quietly not be checked. `ownership.spec.ts` asserts the combined set
 * is exactly the eleven fields TICKET-SRV-03 and TICKET-SRV-04 enumerate, so a *removed* check is caught too.
 */
export const referencesOf = (table: SQLiteTable): readonly OwnedReference[] => {
  const cached = cache.get(table);
  if (cached !== undefined) return cached;

  const keyByColumnName = new Map(
    Object.entries(getTableColumns(table) as Record<string, SQLiteColumn>).map(([key, column]) => [
      column.name,
      key,
    ]),
  );

  const references = getTableConfig(table).foreignKeys.flatMap((foreignKey): OwnedReference[] => {
    const { columns, foreignTable } = foreignKey.reference();
    // The owner column is checked by the session, not by a lookup.
    if (foreignTable === users) return [];
    // No composite foreign key exists in this schema; one arriving later would silently go
    // unchecked by the single-column lookup below, so it stops the server instead.
    if (columns.length !== 1)
      throw new Error(`Composite foreign key on ${getTableName(table)} is not supported`);

    const key = keyByColumnName.get(columns[0]!.name);
    return key === undefined ? [] : [{ key, parent: foreignTable }];
  });

  const all = [...references, ...(SOFT_REFERENCES.get(table) ?? [])];
  cache.set(table, all);
  return all;
};

/** The `id` and `userId` columns of a table being looked up as somebody's property. */
const ownedColumnsOf = (table: SQLiteTable): { id: SQLiteColumn; userId: SQLiteColumn } => {
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  const id = columns['id'];
  const userId = columns['userId'];
  if (id === undefined || userId === undefined)
    throw new Error(`${getTableName(table)} is not a per-user table with an id`);
  return { id, userId };
};

/** Whether a row with this id exists **and** belongs to this user. */
export const ownsRow = (tx: DbOrTx, table: SQLiteTable, id: number, userId: number): boolean => {
  const columns = ownedColumnsOf(table);
  const row = tx
    .select({ id: columns.id })
    .from(table)
    .where(and(eq(columns.id, id), eq(columns.userId, userId)))
    .get();
  return row !== undefined;
};

/** Whether a row with this id exists at all, whoever owns it. */
export const rowExists = (tx: DbOrTx, table: SQLiteTable, id: number): boolean => {
  const { id: idColumn } = ownedColumnsOf(table);
  return tx.select({ id: idColumn }).from(table).where(eq(idColumn, id)).get() !== undefined;
};

/**
 * Throws a 404 if any foreign-key field in a validated body names a row the signed-in user does
 * not own. Call it inside the same transaction as the write, so the row cannot be handed away
 * between the check and the insert.
 *
 * A soft reference may name a row that no longer exists: outliving its parent is why it is soft,
 * and deleting an account leaves its batches and profiles pointing at it, so every backup taken
 * afterwards carries such ids. It still may never name a row another user owns.
 */
export const assertReferencesOwned = (
  tx: DbOrTx,
  table: SQLiteTable,
  values: EntityValues,
  userId: number,
): void => {
  const soft = SOFT_REFERENCES.get(table) ?? [];
  const allowed = (reference: OwnedReference, id: number): boolean =>
    ownsRow(tx, reference.parent, id, userId) ||
    (soft.includes(reference) && !rowExists(tx, reference.parent, id));

  const refused = referencesOf(table).some((reference) => {
    const id = values[reference.key];
    // Absent (not being written) or explicitly null (being cleared) — neither references anything.
    return typeof id === 'number' && !allowed(reference, id);
  });
  if (refused) throw notFound();
};
