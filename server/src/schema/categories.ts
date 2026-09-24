import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Category } from 'shared/entities.js';
import { inList, ownerId } from './columns.js';

const KINDS: readonly [Category['kind'], ...Category['kind'][]] = ['expense', 'income', 'neutral'];

/**
 * A spending/income category (FR-CAT-1), ported from Dexie's `categories` store (TICKET-SRV-02).
 *
 * `group` is quoted by Drizzle in the generated SQL, so the SQLite keyword is not a problem.
 * `activeFrom`/`activeUntil` (FR-CAT-9) are non-indexed here for the same reason they needed no
 * Dexie version bump: nothing queries on them.
 */
export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    name: text('name').notNull(),
    kind: text('kind', { enum: KINDS }).notNull(),
    group: text('group'),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    archived: integer('archived', { mode: 'boolean' }).notNull(),
    isSystem: integer('isSystem', { mode: 'boolean' }).notNull(),
    sortOrder: integer('sortOrder'),
    activeFrom: text('activeFrom'),
    activeUntil: text('activeUntil'),
  },
  (table) => [
    index('categories_userId_idx').on(table.userId),
    index('categories_userId_name_idx').on(table.userId, table.name),
    index('categories_userId_kind_idx').on(table.userId, table.kind),
    index('categories_userId_archived_idx').on(table.userId, table.archived),
    inList('categories_kind_check', table.kind, KINDS),
  ],
);

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
