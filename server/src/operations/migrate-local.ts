import { and, eq, getTableColumns, getTableName } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { DEFAULT_CATEGORIES, DEFAULT_MAPPING_PROFILE_TEMPLATES } from 'shared/seed-data.js';

import type { DbOrTx } from '../db.js';
import type { OwnedReference } from '../http/ownership.js';
import { referencesOf } from '../http/ownership.js';
import { asRecord, parseEntityBody, toId, type EntityValues } from '../http/validate.js';
import { DERIVED_COLUMNS } from '../routes/transactions.js';
import { accounts } from '../schema/accounts.js';
import { appSettings } from '../schema/app-settings.js';
import { categories } from '../schema/categories.js';
import { categoryComparisonSettings } from '../schema/category-comparison-settings.js';
import { categoryModelSettings } from '../schema/category-model-settings.js';
import { dashboardLayoutSettings } from '../schema/dashboard-layout-settings.js';
import { forecastSettings } from '../schema/forecast-settings.js';
import { importBatches } from '../schema/import-batches.js';
import { loans } from '../schema/loans.js';
import { mappingProfiles } from '../schema/mapping-profiles.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { rules } from '../schema/rules.js';
import { salaryMetadata } from '../schema/salary-metadata.js';
import { savingsGoals } from '../schema/savings-goals.js';
import { transactions } from '../schema/transactions.js';
import { transferSettings } from '../schema/transfer-settings.js';
import { transfers } from '../schema/transfers.js';
import {
  clearUserRows,
  idOf,
  ownerOf,
  PER_USER_TABLES,
  TRANSPORT_TABLES,
  type PerUserTable,
} from './user-rows.js';

/**
 * Moving a browser database into an account, once (TICKET-SRV-07).
 *
 * **This is not an import.** `POST /api/data/import` preserves the ids a backup carries, because a
 * backup is this account's own data coming home. A browser database's ids were handed out by
 * Dexie's `++id`, starting at 1 in a database that belonged to one person; here ids are handed out
 * by SQLite across every user. The two id spaces are unrelated and **will collide**, so every row
 * is inserted with a fresh id and every reference to it is rewritten on the way in.
 *
 * **The remap is the substance.** Each table is written in dependency order, each insert records
 * `local id -> server id`, and each row's references are resolved through the maps built by the
 * tables before it. `transfers` and `transactions` reference each other, so transactions are
 * written first with `transferId` held back, transfers are written next, and the transactions are
 * patched afterwards — all inside the caller's single transaction.
 *
 * **Which fields get rewritten is derived, not listed.** `referencesOf` already knows every scalar
 * foreign key and every soft reference in the schema (`http/ownership.ts`), because the write path
 * needs exactly the same inventory to check ownership. What it cannot see is an id *inside* a JSON
 * column — a rule's `action.setCategoryId`, a settings row's list of excluded categories — so those
 * are the one hand-written list here, pinned by `migrate-local.spec.ts`.
 */

/** `merge` or `replace`, structurally the same union `routes/data.ts` validates for `/import`. */
export type MigrationMode = 'merge' | 'replace';

/** Rows keyed by table name, exactly the shape `GET /api/data/export` produces. */
export type MigrationDocument = Record<string, readonly unknown[]>;

export type MigrationReport = {
  /** Rows inserted, per table. */
  readonly migrated: Record<string, number>;
  /** Rows matched to a row the account already had, per table — a seeded category, say. */
  readonly reused: Record<string, number>;
  /**
   * Rows whose incoming *content* was discarded because the account already held a row with the
   * same natural key, per table. Counted apart from `reused` because they mean opposite things to
   * the person reading the report: a reused category is the same category, while a displaced salary
   * month is their own figures being dropped in favour of the ones already stored.
   */
  readonly displaced: Record<string, number>;
  /** Rows dropped because a reference they cannot exist without did not survive, per table. */
  readonly skipped: Record<string, number>;
  /** Optional references cleared because the row they named did not survive. */
  readonly clearedReferences: number;
  /**
   * Local category id -> the id it was given, for the trained model.
   * `CategoryModelArtifact.categoryIdByIndex` is the model's class index and travels as bytes in a
   * second request, so the client needs this one map to rewrite it. Bounded by the user's category
   * count (tens), unlike the transaction map (hundreds of thousands), which is why it is the only
   * one that comes back.
   */
  readonly categoryIds: Record<number, number>;
};

/**
 * The order rows are written in — every table after the ones it references, so a reference is
 * always resolved against a map that is already complete.
 *
 * `transactions` before `transfers` is the one place that is not simply topological: those two
 * reference each other, and something has to go first. Transactions do, with `transferId` held
 * back for the patch pass at the end.
 *
 * Written down rather than derived, because a dependency order is not something a schema states —
 * but `migrate-local.spec.ts` asserts this list is exactly `TRANSPORT_TABLES`, so a table added
 * later is a failing test rather than a silently unmigrated table.
 */
export const MIGRATION_ORDER: readonly PerUserTable[] = [
  accounts,
  categories,
  mappingProfiles,
  importBatches,
  transactions,
  transfers,
  rules,
  loans,
  recurringOverrides,
  savingsGoals,
  salaryMetadata,
  appSettings,
  categoryComparisonSettings,
  dashboardLayoutSettings,
  categoryModelSettings,
  forecastSettings,
  transferSettings,
] as unknown as readonly PerUserTable[];

/** The server id a local id became, or `undefined` if that row never landed. */
type IdLookup = (localId: number) => number | undefined;

/** A rewrite that cannot be honoured — the row is dropped rather than pointed somewhere wrong. */
const UNRESOLVED = Symbol('unresolved');

/** An id living *inside* a JSON column, which no schema metadata can point at. */
type EmbeddedReference = {
  /** Drizzle property name, which is also the column name on every table here. */
  readonly key: string;
  /** The table whose id map rewrites it. */
  readonly parent: SQLiteTable;
  readonly rewrite: (value: unknown, lookup: IdLookup) => unknown;
};

/** A list of ids: an entry whose row did not survive is dropped from the list. */
const remapList = (value: unknown, lookup: IdLookup): unknown =>
  Array.isArray(value)
    ? value.flatMap((id) => (typeof id === 'number' ? (lookup(id) ?? []) : []))
    : value;

/** A single optional id: cleared when its row did not survive. */
const remapScalar = (value: unknown, lookup: IdLookup): unknown =>
  typeof value === 'number' ? (lookup(value) ?? null) : value;

/**
 * `Rule.action.setCategoryId` — the whole point of the rule. A rule whose category did not survive
 * has nothing left to do, so it is dropped rather than pointed at whatever now holds that id.
 */
const remapRuleAction = (value: unknown, lookup: IdLookup): unknown => {
  const action = asRecord(value);
  const local = action['setCategoryId'];
  const mapped = typeof local === 'number' ? lookup(local) : undefined;
  return mapped === undefined ? UNRESOLVED : { ...action, setCategoryId: mapped };
};

/**
 * `Rule.conditions` — only `field: 'accountId'` carries an id, and it is compared with `equals`.
 *
 * An unmapped one drops the whole rule, deliberately. Leaving the local number in place would be
 * the one genuinely dangerous outcome of this whole migration: local account 3 and server account 3
 * can easily both exist and both belong to this user, so the rule would keep matching — against
 * somebody's *other* account, silently recategorising real transactions.
 */
const remapRuleConditions = (value: unknown, lookup: IdLookup): unknown => {
  if (!Array.isArray(value)) return value;

  const remapped: unknown[] = [];
  for (const raw of value) {
    const condition = asRecord(raw);
    const local = condition['value'];
    if (condition['field'] !== 'accountId') {
      remapped.push(condition);
      continue;
    }
    // An `accountId` condition whose value is not a number cannot be remapped, and passing it
    // through unchanged is the one outcome this function exists to avoid: a local id left in a rule
    // keeps matching against whatever now holds it. Unreachable today — the rule form coerces the
    // field with `Number` — so this is the code agreeing with the comment above rather than a fix.
    if (typeof local !== 'number') return UNRESOLVED;
    const mapped = lookup(local);
    if (mapped === undefined) return UNRESOLVED;
    remapped.push({ ...condition, value: mapped });
  }
  return remapped;
};

/**
 * `Transaction.attributionOverride` carries **two** ids: `jointAccountId`, which names an account
 * and can be resolved now, and `reimbursementTransferId`, which names a transfer and cannot —
 * transfers do not exist yet when transactions are written.
 *
 * So the transfer half is dropped here and put back by the patch pass, which calls this same
 * function again on the same document row so the account half is remapped identically. An unmapped
 * `jointAccountId` is removed rather than left pointing at whatever now holds that id: absent means
 * "infer it", which is what a single-joint-account user had anyway, where a wrong one silently
 * reweights a transaction against somebody else's ownership share.
 */
const remapAttributionOverride = (value: unknown, lookup: IdLookup): Record<string, unknown> => {
  const override = { ...asRecord(value) };
  delete override['reimbursementTransferId'];

  const joint = override['jointAccountId'];
  if (typeof joint !== 'number') return override;

  const mapped = lookup(joint);
  if (mapped === undefined) delete override['jointAccountId'];
  else override['jointAccountId'] = mapped;

  return override;
};

/**
 * Every id this schema stores inside a JSON column, which is the half `referencesOf` cannot derive.
 *
 * Pinned by `migrate-local.spec.ts` against the JSON columns the schema actually declares, so a
 * JSON column added later has to be either listed here or explicitly declared id-free.
 */
export const EMBEDDED_REFERENCES = new Map<SQLiteTable, readonly EmbeddedReference[]>([
  [
    transactions,
    [{ key: 'attributionOverride', parent: accounts, rewrite: remapAttributionOverride }],
  ],
  [
    rules,
    [
      { key: 'action', parent: categories, rewrite: remapRuleAction },
      { key: 'conditions', parent: accounts, rewrite: remapRuleConditions },
    ],
  ],
  [
    appSettings,
    [
      { key: 'excludedIncomeCategoryIds', parent: categories, rewrite: remapList },
      { key: 'smoothedBonusCategoryIds', parent: categories, rewrite: remapList },
      { key: 'heatmapExcludedCategoryIds', parent: categories, rewrite: remapList },
      { key: 'mainIncomeCategoryId', parent: categories, rewrite: remapScalar },
    ],
  ],
  [
    categoryComparisonSettings,
    [{ key: 'excludedCategoryIds', parent: categories, rewrite: remapList }],
  ],
  // Not named in TICKET-SRV-07's field list, and just as much a set of ids as the three above: a
  // forecast scoped to accounts 1 and 2 would silently re-scope itself to two other accounts.
  [forecastSettings, [{ key: 'scopeAccountIds', parent: accounts, rewrite: remapList }]],
]);

/**
 * Rows the account may already hold a copy of, and what makes two of them the same row.
 *
 * Every new account is seeded with the ~10 default categories and the two mapping-profile
 * templates (`seedUserDefaults`), and the browser database being migrated was seeded from the same
 * constants — so without this, migrating into a fresh account produces two "Groceries" and the
 * user's transactions point at the *second* one. Matching on what the row says rather than on its
 * id is also what makes a re-run after a failure safe.
 *
 * `salaryMetadata` is here for a different reason: `(userId, yearMonth)` is unique, so an incoming
 * month the account already has would abort the whole transaction on a constraint the user has no
 * way to act on. The stored row wins and the incoming one is reported as reused.
 */
/**
 * Tables where a reconciliation match **loses the incoming row's data**, rather than recognising it
 * as a row the account already had.
 *
 * A seeded "Groceries" category and a migrated one are the same category, so matching them is the
 * correct outcome and nothing is lost. A salary month is different: the key is only the month, so a
 * match means this browser's gross wage, bonus and note are discarded in favour of whatever the
 * account already recorded for it. Reporting both as "reused" would let real figures disappear
 * under a word that means "we skipped a duplicate".
 */
const DISPLACES_CONTENT = new Set<SQLiteTable>([salaryMetadata]);

const RECONCILED_BY = new Map<SQLiteTable, (values: EntityValues) => string>([
  [categories, (values) => `${values['name']}\u0000${values['kind']}\u0000${values['isSystem']}`],
  [mappingProfiles, (values) => `${values['name']}`],
  [salaryMetadata, (values) => `${values['yearMonth']}`],
]);

/** How many rows of a table `seedUserDefaults` creates — what "beyond the seed" means below. */
const SEEDED_ROW_COUNTS = new Map<string, number>([
  ['categories', DEFAULT_CATEGORIES.length],
  ['mappingProfiles', DEFAULT_MAPPING_PROFILE_TEMPLATES.length],
  ['transferSettings', 1],
]);

const columnsOf = (table: SQLiteTable): Record<string, SQLiteColumn> =>
  getTableColumns(table) as Record<string, SQLiteColumn>;

/** `transactions.transferId` alone: written as null now and patched once transfers exist. */
const isDeferred = (table: PerUserTable, key: string): boolean =>
  table === (transactions as unknown as PerUserTable) && key === 'transferId';

/** Columns the server computes rather than accepts (`transactions.reimbursementTransferId`). */
const derivedOf = (table: PerUserTable): readonly string[] =>
  table === (transactions as unknown as PerUserTable) ? DERIVED_COLUMNS : [];

/* --------------------------------------------------------------------------------------------
 * The id maps
 * ------------------------------------------------------------------------------------------ */

type IdMaps = Map<string, Map<number, number>>;

const mapFor = (maps: IdMaps, table: SQLiteTable): Map<number, number> => {
  const name = getTableName(table);
  const existing = maps.get(name);
  if (existing !== undefined) return existing;

  const created = new Map<number, number>();
  maps.set(name, created);
  return created;
};

const lookupIn =
  (maps: IdMaps, table: SQLiteTable): IdLookup =>
  (localId) =>
    mapFor(maps, table).get(localId);

/**
 * The same lookup, **counting every miss** as a reference this migration could not honour.
 *
 * Used for the ids inside JSON columns, where a miss always means something was quietly removed: an
 * entry dropped from a list, an optional id nulled, a `jointAccountId` stripped off a transaction.
 * Four separate rewrite functions do that, and before this only the scalar path reported anything —
 * so a migration that emptied every `excludedCategoryIds` and nulled `mainIncomeCategoryId` still
 * answered `clearedReferences: 0`, and the dialog gates its warning on that number.
 *
 * Deliberately *not* used for scalar references: there a miss on a NOT NULL column drops the whole
 * row, which is reported as `skipped` instead, so counting it here as well would say the same loss
 * twice in two different words.
 */
const countingLookupIn =
  (maps: IdMaps, table: SQLiteTable, report: MutableReport): IdLookup =>
  (localId) => {
    const mapped = mapFor(maps, table).get(localId);
    if (mapped === undefined) report.clearedReferences += 1;
    return mapped;
  };

/* --------------------------------------------------------------------------------------------
 * One row
 * ------------------------------------------------------------------------------------------ */

type RowContext = {
  readonly table: PerUserTable;
  readonly maps: IdMaps;
  readonly report: MutableReport;
  /** Whether the account's own rows are being kept — see `writeSingleton`. */
  readonly mode: MigrationMode;
};

type MutableReport = {
  migrated: Record<string, number>;
  reused: Record<string, number>;
  displaced: Record<string, number>;
  skipped: Record<string, number>;
  clearedReferences: number;
  categoryIds: Record<number, number>;
};

/**
 * Rewrites every scalar foreign key and soft reference of a row. Answers `false` when a reference
 * the row **cannot exist without** did not survive — a transaction whose account is gone, a
 * transfer whose leg is gone — in which case the row is dropped rather than written dangling.
 */
const resolveScalarReferences = (
  values: EntityValues,
  { table, maps, report }: RowContext,
): boolean => {
  const columns = columnsOf(table);

  for (const { key, parent } of referencesOf(table) as readonly OwnedReference[]) {
    if (isDeferred(table, key)) {
      values[key] = null;
      continue;
    }

    const local = values[key];
    if (typeof local !== 'number') continue;

    const mapped = lookupIn(maps, parent)(local);
    if (mapped !== undefined) {
      values[key] = mapped;
      continue;
    }
    if (columns[key]?.notNull === true) return false;

    values[key] = null;
    report.clearedReferences += 1;
  }

  return true;
};

/** The same, for the ids living inside JSON columns. `false` drops the row (see `remapRuleAction`). */
const resolveEmbeddedReferences = (
  values: EntityValues,
  { table, maps, report }: RowContext,
): boolean => {
  for (const { key, parent, rewrite } of EMBEDDED_REFERENCES.get(table) ?? []) {
    const value = values[key];
    if (value === undefined || value === null) continue;

    const rewritten = rewrite(value, countingLookupIn(maps, parent, report));
    if (rewritten === UNRESOLVED) return false;
    values[key] = rewritten;
  }
  return true;
};

/** A document row, validated against its table and with every reference rewritten. */
const resolveRow = (row: unknown, context: RowContext): EntityValues | null => {
  const { table } = context;
  const values = parseEntityBody(table, row, { mode: 'create', derived: derivedOf(table) });

  if (!resolveScalarReferences(values, context)) return null;
  if (!resolveEmbeddedReferences(values, context)) return null;

  return values;
};

/* --------------------------------------------------------------------------------------------
 * One table
 * ------------------------------------------------------------------------------------------ */

/** What the account already holds, keyed the way `RECONCILED_BY` says two rows are the same. */
const existingByKey = (
  tx: DbOrTx,
  table: PerUserTable,
  userId: number,
): Map<string, number> | undefined => {
  const keyOf = RECONCILED_BY.get(table);
  if (keyOf === undefined) return undefined;

  const idColumn = idOf(table);
  if (idColumn === undefined) return undefined;

  const rows = tx
    .select()
    .from(table)
    .where(eq(ownerOf(table), userId))
    .all() as Record<string, unknown>[];

  return new Map(rows.map((row) => [keyOf(row), row['id'] as number]));
};

const bump = (counts: Record<string, number>, table: PerUserTable): void => {
  const name = getTableName(table);
  counts[name] = (counts[name] ?? 0) + 1;
};

/**
 * A singleton table (`appSettings`, `forecastSettings`, …) is one row per user, keyed by the owner.
 * The account may already have one, so the incoming row replaces it rather than colliding with its
 * primary key — but **only when the user asked for a replace**.
 *
 * On a merge it does not, and that is the whole point of the distinction: merge is offered as
 * "everything already in the account stays, and this browser's data is added beside it", and a
 * settings row is not added beside anything — it is one row, so writing it would silently replace
 * the account's locale, currency, accent, privacy mode, fiscal year start and income configuration
 * with the browser's. `transferSettings` is seeded into every account, so *every* merge would have
 * overwritten at least that one. Reported as reused, which is what it is: the stored row won.
 */
const writeSingleton = (
  tx: DbOrTx,
  table: PerUserTable,
  values: EntityValues,
  userId: number,
  mode: MigrationMode,
): boolean => {
  const held = tx
    .select({ owner: ownerOf(table) })
    .from(table)
    .where(eq(ownerOf(table), userId))
    .get();

  if (held !== undefined && mode === 'merge') return false;

  tx.delete(table)
    .where(eq(ownerOf(table), userId))
    .run();
  tx.insert(table)
    .values({ ...values, userId } as never)
    .run();
  return true;
};

const writeRows = (
  tx: DbOrTx,
  rows: readonly unknown[],
  context: RowContext,
  userId: number,
): void => {
  const { table, maps, report, mode } = context;
  const idColumn = idOf(table);
  const existing = existingByKey(tx, table, userId);
  const keyOf = RECONCILED_BY.get(table);
  const ids = mapFor(maps, table);

  for (const row of rows) {
    const values = resolveRow(row, context);
    if (values === null) {
      bump(report.skipped, table);
      continue;
    }

    if (idColumn === undefined) {
      bump(
        writeSingleton(tx, table, values, userId, mode) ? report.migrated : report.reused,
        table,
      );
      continue;
    }

    const localId = toId(asRecord(row)['id']);
    const reusedId = keyOf === undefined ? undefined : existing?.get(keyOf(values));
    if (reusedId !== undefined) {
      if (localId !== undefined) ids.set(localId, reusedId);
      // `DISPLACES_CONTENT` marks the tables where matching means the incoming row's own values are
      // thrown away rather than recognised as the same thing — see `MigrationReport.displaced`.
      bump(DISPLACES_CONTENT.has(table) ? report.displaced : report.reused, table);
      continue;
    }

    const assigned = tx
      .insert(table)
      .values({ ...values, userId } as never)
      .returning({ id: idColumn })
      .get() as { id: number };

    if (localId !== undefined) ids.set(localId, assigned.id);
    // Deliberately *not* added to `existing`: that map means "rows this account already held", and
    // adding to it would make a second incoming row with the same key reuse the first one's id
    // instead of being inserted. Category names are not unique — two user categories both called
    // "Groceries" are an ordinary thing to have — so that would silently collapse them into one,
    // discard the second's colour, group, icon and dates, and repoint every transaction, rule and
    // loan that referenced it. Re-run safety does not depend on it either: the whole import is one
    // transaction, so a failed run never persists anything to collide with.
    bump(report.migrated, table);
  }
};

/* --------------------------------------------------------------------------------------------
 * The patch pass — the two directions of the transfer/transaction link
 * ------------------------------------------------------------------------------------------ */

const localReimbursementOf = (row: Record<string, unknown>): number | undefined => {
  const override = row['attributionOverride'];
  if (override === undefined || override === null) return undefined;

  const id = (override as Record<string, unknown>)['reimbursementTransferId'];
  return typeof id === 'number' ? id : undefined;
};

/**
 * Re-reads the document's transaction rows once the transfers exist and fills in the two fields
 * that could not be written earlier: `transferId`, and the `reimbursementTransferId` inside (and
 * extracted from) `attributionOverride`.
 *
 * Reading the document again rather than carrying per-row state through the insert pass keeps the
 * insert loop to one row at a time on a dataset that can be hundreds of thousands of rows long.
 */
const linkTransferLegs = (
  tx: DbOrTx,
  rows: readonly unknown[],
  maps: IdMaps,
  report: MutableReport,
  userId: number,
): void => {
  const transactionId = lookupIn(maps, transactions);
  const transferId = lookupIn(maps, transfers);
  const accountId = lookupIn(maps, accounts);

  for (const raw of rows) {
    const row = asRecord(raw);
    const localId = toId(row['id']);
    const serverId = localId === undefined ? undefined : transactionId(localId);
    if (serverId === undefined) continue;

    const patch: EntityValues = {};

    const localTransfer = typeof row['transferId'] === 'number' ? row['transferId'] : undefined;
    if (localTransfer !== undefined) {
      const mapped = transferId(localTransfer);
      if (mapped === undefined) report.clearedReferences += 1;
      else patch['transferId'] = mapped;
    }

    const localReimbursement = localReimbursementOf(row);
    if (localReimbursement !== undefined) {
      const mapped = transferId(localReimbursement);
      if (mapped === undefined) report.clearedReferences += 1;
      else {
        // Rebuilt from the document row through the same rewrite the insert pass used, so the
        // `jointAccountId` beside it is remapped identically rather than restored to its local id.
        patch['attributionOverride'] = {
          ...remapAttributionOverride(row['attributionOverride'], accountId),
          reimbursementTransferId: mapped,
        };
        patch['reimbursementTransferId'] = mapped;
      }
    }

    if (Object.keys(patch).length === 0) continue;

    tx.update(transactions)
      .set(patch as never)
      .where(and(eq(transactions.id, serverId), eq(transactions.userId, userId)))
      .run();
  }
};

/* --------------------------------------------------------------------------------------------
 * The whole document
 * ------------------------------------------------------------------------------------------ */

const emptyReport = (): MutableReport => ({
  migrated: Object.fromEntries(TRANSPORT_TABLES.map((table) => [getTableName(table), 0])),
  reused: Object.fromEntries(TRANSPORT_TABLES.map((table) => [getTableName(table), 0])),
  displaced: Object.fromEntries(TRANSPORT_TABLES.map((table) => [getTableName(table), 0])),
  skipped: Object.fromEntries(TRANSPORT_TABLES.map((table) => [getTableName(table), 0])),
  clearedReferences: 0,
  categoryIds: {},
});

/**
 * Writes a whole browser database into one account, remapping every id as it goes.
 *
 * Opens **no transaction of its own**: the caller owns it, because "either all of it or none of
 * it" is the one promise this operation cannot be run without (TICKET-SRV-07's acceptance criteria
 * and NFR-RESIL-1 both). The caller also owns the `PRAGMA defer_foreign_keys` that a `replace`'s
 * `clearUserRows` needs.
 *
 * Nothing here re-checks ownership: every id written is one this call just inserted under this
 * user, so `assertReferencesOwned`'s per-reference lookup — which `/import` needs, because a
 * backup's ids are the client's to choose — would be a query per reference per row to confirm
 * something already true by construction. SQLite's own foreign keys still check it all at COMMIT.
 */
export const migrateLocalDatabase = (
  tx: DbOrTx,
  document: MigrationDocument,
  mode: MigrationMode,
  userId: number,
): MigrationReport => {
  if (mode === 'replace') clearUserRows(tx, userId);

  const maps: IdMaps = new Map();
  const report = emptyReport();

  for (const table of MIGRATION_ORDER) {
    // A table the document does not carry is an empty table; one it carries that this schema does
    // not have is ignored, which is how a database from a version with a since-dropped table loads.
    const rows = document[getTableName(table)] ?? [];
    writeRows(tx, rows, { table, maps, report, mode }, userId);
  }

  linkTransferLegs(tx, document[getTableName(transactions)] ?? [], maps, report, userId);

  return {
    ...report,
    categoryIds: Object.fromEntries(mapFor(maps, categories)),
  };
};

/* --------------------------------------------------------------------------------------------
 * What the account already holds
 * ------------------------------------------------------------------------------------------ */

export type MigrationState = {
  /** Rows per table, so the dialog can say what it would be merging into. */
  readonly counts: Record<string, number>;
  /**
   * Whether the account holds anything the user put there, as opposed to the first-run seed.
   * A fresh account is migrated into without a second question; one with data has to be told.
   */
  readonly hasExistingData: boolean;
};

/** Rows per table for this user, and whether any of it is theirs rather than the seed's. */
export const readMigrationState = (tx: DbOrTx, userId: number): MigrationState => {
  const counts: Record<string, number> = {};

  for (const table of PER_USER_TABLES) {
    const rows = tx
      .select({ id: ownerOf(table) })
      .from(table)
      .where(eq(ownerOf(table), userId))
      .all() as unknown[];
    counts[getTableName(table)] = rows.length;
  }

  const hasExistingData = PER_USER_TABLES.some((table) => {
    const name = getTableName(table);
    return (counts[name] ?? 0) > (SEEDED_ROW_COUNTS.get(name) ?? 0);
  });

  return { counts, hasExistingData };
};
