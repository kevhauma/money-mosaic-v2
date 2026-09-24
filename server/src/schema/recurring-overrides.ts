import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { RecurringOverride } from 'shared/entities.js';
import { inList, ownerId } from './columns.js';
import { transactions } from './transactions.js';

const KINDS: readonly [RecurringOverride['kind'], ...RecurringOverride['kind'][]] = [
  'dismissed',
  'merged',
];

/**
 * A user's correction to a *detected* recurring payment (TICKET-REC-11), ported from Dexie's
 * `recurringOverrides` store (TICKET-SRV-02) — the equivalent, for recurring detection, of
 * `categoryManual` on a transaction.
 *
 * **Identified by an occurrence, not by the series key**, which is why `anchorTransactionId` is a
 * transaction id: a series key embeds the median amount and moves when a price changes, while a
 * row id does not.
 *
 * `anchorTransactionId` → **cascade**. The override applies to whichever series still contains
 * that transaction, so once the transaction is gone the row can never match anything again.
 *
 * `mergedIntoTransactionId` is deliberately **not** a foreign key. It names the *other* series,
 * and losing that series should leave this override alone rather than delete it — re-detection
 * simply finds no series containing the id and applies nothing, which is the same no-op the
 * detector already performs for an override whose series has not been detected this run.
 */
export const recurringOverrides = sqliteTable(
  'recurringOverrides',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    /** `dismissed`: not really a recurring payment. `merged`: the same real payment as another series. */
    kind: text('kind', { enum: KINDS }).notNull(),
    anchorTransactionId: integer('anchorTransactionId')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    /** For `merged` only: a transaction id belonging to the series this one is folded into. */
    mergedIntoTransactionId: integer('mergedIntoTransactionId'),
    createdAt: text('createdAt').notNull(),
  },
  (table) => [
    index('recurringOverrides_userId_idx').on(table.userId),
    index('recurringOverrides_userId_anchorTransactionId_idx').on(
      table.userId,
      table.anchorTransactionId,
    ),
    index('recurringOverrides_userId_kind_idx').on(table.userId, table.kind),
    inList('recurringOverrides_kind_check', table.kind, KINDS),
  ],
);

export type RecurringOverrideRow = typeof recurringOverrides.$inferSelect;
export type NewRecurringOverrideRow = typeof recurringOverrides.$inferInsert;
