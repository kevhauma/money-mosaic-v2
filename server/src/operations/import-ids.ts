import { max, ne } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { DbOrTx } from '../db.js';
import { referencesOf } from '../http/ownership.js';
import type { EntityValues } from '../http/validate.js';
import { accounts } from '../schema/accounts.js';
import { appSettings } from '../schema/app-settings.js';
import { categories } from '../schema/categories.js';
import { categoryComparisonSettings } from '../schema/category-comparison-settings.js';
import { forecastSettings } from '../schema/forecast-settings.js';
import { rules } from '../schema/rules.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import { idOf, ownerOf, type PerUserTable } from './user-rows.js';

/**
 * Fresh ids for the rows of a backup whose id another account already holds (TICKET-SRV-14).
 *
 * Ids are unique per table across every user on the server, so a backup restored into an account
 * other than its own collides by construction. Writing such a row under its own id would take the
 * other person's row over (what TICKET-SRV-12 did); instead it gets a new id, and every reference
 * to it in the document is rewritten to match, all inside the import's one transaction.
 *
 * A row whose id is free, or already the importer's, keeps it: a same-account restore is unchanged.
 */

/** Per table: a document id another account holds → the id the row is written under instead. */
export type IdPlan = ReadonlyMap<SQLiteTable, ReadonlyMap<number, number>>;

const freshIdsFor = (
  tx: DbOrTx,
  table: PerUserTable,
  documentIds: readonly number[],
  userId: number,
): ReadonlyMap<number, number> => {
  const id = idOf(table)!;
  const others = new Set(
    (
      tx
        .select({ id })
        .from(table)
        .where(ne(ownerOf(table), userId))
        .all() as { id: number }[]
    ).map((row) => row.id),
  );
  const colliding = [...new Set(documentIds)].filter((candidate) => others.has(candidate));
  if (colliding.length === 0) return new Map();

  // Above both the table and the document, so a fresh id never lands on a row written later on.
  const stored = (
    tx
      .select({ value: max(id) })
      .from(table)
      .get() as { value: number | null }
  ).value;
  const highest = documentIds.reduce((top, candidate) => Math.max(top, candidate), stored ?? 0);
  return new Map(colliding.map((old, index) => [old, highest + 1 + index]));
};

/** Decides every renumbering up front: a reference may point at a row later in the document. */
export const planImportIds = (
  tx: DbOrTx,
  documentIds: ReadonlyMap<PerUserTable, readonly number[]>,
  userId: number,
): IdPlan =>
  new Map(
    [...documentIds].map(([table, ids]) => [table, freshIdsFor(tx, table, ids, userId)] as const),
  );

type Remap = (parent: SQLiteTable, value: unknown) => unknown;
type Rewrite = (values: EntityValues, remap: Remap) => EntityValues;

const one =
  (key: string, parent: SQLiteTable): Rewrite =>
  (values, remap) =>
    key in values ? { [key]: remap(parent, values[key]) } : {};

const list =
  (key: string, parent: SQLiteTable): Rewrite =>
  (values, remap) =>
    Array.isArray(values[key])
      ? { [key]: (values[key] as unknown[]).map((value) => remap(parent, value)) }
      : {};

type Json = Record<string, unknown>;
const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null;

/**
 * Ids no foreign key declares, so `referencesOf` cannot find them: settings columns, and ids inside
 * JSON. A new id-carrying field of this kind belongs here, or a cross-account restore leaves it
 * pointing at the other account's row.
 */
const EMBEDDED = new Map<SQLiteTable, readonly Rewrite[]>([
  [
    appSettings,
    [
      one('mainIncomeCategoryId', categories),
      list('excludedIncomeCategoryIds', categories),
      list('smoothedBonusCategoryIds', categories),
      list('heatmapExcludedCategoryIds', categories),
    ],
  ],
  [categoryComparisonSettings, [list('excludedCategoryIds', categories)]],
  [forecastSettings, [list('scopeAccountIds', accounts)]],
  [
    rules,
    [
      ({ action }, remap) =>
        isJson(action)
          ? { action: { ...action, setCategoryId: remap(categories, action['setCategoryId']) } }
          : {},
      ({ conditions }, remap) =>
        Array.isArray(conditions)
          ? {
              conditions: conditions.map((condition: unknown) =>
                isJson(condition) && condition['field'] === 'accountId'
                  ? { ...condition, value: remap(accounts, condition['value']) }
                  : condition,
              ),
            }
          : {},
    ],
  ],
  [
    transactions,
    [
      ({ attributionOverride }, remap) =>
        isJson(attributionOverride)
          ? {
              attributionOverride: {
                ...attributionOverride,
                reimbursementTransferId: remap(
                  transfers,
                  attributionOverride['reimbursementTransferId'],
                ),
              },
            }
          : {},
    ],
  ],
]);

/** One document row with every reference the plan renumbered pointing at the new id. */
export const remapReferences = (
  plan: IdPlan,
  table: PerUserTable,
  values: EntityValues,
): EntityValues => {
  const remap: Remap = (parent, value) =>
    typeof value === 'number' ? (plan.get(parent)?.get(value) ?? value) : value;
  const rewrites = [
    ...referencesOf(table).map(({ key, parent }) => one(key, parent)),
    ...(EMBEDDED.get(table) ?? []),
  ];
  return rewrites.reduce((next, rewrite) => ({ ...next, ...rewrite(values, remap) }), values);
};
