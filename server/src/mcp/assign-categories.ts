import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { categories, type CategoryRow } from '../schema/categories.js';
import { transactions, type TransactionRow } from '../schema/transactions.js';
import { toolResult } from './tool-result.js';

const MAX_ASSIGNMENTS = 500;

const assignmentSchema = z.object({
  transactionId: z.number().int(),
  categoryId: z.number().int().nullable().describe('null clears the category.'),
  manual: z
    .boolean()
    .optional()
    .describe(
      'Default true. Pass false only to restore a rule-assigned category from a previous result (previousCategoryManual: false).',
    ),
});

export const assignCategoriesInput = {
  assignments: z
    .array(assignmentSchema)
    .min(1)
    .max(MAX_ASSIGNMENTS)
    .refine(
      (items) => new Set(items.map((item) => item.transactionId)).size === items.length,
      'Each transactionId may appear only once',
    ),
  confirm: z.boolean().optional().describe('true applies the changes; otherwise only a preview.'),
};

type Assignment = z.infer<typeof assignmentSchema>;

type Skipped = { transactionId: number; reason: string };

type Change = {
  readonly row: TransactionRow;
  readonly categoryId: number | null;
  readonly categoryManual: boolean;
};

/** Whether a category may be put on a row booked that day — archived never, else its window (FR-CAT-9). */
const inapplicableReason = (category: CategoryRow, bookingDate: string): string | undefined => {
  if (category.archived) return `category "${category.name}" is archived`;
  const opens = category.activeFrom === null || category.activeFrom <= bookingDate;
  const open = opens && (category.activeUntil === null || category.activeUntil >= bookingDate);
  return open ? undefined : `category "${category.name}" does not apply on ${bookingDate}`;
};

/**
 * Sorts the batch into changes and skips. Throws, naming nothing, when any id is not the user's:
 * a wrong id means the agent has the wrong data, not a borderline row.
 */
const plan = (tx: DbOrTx, userId: number, assignments: readonly Assignment[]) => {
  const rows = new Map(
    tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(
            transactions.id,
            assignments.map((item) => item.transactionId),
          ),
        ),
      )
      .all()
      .map((row) => [row.id, row]),
  );
  const owned = new Map(
    tx
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .all()
      .map((category) => [category.id, category]),
  );

  const unknown = assignments.some(
    (item) =>
      !rows.has(item.transactionId) || (item.categoryId !== null && !owned.has(item.categoryId)),
  );
  if (unknown) throw new Error('Unknown transaction or category id; nothing was changed');

  const changes: Change[] = [];
  const skipped: Skipped[] = [];
  for (const item of assignments) {
    const row = rows.get(item.transactionId)!;
    const category = item.categoryId === null ? undefined : owned.get(item.categoryId)!;
    const categoryManual = category !== undefined && item.manual !== false;
    const reason =
      row.transferId !== null
        ? 'linked transfer'
        : category === undefined
          ? undefined
          : inapplicableReason(category, row.bookingDate);
    const unchanged =
      row.categoryId === item.categoryId && (row.categoryManual ?? false) === categoryManual;

    if (reason !== undefined || unchanged)
      skipped.push({ transactionId: row.id, reason: reason ?? 'unchanged' });
    else changes.push({ row, categoryId: item.categoryId, categoryManual });
  }
  return { changes, skipped, owned };
};

/**
 * `assign_categories` (TICKET-MCP-02): a mixed batch of category assignments, previewed unless
 * `confirm` is set, applied in one transaction. An assignment is **manual** — set by a person or
 * agent — so rules leave it alone; clearing sets `categoryManual: false` so rules may categorise
 * the row again. Confirm re-plans from scratch: there is no preview token to go stale.
 */
export const assignCategories = (
  db: DrizzleDb,
  userId: number,
  assignments: readonly Assignment[],
  confirm: boolean,
) =>
  db.transaction((tx) => {
    const { changes, skipped, owned } = plan(tx, userId, assignments);
    const nameOf = (id: number | null) => (id === null ? null : (owned.get(id)?.name ?? null));

    if (!confirm)
      return {
        wouldChange: changes.map(({ row, categoryId }) => ({
          transactionId: row.id,
          bookingDate: row.bookingDate,
          amount: row.amount,
          counterpartyName: row.counterpartyName,
          rawDescription: row.rawDescription,
          currentCategory:
            row.categoryId === null
              ? null
              : { name: nameOf(row.categoryId), manual: row.categoryManual ?? false },
          newCategory: nameOf(categoryId),
        })),
        skipped,
      };

    for (const { row, categoryId, categoryManual } of changes) {
      tx.update(transactions)
        .set({ categoryId, categoryManual })
        .where(and(eq(transactions.userId, userId), eq(transactions.id, row.id)))
        .run();
    }
    return {
      changed: changes.map(({ row, categoryId, categoryManual }) => ({
        transactionId: row.id,
        categoryId,
        categoryManual,
        previousCategoryId: row.categoryId,
        previousCategoryManual: row.categoryManual ?? false,
      })),
      skipped,
    };
  });

export const registerAssignCategories = (
  server: McpServer,
  db: DrizzleDb,
  userId: number,
): void => {
  server.registerTool(
    'assign_categories',
    {
      description: [
        `Assign or clear the category of up to ${MAX_ASSIGNMENTS} transactions in one call.`,
        'An assigned category is manual: rules will never overwrite it. categoryId null clears the category so rules can categorise the row again.',
        'Without confirm: true nothing is written and you get {wouldChange, skipped} to show the user. Call again with confirm: true to apply; the result lists each changed row with its previousCategoryId and previousCategoryManual, so the change can be put back with another call.',
        'Rows that are part of a linked transfer, categories that are archived or not active on the booking date, and assignments that change nothing are skipped with a reason; the rest still apply.',
        'Any transaction or category id that is not the user’s refuses the whole call.',
      ].join(' '),
      inputSchema: assignCategoriesInput,
      annotations: { destructiveHint: true, readOnlyHint: false },
    },
    ({ assignments, confirm }) =>
      toolResult(assignCategories(db, userId, assignments, confirm === true)),
  );
};
