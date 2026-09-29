import { getTableColumns, getTableName } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES, DEFAULT_MAPPING_PROFILE_TEMPLATES } from 'shared/seed-data.js';

import {
  abortOn,
  apiJson,
  signInAs,
  startTestAppWithDb,
  type TestApp,
  type TestSession,
} from '../app.testing.js';
import { referencesOf } from '../http/ownership.js';
import { accounts } from '../schema/accounts.js';
import { appSettings } from '../schema/app-settings.js';
import { categories } from '../schema/categories.js';
import { categoryComparisonSettings } from '../schema/category-comparison-settings.js';
import { forecastSettings } from '../schema/forecast-settings.js';
import { importBatches } from '../schema/import-batches.js';
import { loans } from '../schema/loans.js';
import { mappingProfiles } from '../schema/mapping-profiles.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { rules } from '../schema/rules.js';
import { salaryMetadata } from '../schema/salary-metadata.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import {
  EMBEDDED_REFERENCES,
  MIGRATION_ORDER,
  type MigrationReport,
  type MigrationState,
} from './migrate-local.js';
import { TRANSPORT_TABLES } from './user-rows.js';

/**
 * `POST /api/data/migrate-local` — moving a browser database into an account (TICKET-SRV-07).
 *
 * **Every assertion here resolves through to content, never to an id.** That is the whole point of
 * the ticket: local ids are thrown away and reassigned, so `expect(transaction.categoryId).toBe(3)`
 * would prove nothing at all. Each check walks the reference and compares what the row on the other
 * end *says* — the category's name, the account's name, the transfer's other leg's description.
 *
 * The fixture's ids deliberately collide with ids the server has already handed out: every test
 * gives the migrating user a small dataset of their own first, so local id 1 and server id 1 both
 * exist and a migration that quietly preserved ids would attach the data to the wrong rows rather
 * than failing loudly.
 */

const PATH = '/api/data/migrate-local';

/* --------------------------------------------------------------------------------------------
 * The fixture: one browser database, ids 1..n per table, every relationship in it
 * ------------------------------------------------------------------------------------------ */

const account = (id: number, name: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2024-01-01',
  color: '#0ea5e9',
  icon: 'bank',
  archived: false,
  ...overrides,
});

const category = (id: number, name: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  kind: 'expense',
  color: '#16a34a',
  icon: 'cart',
  archived: false,
  isSystem: false,
  ...overrides,
});

const transaction = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  accountId: 1,
  bookingDate: '2025-03-01',
  amount: -10,
  currency: 'EUR',
  rawDescription: `Row ${id}`,
  fingerprint: `local-${id}`,
  createdAt: '2025-03-01T10:00:00.000Z',
  ...overrides,
});

/**
 * A whole browser database, with one row of every shape the remap has to handle: a linked transfer,
 * a categorised transaction, a reimbursement override, a rule keyed on an account *and* a category,
 * an import batch, a loan, a recurring override and populated settings.
 */
const localDatabase = (): Record<string, unknown[]> => ({
  accounts: [account(1, 'Local Checking'), account(2, 'Local Joint', { type: 'joint' })],
  categories: [
    category(1, 'Groceries', { isSystem: true }),
    category(2, 'Salary', { kind: 'income' }),
  ],
  mappingProfiles: [
    {
      id: 1,
      name: 'My own profile',
      delimiter: ';',
      decimalSeparator: ',',
      dateFormat: 'DD/MM/YYYY',
      encoding: 'utf-8',
      headerRows: 1,
      signConvention: 'as-is',
      columns: { date: 'Date', description: 'Description', amount: 'Amount' },
      defaultAccountId: 2,
    },
  ],
  importBatches: [
    {
      id: 1,
      accountId: 2,
      mappingProfileId: 1,
      fileName: 'march.csv',
      importedAt: '2025-03-02T09:00:00.000Z',
      rowsRead: 3,
      rowsAdded: 3,
      rowsDuplicate: 0,
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
    },
  ],
  transactions: [
    transaction(1, {
      rawDescription: 'Transfer out',
      transferId: 1,
      categoryId: 1,
      importBatchId: 1,
    }),
    transaction(2, { rawDescription: 'Transfer in', amount: 10, accountId: 2, transferId: 1 }),
    transaction(3, {
      rawDescription: 'Reimbursed dinner',
      categoryId: 1,
      categoryManual: true,
      attributionOverride: { mode: 'shared', jointAccountId: 2, reimbursementTransferId: 1 },
    }),
  ],
  transfers: [
    {
      id: 1,
      fromTransactionId: 1,
      toTransactionId: 2,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2025-03-02T09:00:00.000Z',
    },
  ],
  rules: [
    {
      id: 1,
      name: 'Joint groceries',
      priority: 1,
      enabled: true,
      continueOnMatch: false,
      conditionMatch: 'all',
      conditions: [
        { field: 'description', operator: 'contains', value: 'SUPER' },
        { field: 'accountId', operator: 'equals', value: 2 },
      ],
      action: { setCategoryId: 1 },
    },
  ],
  loans: [
    {
      id: 1,
      name: 'Car',
      loanType: 'auto',
      principal: 12000,
      interestRate: 3.5,
      termMonths: 60,
      startDate: '2024-01-01',
      categoryId: 1,
      archived: false,
      sortOrder: 0,
    },
  ],
  recurringOverrides: [
    { id: 1, kind: 'merged', anchorTransactionId: 3, mergedIntoTransactionId: 1, createdAt: 'x' },
  ],
  savingsGoals: [
    {
      id: 1,
      name: 'New bike',
      targetAmount: 1200,
      archived: false,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  salaryMetadata: [{ id: 1, yearMonth: '2025-03', grossWage: 4200 }],
  appSettings: [
    {
      id: 1,
      excludedIncomeCategoryIds: [2],
      smoothedBonusCategoryIds: [2],
      heatmapExcludedCategoryIds: [1],
      mainIncomeCategoryId: 2,
      locale: 'nl-BE',
    },
  ],
  categoryComparisonSettings: [{ id: 1, excludedCategoryIds: [1, 2] }],
  dashboardLayoutSettings: [{ id: 1, rowOrder: ['stats'], hiddenRowIds: ['trend-chart'] }],
  categoryModelSettings: [{ id: 1, trainingWindowYears: 3 }],
  forecastSettings: [
    {
      id: 1,
      lookbackMonths: 6,
      basis: 'net-cash-flow',
      safetyNetAmount: 500,
      scopeAccountIds: [1, 2],
    },
  ],
  transferSettings: [{ id: 1, matchWindowDays: 4, autoLinkMediumConfidence: true }],
});

/* --------------------------------------------------------------------------------------------
 * Harness
 * ------------------------------------------------------------------------------------------ */

type Migrator = {
  readonly app: TestApp;
  readonly session: TestSession;
};

/**
 * A signed-in user whose account already holds rows, so the ids SQLite hands the migration cannot
 * accidentally be the ids the document carried. Seeded through the app's own create-user path when
 * `seeded` is asked for, which is what gives them the default categories and mapping profiles.
 */
const migratingUser = async (options: { rows?: boolean } = { rows: true }): Promise<Migrator> => {
  const app = await startTestAppWithDb({ seed: false });
  const session = await signInAs(app, 'alice');

  if (options.rows !== false) {
    // Ids 1 and 2 in `accounts`, `categories`, `transactions` and the rest are now taken by rows
    // that have nothing to do with the document about to arrive.
    app.db
      .insert(accounts)
      .values({ ...account(1, 'Server Checking'), id: undefined, userId: session.id } as never)
      .run();
    app.db
      .insert(categories)
      .values({ ...category(1, 'Server Category'), id: undefined, userId: session.id } as never)
      .run();
    app.db
      .insert(transactions)
      .values({
        ...transaction(1, { rawDescription: 'Server row' }),
        id: undefined,
        accountId: 1,
        userId: session.id,
      } as never)
      .run();
  }

  return { app, session };
};

const migrate = (
  { app, session }: Migrator,
  tables: Record<string, unknown[]> = localDatabase(),
  mode: 'merge' | 'replace' = 'merge',
) =>
  apiJson<MigrationReport>(app, PATH, {
    as: session,
    method: 'POST',
    body: { mode, data: { schemaVersion: 16, tables } },
  });

const allRowsOf = <T extends SQLiteTable>(app: TestApp, table: T): Record<string, unknown>[] =>
  app.db.select().from(table).all() as Record<string, unknown>[];

/** This user's rows only — the seeded `admin` account owns a copy of every default category too. */
const rowsOf = <T extends SQLiteTable>(
  { app, session }: Migrator,
  table: T,
): Record<string, unknown>[] => allRowsOf(app, table).filter((row) => row['userId'] === session.id);

/** A row of a table, found by what it says rather than by an id. */
const rowWhere = (
  rows: Record<string, unknown>[],
  key: string,
  value: unknown,
): Record<string, unknown> => {
  const found = rows.find((row) => row[key] === value);
  if (found === undefined) throw new Error(`no row with ${key} = ${String(value)}`);
  return found;
};

/** Every table's row count, for the before/after comparison an atomicity test is. */
const rowCounts = (user: Migrator): Record<string, number> =>
  Object.fromEntries(
    TRANSPORT_TABLES.map((table) => [getTableName(table), rowsOf(user, table).length]),
  );

/* --------------------------------------------------------------------------------------------
 * The inventories, pinned
 * ------------------------------------------------------------------------------------------ */

describe('migrate-local: the tables and fields it covers', () => {
  it('writes every table a document can carry, exactly once', () => {
    const order = MIGRATION_ORDER.map(getTableName);
    expect(new Set(order).size).toBe(order.length);
    expect([...order].sort()).toEqual(TRANSPORT_TABLES.map(getTableName).sort());
  });

  it('writes transactions before transfers, so the mutual reference has a first half', () => {
    const order = MIGRATION_ORDER.map(getTableName);
    expect(order.indexOf('transactions')).toBeLessThan(order.indexOf('transfers'));
  });

  /**
   * The gap test for the hand-written half: every JSON column in the schema has to be *either*
   * remapped or named below as carrying no ids, because an id inside one is invisible to schema
   * metadata and the way it shows up is a settings row silently pointing at somebody else's
   * categories.
   */
  it('accounts for every JSON column in the schema', () => {
    const ID_FREE_JSON_COLUMNS = [
      'accounts.coOwners',
      'appSettings.seenGuideSlugs',
      'appSettings.recentRanges',
      'dashboardLayoutSettings.rowOrder',
      'dashboardLayoutSettings.hiddenRowIds',
      'mappingProfiles.columns',
      'mappingProfiles.headerSignature',
      'transactions.rawRow',
    ];

    const jsonColumns = TRANSPORT_TABLES.flatMap((table) =>
      Object.entries(getTableColumns(table) as Record<string, SQLiteColumn>)
        .filter(([, column]) => column.dataType === 'json')
        .map(([key]) => `${getTableName(table)}.${key}`),
    );

    const remapped = new Set(
      [...EMBEDDED_REFERENCES].flatMap(([table, references]) =>
        references.map(({ key }) => `${getTableName(table as SQLiteTable)}.${key}`),
      ),
    );

    expect(jsonColumns.filter((column) => !remapped.has(column)).sort()).toEqual(
      [...ID_FREE_JSON_COLUMNS].sort(),
    );
  });
  /**
   * The *other* gap, and the one the comment above used to claim could not exist: a plain integer
   * id column with **no foreign key**. `referencesOf` derives its list from the schema's declared
   * relations, so a bare `integer('somethingId')` is not in it; the JSON check above cannot see it
   * either, since it is not a JSON column. Two already exist — `appSettings.mainIncomeCategoryId`
   * and `transactions.reimbursementTransferId` — and both were caught only by somebody reading the
   * types. This makes a third a failing test.
   */
  it('accounts for every id-shaped column the schema does not declare as a reference', () => {
    /** Covered by the bespoke patch pass rather than by either map — see `linkTransferLegs`. */
    const PATCHED_SEPARATELY = ['transactions.reimbursementTransferId'];
    /** The owner column, written from the session on every insert rather than remapped. */
    const OWNER = 'userId';

    const idShaped = TRANSPORT_TABLES.flatMap((table) =>
      Object.entries(getTableColumns(table) as Record<string, SQLiteColumn>)
        .filter(
          ([key, column]) => /Ids?$/.test(key) && key !== OWNER && column.dataType === 'number',
        )
        .map(([key]) => `${getTableName(table)}.${key}`),
    );

    const covered = new Set([
      ...PATCHED_SEPARATELY,
      ...TRANSPORT_TABLES.flatMap((table) =>
        (referencesOf(table) as readonly { key: string }[]).map(
          ({ key }) => `${getTableName(table)}.${key}`,
        ),
      ),
      ...[...EMBEDDED_REFERENCES].flatMap(([table, references]) =>
        references.map(({ key }) => `${getTableName(table as SQLiteTable)}.${key}`),
      ),
    ]);

    expect(idShaped.filter((column) => !covered.has(column))).toEqual([]);
  });

  /**
   * `MIGRATION_ORDER`'s *positions*, not just its membership. A table inserted before one it
   * references loses every row whose reference is not written yet — counted as `skipped`, which
   * reads in the report as the user's own dangling data rather than as a bug.
   */
  it('places every table after the tables it references', () => {
    const positionOf = new Map(MIGRATION_ORDER.map((table, index) => [getTableName(table), index]));

    const misordered = MIGRATION_ORDER.flatMap((table) => {
      const own = positionOf.get(getTableName(table)) ?? 0;
      const parents = [
        ...(referencesOf(table) as readonly { parent: SQLiteTable }[]),
        ...(EMBEDDED_REFERENCES.get(table) ?? []),
      ].map(({ parent }) => getTableName(parent as SQLiteTable));

      return (
        parents
          .filter((parent) => (positionOf.get(parent) ?? -1) > own)
          // Transactions and transfers reference each other, so one of them has to come first; the
          // second direction is written by the patch pass afterwards.
          .filter((parent) => !(getTableName(table) === 'transactions' && parent === 'transfers'))
          .map((parent) => `${getTableName(table)} before ${parent}`)
      );
    });

    expect(misordered).toEqual([]);
  });
});

/* --------------------------------------------------------------------------------------------
 * The move itself
 * ------------------------------------------------------------------------------------------ */

describe('migrate-local: every relationship survives', () => {
  it('resolves every foreign key to the right row by its content', async () => {
    const user = await migratingUser();
    const { status } = await migrate(user);
    expect(status).toBe(200);

    const account1 = rowWhere(rowsOf(user, accounts), 'name', 'Local Checking');
    const joint = rowWhere(rowsOf(user, accounts), 'name', 'Local Joint');
    const groceries = rowWhere(rowsOf(user, categories), 'name', 'Groceries');
    const salary = rowWhere(rowsOf(user, categories), 'name', 'Salary');
    const profile = rowWhere(rowsOf(user, mappingProfiles), 'name', 'My own profile');
    const batch = rowWhere(rowsOf(user, importBatches), 'fileName', 'march.csv');
    const out = rowWhere(rowsOf(user, transactions), 'rawDescription', 'Transfer out');
    const dinner = rowWhere(rowsOf(user, transactions), 'rawDescription', 'Reimbursed dinner');

    expect(out['accountId']).toBe(account1['id']);
    expect(out['categoryId']).toBe(groceries['id']);
    expect(out['importBatchId']).toBe(batch['id']);
    expect(batch['accountId']).toBe(joint['id']);
    expect(batch['mappingProfileId']).toBe(profile['id']);
    expect(profile['defaultAccountId']).toBe(joint['id']);

    expect(rowsOf(user, loans)[0]?.['categoryId']).toBe(groceries['id']);
    expect(rowsOf(user, rules)[0]?.['action']).toEqual({ setCategoryId: groceries['id'] });
    expect(rowsOf(user, rules)[0]?.['conditions']).toEqual([
      { field: 'description', operator: 'contains', value: 'SUPER' },
      { field: 'accountId', operator: 'equals', value: joint['id'] },
    ]);

    const override = rowsOf(user, recurringOverrides)[0];
    expect(override?.['anchorTransactionId']).toBe(dinner['id']);
    expect(override?.['mergedIntoTransactionId']).toBe(out['id']);

    expect(rowsOf(user, appSettings)[0]).toMatchObject({
      excludedIncomeCategoryIds: [salary['id']],
      smoothedBonusCategoryIds: [salary['id']],
      heatmapExcludedCategoryIds: [groceries['id']],
      mainIncomeCategoryId: salary['id'],
      locale: 'nl-BE',
    });
    expect(rowsOf(user, categoryComparisonSettings)[0]?.['excludedCategoryIds']).toEqual([
      groceries['id'],
      salary['id'],
    ]);
    expect(rowsOf(user, forecastSettings)[0]?.['scopeAccountIds']).toEqual([
      account1['id'],
      joint['id'],
    ]);
  });

  it('points both legs of a linked transfer at each other', async () => {
    const user = await migratingUser();
    await migrate(user);

    const out = rowWhere(rowsOf(user, transactions), 'rawDescription', 'Transfer out');
    const back = rowWhere(rowsOf(user, transactions), 'rawDescription', 'Transfer in');
    const transfer = rowsOf(user, transfers)[0]!;

    expect(transfer['fromTransactionId']).toBe(out['id']);
    expect(transfer['toTransactionId']).toBe(back['id']);
    expect(out['transferId']).toBe(transfer['id']);
    expect(back['transferId']).toBe(transfer['id']);
  });

  it('remaps both ids inside an attribution override, and its extracted column with them', async () => {
    const user = await migratingUser();
    await migrate(user);

    const joint = rowWhere(rowsOf(user, accounts), 'name', 'Local Joint');
    const transfer = rowsOf(user, transfers)[0]!;
    const dinner = rowWhere(rowsOf(user, transactions), 'rawDescription', 'Reimbursed dinner');

    expect(dinner['attributionOverride']).toEqual({
      mode: 'shared',
      jointAccountId: joint['id'],
      reimbursementTransferId: transfer['id'],
    });
    expect(dinner['reimbursementTransferId']).toBe(transfer['id']);
  });

  it('does not preserve a single id, and nothing depends on it', async () => {
    const user = await migratingUser();
    await migrate(user);

    // Every fixture table's first row carried local id 1, and the account already had a row on
    // server id 1 in each of these tables. So the arriving row cannot be on id 1 — and the row that
    // *is* on id 1 has to be the one that was already there, untouched.
    for (const [table, name] of [
      [accounts, 'Local Checking'],
      [categories, 'Groceries'],
      [transactions, 'Transfer out'],
    ] as const) {
      const key = table === transactions ? 'rawDescription' : 'name';
      expect(rowWhere(rowsOf(user, table), key, name)['id']).not.toBe(1);
    }

    const server = rowWhere(rowsOf(user, accounts), 'name', 'Server Checking');
    expect(server['id']).toBe(1);
    expect(rowWhere(rowsOf(user, transactions), 'rawDescription', 'Server row')['accountId']).toBe(
      server['id'],
    );
  });

  it('reports what landed, per table', async () => {
    const user = await migratingUser();
    const { body } = await migrate(user);

    expect(body.migrated['transactions']).toBe(3);
    expect(body.migrated['transfers']).toBe(1);
    expect(body.migrated['accounts']).toBe(2);
    expect(body.skipped['transactions']).toBe(0);
    expect(body.clearedReferences).toBe(0);
    // The one map that comes back, for the trained model's class index.
    expect(Object.keys(body.categoryIds)).toHaveLength(2);
  });
});

/* --------------------------------------------------------------------------------------------
 * Atomicity
 * ------------------------------------------------------------------------------------------ */

describe('migrate-local: all of it or none of it', () => {
  it('leaves every table exactly as it was when a write fails part-way', async () => {
    const user = await migratingUser();
    const before = rowCounts(user);

    // `transfers` is written late, after two accounts, two categories, a profile, a batch and three
    // transactions have already been inserted — so a failure here is squarely mid-migration.
    abortOn(user.app, 'INSERT', 'transfers');
    const { status } = await migrate(user);

    expect(status).toBe(500);
    expect(rowCounts(user)).toEqual(before);
  });

  it('can be run again after a failure, without duplicating what the first attempt wrote', async () => {
    const user = await migratingUser();
    abortOn(user.app, 'INSERT', 'transfers');
    await migrate(user);

    user.app.handle.sqlite.exec('DROP TRIGGER abort_INSERT_transfers');
    const { status } = await migrate(user);

    expect(status).toBe(200);
    expect(
      rowsOf(user, accounts).filter(({ name }) => String(name).startsWith('Local')),
    ).toHaveLength(2);
  });
});

/* --------------------------------------------------------------------------------------------
 * Merge, replace, and the seed
 * ------------------------------------------------------------------------------------------ */

describe('migrate-local: merge and replace', () => {
  it('reuses a seeded category rather than creating a second one with the same name', async () => {
    const app = await startTestAppWithDb({ seed: true });
    const session = await signInAs(app, 'alice');
    // The seeded defaults this account was created with, as `seedUserDefaults` writes them.
    app.db
      .insert(categories)
      .values(
        DEFAULT_CATEGORIES.map(({ id: _id, ...rest }) => ({
          ...rest,
          userId: session.id,
        })) as never,
      )
      .run();

    const user: Migrator = { app, session };
    const { body } = await migrate(user);

    const named = rowsOf(user, categories).filter((row) => row['name'] === 'Groceries');
    expect(named).toHaveLength(1);
    expect(body.reused['categories']).toBe(1);
    expect(body.migrated['categories']).toBe(1);

    // And the migrated rows point at the row that was already there.
    const out = rowWhere(rowsOf(user, transactions), 'rawDescription', 'Transfer out');
    expect(out['categoryId']).toBe(named[0]!['id']);
  });

  it('reuses a seeded mapping profile rather than creating a second one with the same name', async () => {
    const app = await startTestAppWithDb({ seed: true });
    const session = await signInAs(app, 'alice');
    app.db
      .insert(mappingProfiles)
      .values(
        DEFAULT_MAPPING_PROFILE_TEMPLATES.map(({ id: _id, ...rest }) => ({
          ...rest,
          userId: session.id,
        })) as never,
      )
      .run();

    const user: Migrator = { app, session };
    // The browser database was seeded from the same constants, so it carries its own copy of them.
    const tables = localDatabase();
    const seeded = DEFAULT_MAPPING_PROFILE_TEMPLATES[0]!;
    tables['mappingProfiles'] = [{ ...seeded, id: 4 }];
    tables['importBatches'] = [];

    const { body } = await migrate(user, tables);

    expect(rowsOf(user, mappingProfiles).filter((row) => row['name'] === seeded.name)).toHaveLength(
      1,
    );
    expect(body.reused['mappingProfiles']).toBe(1);
  });

  it('keeps two same-named categories apart instead of collapsing them into one', async () => {
    // Category names are not unique — nothing in the form enforces it — so two user categories both
    // called "Groceries" are an ordinary thing to have. Reconciliation exists to match the *seed*,
    // and folding one incoming row into another would discard its colour, icon, group and dates and
    // silently repoint every transaction, rule and loan that referenced it.
    const user = await migratingUser();
    const tables = {
      ...localDatabase(),
      categories: [
        category(1, 'Groceries', { color: '#111111' }),
        category(2, 'Groceries', { color: '#222222' }),
      ],
      transactions: [
        transaction(1, { accountId: 1, categoryId: 1 }),
        transaction(2, { accountId: 1, categoryId: 2 }),
      ],
    };

    const { body } = await migrate(user, tables);

    // Three "Groceries" afterwards, not two: the account's own seeded one, plus both of these.
    // Filtered by colour because that is what distinguishes the two incoming rows from each other.
    const migrated = rowsOf(user, categories).filter((row) =>
      ['#111111', '#222222'].includes(row['color'] as string),
    );
    expect(migrated).toHaveLength(2);
    expect(migrated.map((row) => row['color']).sort()).toEqual(['#111111', '#222222']);
    expect(body.reused['categories']).toBe(0);

    // And each migrated transaction still points at its own category, not both at the first —
    // which is the loss that mattered, since a collapse silently recategorises real spending.
    const pointed = migrated.map((row) =>
      rowsOf(user, transactions).some((txn) => txn['categoryId'] === row['id']),
    );
    expect(pointed).toEqual([true, true]);
  });

  it('leaves the account’s own settings alone on merge, and replaces them on replace', async () => {
    // Merge is offered as "everything already in the account stays". A settings row is not added
    // beside anything — it is one row — so writing the browser's would silently replace the
    // account's locale, currency, accent, privacy mode and fiscal year start.
    const user = await migratingUser();
    user.app.db
      .insert(appSettings)
      .values({ locale: 'en-GB', userId: user.session.id } as never)
      .run();
    const tables = { ...localDatabase(), appSettings: [{ locale: 'nl-BE' }] };

    const merged = await migrate(user, tables, 'merge');

    expect(rowsOf(user, appSettings)[0]?.['locale']).toBe('en-GB');
    expect(merged.body.reused['appSettings']).toBe(1);

    const replaced = await migrate(user, tables, 'replace');

    expect(rowsOf(user, appSettings)[0]?.['locale']).toBe('nl-BE');
    expect(replaced.body.migrated['appSettings']).toBe(1);
  });

  it('keeps the rows already in the account on merge', async () => {
    const user = await migratingUser();
    await migrate(user, localDatabase(), 'merge');

    expect(rowsOf(user, accounts).map(({ name }) => name)).toContain('Server Checking');
  });

  it('erases them on replace', async () => {
    const user = await migratingUser();
    await migrate(user, localDatabase(), 'replace');

    expect(rowsOf(user, accounts).map(({ name }) => name)).not.toContain('Server Checking');
    expect(rowsOf(user, accounts)).toHaveLength(2);
  });

  it('keeps the stored salary row for a month the account already has, and says the browser’s was displaced', async () => {
    const user = await migratingUser();
    user.app.db
      .insert(salaryMetadata)
      .values({ yearMonth: '2025-03', grossWage: 1, userId: user.session.id } as never)
      .run();

    const { status, body } = await migrate(user);

    expect(status).toBe(200);
    // Counted apart from `reused`: a reused category is the same category, but this is the user's
    // own gross wage for that month being dropped in favour of the stored one, and the two must not
    // read as the same outcome in the report.
    expect(body.displaced['salaryMetadata']).toBe(1);
    expect(body.reused['salaryMetadata']).toBe(0);
    expect(rowsOf(user, salaryMetadata)).toHaveLength(1);
    expect(rowsOf(user, salaryMetadata)[0]?.['grossWage']).toBe(1);
  });
});

/* --------------------------------------------------------------------------------------------
 * References the local database could not honour either
 * ------------------------------------------------------------------------------------------ */

describe('migrate-local: references that do not resolve', () => {
  it('drops a row whose required reference is not in the document', async () => {
    const user = await migratingUser();
    const tables = localDatabase();
    tables['accounts'] = [account(1, 'Local Checking')];

    const { body } = await migrate(user, tables);

    // Two of the three transactions and the import batch name account 2, which is now absent.
    expect(body.skipped['transactions']).toBe(1);
    expect(body.skipped['importBatches']).toBe(1);
    // And the transfer, whose second leg went with it.
    expect(body.skipped['transfers']).toBe(1);
    expect(rowsOf(user, transfers)).toHaveLength(0);
  });

  it('clears an optional reference whose row is not in the document, and counts it', async () => {
    const user = await migratingUser();
    const tables = localDatabase();
    tables['categories'] = [category(2, 'Salary', { kind: 'income' })];

    const { body } = await migrate(user, tables);

    const out = rowWhere(rowsOf(user, transactions), 'rawDescription', 'Transfer out');
    expect(out['categoryId']).toBeNull();
    expect(body.clearedReferences).toBeGreaterThan(0);
  });

  it('drops a rule rather than let an account condition match the wrong account', async () => {
    const user = await migratingUser();
    const tables = localDatabase();
    tables['accounts'] = [account(1, 'Local Checking')];

    const { body } = await migrate(user, tables);

    expect(body.skipped['rules']).toBe(1);
    expect(rowsOf(user, rules)).toHaveLength(0);
  });

  it('drops a rule whose category is not in the document', async () => {
    const user = await migratingUser();
    const tables = localDatabase();
    tables['categories'] = [];

    const { body } = await migrate(user, tables);

    expect(body.skipped['rules']).toBe(1);
    expect(body.skipped['loans']).toBe(1);
  });
});

/* --------------------------------------------------------------------------------------------
 * The edges
 * ------------------------------------------------------------------------------------------ */

describe('migrate-local: edges', () => {
  it('writes nothing for an empty document', async () => {
    const user = await migratingUser();
    const before = rowCounts(user);

    const { status, body } = await migrate(user, {});

    expect(status).toBe(200);
    expect(rowCounts(user)).toEqual(before);
    expect(Object.values(body.migrated).every((count) => count === 0)).toBe(true);
  });

  it('refuses a document from a newer schema than this server knows', async () => {
    const { app, session } = await migratingUser();
    const { status, body } = await apiJson<{ error: string }>(app, PATH, {
      as: session,
      method: 'POST',
      body: { mode: 'merge', data: { schemaVersion: 99, tables: {} } },
    });

    expect(status).toBe(400);
    expect(body.error).toContain('newer database schema');
  });

  it('ignores a table this schema no longer has', async () => {
    const user = await migratingUser();
    const { status } = await migrate(user, { ...localDatabase(), retiredTable: [{ id: 1 }] });
    expect(status).toBe(200);
  });

  it('never touches another account', async () => {
    const user = await migratingUser();
    const bob = await signInAs(user.app, 'bob');
    user.app.db
      .insert(accounts)
      .values({ ...account(1, "Bob's account"), id: undefined, userId: bob.id } as never)
      .run();

    await migrate(user);

    const bobRows = allRowsOf(user.app, accounts).filter((row) => row['userId'] === bob.id);
    expect(bobRows).toHaveLength(1);
    expect(bobRows[0]?.['name']).toBe("Bob's account");
  });

  it('accepts a body well over the app-wide 10 MB JSON limit', async () => {
    const user = await migratingUser();
    const tables = localDatabase();
    // ~12 MB of `rawLine`, which is exactly the field a decade of real imports is heavy with.
    tables['transactions'] = [transaction(1, { rawLine: 'x'.repeat(12_000_000) })];
    tables['transfers'] = [];

    const { status } = await migrate(user, tables);

    expect(status).toBe(200);
    expect(rowsOf(user, transactions).some((row) => row['rawLine'] !== null)).toBe(true);
  });
});

/* --------------------------------------------------------------------------------------------
 * What the account already holds
 * ------------------------------------------------------------------------------------------ */

describe('migrate-local: what the account already holds', () => {
  it('reports a freshly seeded account as having no data of its own', async () => {
    const app = await startTestAppWithDb({ seed: true });
    const session = await signInAs(app, 'alice');
    app.db
      .insert(categories)
      .values(
        DEFAULT_CATEGORIES.map(({ id: _id, ...rest }) => ({
          ...rest,
          userId: session.id,
        })) as never,
      )
      .run();

    const { status, body } = await apiJson<MigrationState>(app, PATH, { as: session });

    expect(status).toBe(200);
    expect(body.hasExistingData).toBe(false);
    expect(body.counts['categories']).toBe(DEFAULT_CATEGORIES.length);
  });

  it('reports an account with rows of its own as having data', async () => {
    const { app, session } = await migratingUser();
    const { body } = await apiJson<MigrationState>(app, PATH, { as: session });

    expect(body.hasExistingData).toBe(true);
    expect(body.counts['transactions']).toBe(1);
  });

  it('answers 401 without a session', async () => {
    const { app } = await migratingUser();
    const { status } = await apiJson(app, PATH);
    expect(status).toBe(401);
  });
});
