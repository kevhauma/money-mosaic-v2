import { and, desc, eq, gte, inArray, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';

import type { DbOrTx } from '../db.js';
import { accounts } from '../schema/accounts.js';
import { categories } from '../schema/categories.js';
import { transactions } from '../schema/transactions.js';
import { ISO_DATE } from './tool-result.js';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

export const searchTransactionsInput = {
  from: z.string().regex(ISO_DATE).describe('First booking date, inclusive (YYYY-MM-DD).'),
  to: z.string().regex(ISO_DATE).describe('Last booking date, inclusive (YYYY-MM-DD).'),
  accountIds: z.array(z.number().int()).optional().describe('Only these accounts.'),
  categoryId: z.number().int().optional().describe('Only this category.'),
  uncategorised: z
    .boolean()
    .optional()
    .describe('true: only rows with no category that are not part of a linked transfer.'),
  text: z
    .string()
    .min(1)
    .optional()
    .describe('Case-insensitive match on description, counterparty name and notes.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .optional()
    .describe(`Rows per page, default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}.`),
  cursor: z.string().optional().describe('nextCursor from the previous page, unchanged.'),
};

type SearchInput = z.infer<z.ZodObject<typeof searchTransactionsInput>>;

type Cursor = readonly [bookingDate: string, id: number];

const encodeCursor = (cursor: Cursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

const decodeCursor = (raw: string): Cursor => {
  try {
    const value: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (Array.isArray(value) && typeof value[0] === 'string' && Number.isInteger(value[1]))
      return [value[0], value[1] as number];
  } catch {
    // Not JSON: same answer as JSON of the wrong shape, below.
  }
  throw new Error('Invalid cursor: pass nextCursor from the previous page unchanged');
};

/**
 * Case-insensitive "contains" on a nullable text column.
 * shortcut: SQLite `lower()` folds ASCII only, so a non-ASCII capital won't match its lowercase;
 * switch to a folded column if that ever matters.
 */
const contains = (column: SQLiteColumn, needle: string): SQL =>
  sql`instr(lower(coalesce(${column}, '')), lower(${needle})) > 0`;

/** Rows strictly after the cursor in `(bookingDate desc, id desc)` order. */
const afterCursor = (raw: string): SQL | undefined => {
  const [date, id] = decodeCursor(raw);
  return or(
    lt(transactions.bookingDate, date),
    and(eq(transactions.bookingDate, date), lt(transactions.id, id)),
  );
};

const filtersOf = (userId: number, input: SearchInput): (SQL | undefined)[] => [
  eq(transactions.userId, userId),
  gte(transactions.bookingDate, input.from),
  lte(transactions.bookingDate, input.to),
  input.accountIds && inArray(transactions.accountId, input.accountIds),
  input.categoryId === undefined ? undefined : eq(transactions.categoryId, input.categoryId),
  input.uncategorised
    ? and(isNull(transactions.categoryId), isNull(transactions.transferId))
    : undefined,
  input.text === undefined
    ? undefined
    : or(
        contains(transactions.rawDescription, input.text),
        contains(transactions.counterpartyName, input.text),
        contains(transactions.notes, input.text),
      ),
  input.cursor === undefined ? undefined : afterCursor(input.cursor),
];

/**
 * `search_transactions` (TICKET-MCP-01): compact rows, newest first, keyset-paged on
 * `(bookingDate, id)` so rows sharing a date are neither repeated nor skipped across pages.
 * `rawRow`, `rawLine` and `fingerprint` are left out: bulky, and nothing an agent reasons with.
 */
export const searchTransactions = (db: DbOrTx, userId: number, input: SearchInput) => {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const rows = db
    .select({
      id: transactions.id,
      bookingDate: transactions.bookingDate,
      amount: transactions.amount,
      currency: transactions.currency,
      accountId: accounts.id,
      accountName: accounts.name,
      counterpartyName: transactions.counterpartyName,
      counterpartyIban: transactions.counterpartyIban,
      rawDescription: transactions.rawDescription,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryManual: transactions.categoryManual,
      transferId: transactions.transferId,
      notes: transactions.notes,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...filtersOf(userId, input)))
    .orderBy(desc(transactions.bookingDate), desc(transactions.id))
    .limit(limit + 1)
    .all();

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    transactions: page.map(({ accountId, accountName, categoryId, categoryName, ...row }) => ({
      ...row,
      categoryManual: row.categoryManual ?? false,
      account: { id: accountId, name: accountName },
      category: categoryId === null ? null : { id: categoryId, name: categoryName },
    })),
    nextCursor:
      rows.length > limit && last !== undefined ? encodeCursor([last.bookingDate, last.id]) : null,
  };
};
