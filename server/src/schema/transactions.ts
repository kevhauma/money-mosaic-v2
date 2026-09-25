import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Transaction } from 'shared/entities.js';
import { accounts } from './accounts.js';
import { categories } from './categories.js';
import { inList, json, ownerId } from './columns.js';

const CURRENCIES: readonly [Transaction['currency'], ...Transaction['currency'][]] = ['EUR'];

type AttributionOverride = NonNullable<Transaction['attributionOverride']>;

/**
 * One imported bank line (FR-TXN-1), ported from Dexie's `transactions` store (TICKET-SRV-02) —
 * the table everything else hangs off, and the only one big enough for an index to matter.
 *
 * **Foreign keys, and what each delete does.** Dexie enforced nothing and the app's deletion
 * services clean up by hand; these constraints say the same thing in the schema, which is what
 * turns a missed cleanup into an error instead of an orphan row:
 * - `accountId` → **cascade**. `AccountDeletionService.deleteAccount` already removes an account's
 *   transactions in one transaction; this is that promise, enforced.
 * - `categoryId` → **set null**, as a backstop only. `CategoriesStore.removeCategory` clears the
 *   category off every referencing transaction before deleting it, and it clears `categoryManual`
 *   with it — which SET NULL does *not* do. A row left with `categoryManual: true` and no category
 *   is one the rules engine will never touch again, so `DELETE /api/categories/:id` does the write
 *   explicitly (TICKET-SRV-04) and this constraint is what catches any path that forgets to.
 * - `transferId` is deliberately **not** a foreign key: `transfers` references this table from the
 *   other side, and a cycle of two mutual FKs cannot be satisfied by two ordinary inserts. The
 *   link is created by `transfers`, and `TransferCleanupService` clears the surviving side.
 * - `importBatchId` is likewise a plain column — undoing an import deletes its transactions
 *   explicitly (TICKET-SRV-04), and a cascade would silently widen "forget this batch" into
 *   "delete the rows it produced" for any future caller.
 */
export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    accountId: integer('accountId')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    bookingDate: text('bookingDate').notNull(),
    valueDate: text('valueDate'),
    amount: real('amount').notNull(),
    currency: text('currency', { enum: CURRENCIES }).notNull().default('EUR'),
    rawDescription: text('rawDescription').notNull(),
    counterpartyName: text('counterpartyName'),
    counterpartyIban: text('counterpartyIban'),
    categoryId: integer('categoryId').references(() => categories.id, { onDelete: 'set null' }),
    /** Rules must never overwrite a category the user set by hand (FR-TXN-2, FR-CAT-3). */
    categoryManual: integer('categoryManual', { mode: 'boolean' }),
    transferId: integer('transferId'),
    importBatchId: integer('importBatchId'),
    fingerprint: text('fingerprint').notNull(),
    notes: text('notes'),
    createdAt: text('createdAt').notNull(),
    rawLine: text('rawLine'),
    rawRow: json<Record<string, string>>('rawRow'),
    attributionOverride: json<AttributionOverride>('attributionOverride'),
    /**
     * `attributionOverride.reimbursementTransferId`, extracted alongside the JSON it also lives in.
     * Dexie indexed that dotted keypath from schema v11 (TICKET-PERF-03) and a JSON column cannot
     * be indexed usefully, so the lookup keeps its index seek instead of becoming a JSON scan.
     * Write it from the same value every time the JSON column is written (TICKET-SRV-03/04).
     */
    reimbursementTransferId: integer('reimbursementTransferId'),
    /** Excluded from income/expense/savings-rate/category-breakdown, but still counts toward balance. */
    nullified: integer('nullified', { mode: 'boolean' }),
  },
  (table) => [
    index('transactions_userId_idx').on(table.userId),
    index('transactions_userId_accountId_idx').on(table.userId, table.accountId),
    index('transactions_userId_bookingDate_idx').on(table.userId, table.bookingDate),
    index('transactions_userId_categoryId_idx').on(table.userId, table.categoryId),
    index('transactions_userId_transferId_idx').on(table.userId, table.transferId),
    index('transactions_userId_fingerprint_idx').on(table.userId, table.fingerprint),
    index('transactions_userId_importBatchId_idx').on(table.userId, table.importBatchId),
    index('transactions_userId_reimbursementTransferId_idx').on(
      table.userId,
      table.reimbursementTransferId,
    ),
    inList('transactions_currency_check', table.currency, CURRENCIES),
  ],
);

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
