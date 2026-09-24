import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Account, JointOwner } from 'shared/entities.js';
import { inList, json, ownerId } from './columns.js';

/** One list, read by both the (types-only) `enum` and the CHECK, the `users.role` convention. */
const TYPES: readonly [Account['type'], ...Account['type'][]] = [
  'checking',
  'savings',
  'joint',
  'invest',
];
const CURRENCIES: readonly [Account['currency'], ...Account['currency'][]] = ['EUR'];

/**
 * One bank account (FR-ACC-1), ported from Dexie's `accounts` store (TICKET-SRV-02).
 *
 * Ids are unique per table across all users, so one user's account ids are simply
 * non-contiguous; nothing in the app assumes otherwise, and TICKET-SRV-07 is what reconciles a
 * browser database's own ids against server-assigned ones.
 */
export const accounts = sqliteTable(
  'accounts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    name: text('name').notNull(),
    type: text('type', { enum: TYPES }).notNull(),
    iban: text('iban'),
    currency: text('currency', { enum: CURRENCIES }).notNull().default('EUR'),
    openingBalance: real('openingBalance').notNull(),
    openingBalanceDate: text('openingBalanceDate').notNull(),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    archived: integer('archived', { mode: 'boolean' }).notNull(),
    /** A fraction in `[0, 1]`; only meaningful for `type === 'joint'`. NULL means "all mine". */
    ownershipShare: real('ownershipShare'),
    coOwners: json<JointOwner[]>('coOwners'),
    sortOrder: integer('sortOrder'),
  },
  // Dexie declared `name`, `type` and `archived`; each becomes a composite `(userId, field)` index,
  // since every query in the new API filters by owner first and a single-column index on `name`
  // would have the wrong leading column for it.
  (table) => [
    index('accounts_userId_idx').on(table.userId),
    index('accounts_userId_name_idx').on(table.userId, table.name),
    index('accounts_userId_type_idx').on(table.userId, table.type),
    index('accounts_userId_archived_idx').on(table.userId, table.archived),
    inList('accounts_type_check', table.type, TYPES),
  ],
);

export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;
