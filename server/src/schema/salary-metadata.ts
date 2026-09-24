import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { ownerId } from './columns.js';

/**
 * One month's manually-entered salary facts (FR-INC-10), ported from Dexie's `salaryMetadata`
 * store (TICKET-SRV-02) — the one thing on the Income page that is not derived from imported
 * transactions, because a bank CSV only records what *landed*.
 *
 * Household-level on purpose: no `accountId`, no `categoryId`. It is a fact about the month, not
 * about whichever account the net salary happened to arrive in.
 *
 * Dexie declared `&yearMonth`, a **unique** index; here that becomes unique on `(userId,
 * yearMonth)`, because two users obviously may each have a row for 2026-04. Both amounts stay
 * nullable — clearing a field must be able to remove it rather than persist a zero — and a row
 * where both are absent is deleted rather than kept empty.
 */
export const salaryMetadata = sqliteTable(
  'salaryMetadata',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    /** Calendar month, `YYYY-MM`. One row per user per month, enforced below. */
    yearMonth: text('yearMonth').notNull(),
    /** Gross monthly pay before tax and social contributions. */
    grossWage: real('grossWage'),
    /** The part of this month's actual deposit that was a 13th month / vacation / holiday bonus. */
    bonus: real('bonus'),
    note: text('note'),
  },
  (table) => [
    index('salaryMetadata_userId_idx').on(table.userId),
    // The repository upserts by month, so this constraint is never reached on the happy path — it
    // is here because a second row for the same month is never meaningful, which is a fact about
    // the data rather than about one caller.
    uniqueIndex('salaryMetadata_userId_yearMonth_idx').on(table.userId, table.yearMonth),
  ],
);

export type SalaryMetadataRow = typeof salaryMetadata.$inferSelect;
export type NewSalaryMetadataRow = typeof salaryMetadata.$inferInsert;
