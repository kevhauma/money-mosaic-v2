import { signInAs, startTestAppWithDb, type TestApp, type TestSession } from '../app.testing.js';
import type { DrizzleDb } from '../db.js';
import { accounts } from '../schema/accounts.js';
import { categories } from '../schema/categories.js';
import { importBatches } from '../schema/import-batches.js';
import { loans } from '../schema/loans.js';
import { mappingProfiles } from '../schema/mapping-profiles.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { rules } from '../schema/rules.js';
import { salaryMetadata } from '../schema/salary-metadata.js';
import { savingsGoals } from '../schema/savings-goals.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import type { OwnedTable } from './entity-router.js';

/**
 * A valid row, a valid patch and the rows it depends on — for **every** entity endpoint
 * (TICKET-SRV-03).
 *
 * The isolation rules this ticket is really about ("user B cannot read, update or delete user A's
 * rows") have to hold for every table, not for a convenient sample of them, and a spec that names
 * three entities proves nothing about the eleventh. So the bodies live here once and the specs
 * iterate them; `api.spec.ts` additionally asserts that this list covers every mounted entity
 * router, which is what stops a table added later from quietly going untested.
 */

/** Rows every sample can point at, created per user before the entity bodies are built. */
export type EntityFixtures = {
  readonly accountId: number;
  readonly categoryId: number;
  /** Two of them, because a transfer links two legs. */
  readonly transactionIds: readonly [number, number];
};

export type EntitySample = {
  /** Mount path under `/api`, matching `createApiRouters`. */
  readonly path: string;
  readonly table: OwnedTable;
  /** A body `POST /` accepts, referencing only rows the same user owns. */
  readonly create: (fixtures: EntityFixtures) => Record<string, unknown>;
  /** A body `PATCH /:id` accepts, and the field it changes. */
  readonly patch: Record<string, unknown>;
};

const ACCOUNT = {
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 100,
  openingBalanceDate: '2026-01-01',
  color: '#0ea5e9',
  icon: 'bank',
  archived: false,
};

const CATEGORY = {
  name: 'Groceries',
  kind: 'expense',
  color: '#16a34a',
  icon: 'cart',
  archived: false,
  isSystem: false,
};

/** A transaction body, given the account it belongs to. `fingerprint` is the dedup key. */
export const transactionBody = (
  accountId: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  accountId,
  bookingDate: '2026-03-01',
  amount: -12.5,
  currency: 'EUR',
  rawDescription: 'Supermarket',
  fingerprint: `fp-${Math.random()}`,
  createdAt: '2026-03-01T10:00:00.000Z',
  ...overrides,
});

/** The prerequisite rows for one user: an account, a category and two transactions. */
export const seedFixtures = (db: DrizzleDb, userId: number): EntityFixtures => {
  const accountId = db
    .insert(accounts)
    .values({ ...ACCOUNT, type: 'checking', currency: 'EUR', userId })
    .returning({ id: accounts.id })
    .get().id;

  const categoryId = db
    .insert(categories)
    .values({ ...CATEGORY, kind: 'expense', userId })
    .returning({ id: categories.id })
    .get().id;

  const transactionIds = ([0, 1] as const).map(
    (index) =>
      db
        .insert(transactions)
        .values({
          accountId,
          bookingDate: `2026-03-0${index + 1}`,
          amount: index === 0 ? -50 : 50,
          currency: 'EUR',
          rawDescription: `Leg ${index}`,
          fingerprint: `seed-${userId}-${index}`,
          createdAt: '2026-03-01T10:00:00.000Z',
          userId,
        })
        .returning({ id: transactions.id })
        .get().id,
  ) as [number, number];

  return { accountId, categoryId, transactionIds };
};

export const ENTITY_SAMPLES: readonly EntitySample[] = [
  {
    path: '/api/accounts',
    table: accounts,
    create: () => ({ ...ACCOUNT, name: 'Savings' }),
    patch: { name: 'Renamed' },
  },
  {
    path: '/api/categories',
    table: categories,
    create: () => ({ ...CATEGORY, name: 'Transport' }),
    patch: { name: 'Renamed' },
  },
  {
    path: '/api/rules',
    table: rules,
    create: ({ categoryId }) => ({
      name: 'Supermarket',
      priority: 1,
      enabled: true,
      continueOnMatch: false,
      conditionMatch: 'all',
      conditions: [{ field: 'description', operator: 'contains', value: 'SUPER' }],
      action: { setCategoryId: categoryId },
    }),
    patch: { enabled: false },
  },
  {
    path: '/api/mappingProfiles',
    table: mappingProfiles,
    create: () => ({
      name: 'My bank',
      delimiter: ';',
      decimalSeparator: ',',
      dateFormat: 'DD/MM/YYYY',
      encoding: 'utf-8',
      headerRows: 1,
      signConvention: 'as-is',
      columns: { date: 'Date', description: 'Description', amount: 'Amount' },
    }),
    patch: { headerRows: 2 },
  },
  {
    path: '/api/importBatches',
    table: importBatches,
    create: ({ accountId }) => ({
      accountId,
      fileName: 'march.csv',
      importedAt: '2026-03-02T09:00:00.000Z',
      rowsRead: 10,
      rowsAdded: 9,
      rowsDuplicate: 1,
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    }),
    patch: { fileName: 'renamed.csv' },
  },
  {
    path: '/api/transfers',
    table: transfers,
    create: ({ transactionIds }) => ({
      fromTransactionId: transactionIds[0],
      toTransactionId: transactionIds[1],
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-03-02T09:00:00.000Z',
    }),
    patch: { confidence: 'high' },
  },
  {
    path: '/api/loans',
    table: loans,
    create: ({ categoryId }) => ({
      name: 'Car',
      loanType: 'auto',
      principal: 12000,
      interestRate: 3.5,
      termMonths: 60,
      startDate: '2026-01-01',
      categoryId,
      archived: false,
      sortOrder: 0,
    }),
    patch: { name: 'Second car' },
  },
  {
    path: '/api/recurringOverrides',
    table: recurringOverrides,
    create: ({ transactionIds }) => ({
      kind: 'dismissed',
      anchorTransactionId: transactionIds[0],
      createdAt: '2026-03-02T09:00:00.000Z',
    }),
    patch: { kind: 'merged' },
  },
  {
    path: '/api/transactions',
    table: transactions,
    create: ({ accountId }) => transactionBody(accountId),
    patch: { notes: 'Checked' },
  },
  {
    path: '/api/goals',
    table: savingsGoals,
    create: () => ({
      name: 'New bike',
      targetAmount: 1200,
      archived: false,
      createdAt: '2026-03-01T10:00:00.000Z',
    }),
    patch: { targetAmount: 1500 },
  },
  {
    path: '/api/salaryMetadata',
    table: salaryMetadata,
    create: () => ({ yearMonth: '2026-03', grossWage: 4200 }),
    patch: { note: 'Includes overtime' },
  },
];

/** A signed-in user together with the rows their bodies may reference. */
export type TestActor = {
  readonly session: TestSession;
  readonly fixtures: EntityFixtures;
};

export type TwoUserApp = {
  readonly app: TestApp;
  readonly alice: TestActor;
  readonly bob: TestActor;
};

/**
 * The setup every isolation test starts from: one app, two signed-in users, each with their own
 * account, category and transactions. Deliberately **not** seeded with the first-boot admin — an
 * empty database makes "this list contains only my rows" an exact assertion rather than a filter.
 */
export const startTwoUserApp = async (): Promise<TwoUserApp> => {
  const app = await startTestAppWithDb({ seed: false });
  const actor = async (email: string): Promise<TestActor> => {
    const session = await signInAs(app, email);
    return { session, fixtures: seedFixtures(app.db, session.id) };
  };

  return { app, alice: await actor('alice'), bob: await actor('bob') };
};
