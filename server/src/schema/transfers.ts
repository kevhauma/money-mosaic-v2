import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Transfer } from 'shared/entities.js';
import { inList, ownerId } from './columns.js';
import { transactions } from './transactions.js';

const METHODS: readonly [Transfer['method'], ...Transfer['method'][]] = [
  'auto-iban',
  'auto-amountdate',
  'manual',
];
const CONFIDENCES: readonly [Transfer['confidence'], ...Transfer['confidence'][]] = [
  'high',
  'medium',
  'manual',
];

/**
 * A link between the two legs of a transfer between the user's own accounts (FR-TRF-1), ported
 * from Dexie's `transfers` store (TICKET-SRV-02).
 *
 * Both legs **cascade**: `TransferCleanupService` already deletes the link when either side is
 * removed (undoing an import, clearing an account), so the constraint states what the code does.
 * The surviving leg's own `transactions.transferId` still has to be cleared by that service —
 * SQLite cannot do it here, which is the one half of the pair a cascade cannot express.
 */
export const transfers = sqliteTable(
  'transfers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    fromTransactionId: integer('fromTransactionId')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    toTransactionId: integer('toTransactionId')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    method: text('method', { enum: METHODS }).notNull(),
    confidence: text('confidence', { enum: CONFIDENCES }).notNull(),
    linkedAt: text('linkedAt').notNull(),
  },
  (table) => [
    index('transfers_userId_idx').on(table.userId),
    index('transfers_userId_fromTransactionId_idx').on(table.userId, table.fromTransactionId),
    index('transfers_userId_toTransactionId_idx').on(table.userId, table.toTransactionId),
    inList('transfers_method_check', table.method, METHODS),
    inList('transfers_confidence_check', table.confidence, CONFIDENCES),
  ],
);

export type TransferRow = typeof transfers.$inferSelect;
export type NewTransferRow = typeof transfers.$inferInsert;
