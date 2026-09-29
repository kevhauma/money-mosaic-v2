import type { Router } from 'express';

import type { DrizzleDb } from '../db.js';
import { importBatches } from '../schema/import-batches.js';
import { loans } from '../schema/loans.js';
import { mappingProfiles } from '../schema/mapping-profiles.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { rules } from '../schema/rules.js';
import { createAccountsRouter } from './accounts.js';
import { createAdminUsersRouter } from './admin-users.js';
import { createCategoriesRouter } from './categories.js';
import { createCategoryModelRouter } from './category-model.js';
import { createDataRouter } from './data.js';
import { createEntityRouter, type OwnedTable } from './entity-router.js';
import { createGoalsRouter } from './goals.js';
import { createImportRouter } from './import.js';
import { createSalaryMetadataRouter } from './salary-metadata.js';
import { createSettingsRouter, SETTINGS_TABLES } from './settings.js';
import { createTransactionsRouter } from './transactions.js';
import { createTransfersRouter } from './transfers.js';

/**
 * Every authenticated `/api` router, in one list (TICKET-SRV-03).
 *
 * `app.ts` mounts each of these behind `requireAuth` **individually** rather than blanket-mounting
 * the middleware on `/api`: a blanket mount would answer an unknown `/api` path with 401 instead of
 * a JSON 404, which reads as "your session expired" when the truth is "that endpoint does not
 * exist". The list is also what `api.spec.ts` enumerates, so a router added later is covered by the
 * 401 check without anyone remembering to add it there.
 *
 * Paths are the table's own name, camelCase and all — `/api/mappingProfiles`, not
 * `/api/mapping-profiles` — so the endpoint a repository talks to is spelled the way the entity is
 * spelled everywhere else in the codebase. `/api/goals` is the one exception the ticket names
 * explicitly, for `savingsGoals`.
 */
export type ApiRouter = {
  /** Mount path, including the `/api` prefix. */
  readonly path: string;
  readonly router: Router;
};

/**
 * The entities whose whole surface is the shared factory's four verbs.
 *
 * `accounts`, `categories`, `transfers` and `transactions` have each left this list for a router of
 * their own: every one of them carries an operation that spans more than one table, and a cascade,
 * a link or a refusal cannot be expressed as one row's worth of REST (TICKET-SRV-04).
 */
const UNIFORM_ENTITIES: readonly (readonly [string, OwnedTable])[] = [
  ['rules', rules],
  ['mappingProfiles', mappingProfiles],
  ['importBatches', importBatches],
  ['loans', loans],
  ['recurringOverrides', recurringOverrides],
];

export const createApiRouters = (db: DrizzleDb): ApiRouter[] => [
  ...UNIFORM_ENTITIES.map(([name, table]) => ({
    path: `/api/${name}`,
    router: createEntityRouter({ db, table }),
  })),
  { path: '/api/accounts', router: createAccountsRouter(db) },
  { path: '/api/categories', router: createCategoriesRouter(db) },
  { path: '/api/transactions', router: createTransactionsRouter(db) },
  { path: '/api/transfers', router: createTransfersRouter(db) },
  { path: '/api/import', router: createImportRouter(db) },
  { path: '/api/data', router: createDataRouter(db) },
  { path: '/api/goals', router: createGoalsRouter(db) },
  { path: '/api/salaryMetadata', router: createSalaryMetadataRouter(db) },
  { path: '/api/categoryModel', router: createCategoryModelRouter(db) },
  // The one router here whose rows are not the caller's own data (TICKET-AUTH-03). It is in this
  // list because it is an authenticated `/api` router like any other — `app.ts` mounts it behind
  // `requireAuth`, and `api.spec.ts`'s per-router 401 check covers it for free — and it adds
  // `requireAdmin` of its own on top.
  { path: '/api/admin/users', router: createAdminUsersRouter(db) },
  ...SETTINGS_TABLES.map((settings) => ({
    path: `/api/settings/${settings.name}`,
    router: createSettingsRouter(db, settings),
  })),
];
