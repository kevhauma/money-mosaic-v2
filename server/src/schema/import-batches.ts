import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { ownerId } from './columns.js';

/**
 * One CSV import, kept so it can be undone and shown in history (FR-IMP-6), ported from Dexie's
 * `importBatches` store (TICKET-SRV-02).
 *
 * `accountId` and `mappingProfileId` are plain columns, not foreign keys: a batch is a record of
 * something that happened, and it should survive — as history — the deletion of the account it
 * was imported into. The transactions it produced are what cascade, through their own account FK.
 *
 * `rowsDuplicateImported` is nullable and reads as zero: it is absent on every batch imported
 * before TICKET-IMP-14 made re-importing a known row a choice.
 */
export const importBatches = sqliteTable(
  'importBatches',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    accountId: integer('accountId').notNull(),
    fileName: text('fileName').notNull(),
    mappingProfileId: integer('mappingProfileId'),
    importedAt: text('importedAt').notNull(),
    rowsRead: integer('rowsRead').notNull(),
    rowsAdded: integer('rowsAdded').notNull(),
    /** Rows recognised as already present and skipped. */
    rowsDuplicate: integer('rowsDuplicate').notNull(),
    /** Rows recognised as already present and added anyway, because the user chose to. */
    rowsDuplicateImported: integer('rowsDuplicateImported'),
    dateFrom: text('dateFrom').notNull(),
    dateTo: text('dateTo').notNull(),
  },
  (table) => [
    index('importBatches_userId_idx').on(table.userId),
    index('importBatches_userId_accountId_idx').on(table.userId, table.accountId),
    index('importBatches_userId_importedAt_idx').on(table.userId, table.importedAt),
  ],
);

export type ImportBatchRow = typeof importBatches.$inferSelect;
export type NewImportBatchRow = typeof importBatches.$inferInsert;
