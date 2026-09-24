import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { LoanType } from 'shared/entities.js';
import { categories } from './categories.js';
import { inList, ownerId } from './columns.js';

const LOAN_TYPES: readonly [LoanType, ...LoanType[]] = [
  'mortgage',
  'auto',
  'personal',
  'student',
  'other',
];

/**
 * One tracked loan (FR-LOAN-1), ported from Dexie's `loans` store (TICKET-SRV-02).
 *
 * `loanType` is a display label only — a mortgage, a car loan and a personal loan amortize
 * identically, and nothing in `core/loans/` may branch on it.
 *
 * **`categoryId` → NO ACTION, and this is the orphan path TICKET-SRV-02 expected to find.**
 * `CategoriesStore.removeCategory` clears the category off every transaction and then deletes it;
 * it does not look at loans at all, so deleting a tracked loan's category today leaves the loan
 * pointing at nothing and its progress silently reading zero payments. The column is `NOT NULL`,
 * so SET NULL is not available.
 *
 * Leaving `onDelete` off gives NO ACTION, which **refuses** to delete a category a loan still
 * tracks. Deferring the constraint to end-of-statement is what makes that safe: deleting a *user*
 * cascades into `categories` and `loans` in an unspecified order, and by the time the constraint
 * is evaluated both children are already gone, so TICKET-AUTH-03's user deletion still works.
 * RESTRICT would refuse the same delete but is checked immediately, which makes it hostage to
 * that ordering; CASCADE would be worse than the orphan it replaced, silently destroying the
 * loan's name, principal, rate and term along with the category.
 *
 * Verified against real SQLite in all three shapes. The friendly error — "this category is
 * tracked by an active loan" rather than a raw constraint failure — belongs in TICKET-SRV-04's
 * endpoint, next to the "one active loan per category" rule TICKET-LOAN-03 enforces at form level.
 */
export const loans = sqliteTable(
  'loans',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    name: text('name').notNull(),
    loanType: text('loanType', { enum: LOAN_TYPES }).notNull(),
    /** Original loan amount. */
    principal: real('principal').notNull(),
    /** Annual rate, percent (e.g. 3.5 for 3.5%). */
    interestRate: real('interestRate').notNull(),
    termMonths: integer('termMonths').notNull(),
    /** ISO `yyyy-mm-dd`. */
    startDate: text('startDate').notNull(),
    /** The expense category whose transactions count as payments. */
    categoryId: integer('categoryId')
      .notNull()
      .references(() => categories.id),
    archived: integer('archived', { mode: 'boolean' }).notNull(),
    sortOrder: integer('sortOrder').notNull(),
  },
  (table) => [
    index('loans_userId_idx').on(table.userId),
    index('loans_userId_categoryId_idx').on(table.userId, table.categoryId),
    index('loans_userId_loanType_idx').on(table.userId, table.loanType),
    index('loans_userId_archived_idx').on(table.userId, table.archived),
    inList('loans_loanType_check', table.loanType, LOAN_TYPES),
  ],
);

export type LoanRow = typeof loans.$inferSelect;
export type NewLoanRow = typeof loans.$inferInsert;
