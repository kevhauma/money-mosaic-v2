import { and, eq } from 'drizzle-orm';

import type { DbOrTx } from '../db.js';
import { httpError, notFound } from '../http/errors.js';
import { ownsRow } from '../http/ownership.js';
import { deleteOwnedRow } from '../routes/entity-router.js';
import { categories } from '../schema/categories.js';
import { loans } from '../schema/loans.js';
import { rules } from '../schema/rules.js';
import { transactions } from '../schema/transactions.js';

/**
 * Deleting a category (TICKET-CAT-12) — one operation behind `DELETE /api/categories/:id` and the
 * MCP `delete_category` tool. Opens no transaction: the caller's transaction is what keeps a loan
 * or rule created between the check and the delete from being orphaned.
 */

/** What keeps a category from being deleted: the loans tracking it and the rules assigning it. */
export type CategoryDeleteBlockers = {
  readonly loans: readonly { id: number; name: string }[];
  readonly rules: readonly { id: number; name: string }[];
};

/**
 * Every loan counts, archived or not — `loans.categoryId` is a NO ACTION key (see
 * `schema/loans.ts`), so an archived loan holds the constraint just as firmly. Every rule counts,
 * enabled or not: a disabled rule re-enabled later would aim at nothing. Rules are filtered here
 * rather than in SQL because `action` is JSON with no foreign key (`schema/rules.ts`).
 */
export const categoryDeleteBlockers = (
  tx: DbOrTx,
  userId: number,
  categoryId: number,
): CategoryDeleteBlockers => ({
  loans: tx
    .select({ id: loans.id, name: loans.name })
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.categoryId, categoryId)))
    .all(),
  rules: tx
    .select({ id: rules.id, name: rules.name, action: rules.action })
    .from(rules)
    .where(eq(rules.userId, userId))
    .all()
    .filter((rule) => rule.action.setCategoryId === categoryId)
    .map(({ id, name }) => ({ id, name })),
});

/** `"Car"` / `"Car" and "House"` / `"Car", "House" and "Boat"`. */
const nameList = (names: readonly string[]): string => {
  const quoted = names.map((name) => `"${name}"`);
  if (quoted.length <= 1) return quoted.join('');
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
};

/** `the loan "Car" tracks it` / `the rules "A" and "B" assign it`. */
const clause = (rows: readonly { name: string }[], noun: string, verb: string): string =>
  rows.length === 1
    ? `the ${noun} ${nameList(rows.map((row) => row.name))} ${verb}s it`
    : `the ${noun}s ${nameList(rows.map((row) => row.name))} ${verb} it`;

/** The 409 message naming every blocker, or `undefined` when nothing blocks the delete. */
export const blockedMessage = ({ loans, rules }: CategoryDeleteBlockers): string | undefined => {
  const clauses = [
    ...(loans.length > 0 ? [clause(loans, 'loan', 'track')] : []),
    ...(rules.length > 0 ? [clause(rules, 'rule', 'assign')] : []),
  ];
  if (clauses.length === 0) return undefined;
  const plural = loans.length + rules.length > 1;
  return (
    `This category cannot be deleted while ${clauses.join(' and ')}. ` +
    `Point ${plural ? 'them' : 'it'} at another category, or delete ${plural ? 'them' : 'it'} first.`
  );
};

/**
 * Refuses with 409 while a loan or rule targets the category; otherwise clears it off its
 * transactions and deletes it. A category the user does not own is a 404 before anything else, so
 * the refusal never confirms someone else's id.
 *
 * The clear is explicit rather than left to the column's ON DELETE SET NULL, which clears
 * `categoryId` but not `categoryManual` — and a row left manual with no category is one the rules
 * engine may never categorise again.
 */
export const deleteCategory = (tx: DbOrTx, userId: number, categoryId: number): void => {
  if (!ownsRow(tx, categories, categoryId, userId)) throw notFound();

  const message = blockedMessage(categoryDeleteBlockers(tx, userId, categoryId));
  if (message !== undefined) throw httpError(409, message);

  tx.update(transactions)
    .set({ categoryId: null, categoryManual: false })
    .where(and(eq(transactions.userId, userId), eq(transactions.categoryId, categoryId)))
    .run();

  if (!deleteOwnedRow(tx, categories, categoryId, userId)) throw notFound();
};
