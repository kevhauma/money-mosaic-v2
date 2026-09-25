import type { Router } from 'express';

import type { DrizzleDb } from '../db.js';
import { accounts } from '../schema/accounts.js';
import { categories } from '../schema/categories.js';
import { importBatches } from '../schema/import-batches.js';
import { loans } from '../schema/loans.js';
import { mappingProfiles } from '../schema/mapping-profiles.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { rules } from '../schema/rules.js';
import { transfers } from '../schema/transfers.js';
import { createCategoryModelRouter } from './category-model.js';
import { createEntityRouter, type OwnedTable } from './entity-router.js';
import { createGoalsRouter } from './goals.js';
import { createSalaryMetadataRouter } from './salary-metadata.js';
import { createSettingsRouter, SETTINGS_TABLES } from './settings.js';
import { createTransactionsRouter } from './transactions.js';

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

/** The ten entities whose whole surface is the shared factory's four verbs. */
const UNIFORM_ENTITIES: readonly (readonly [string, OwnedTable])[] = [
  ['accounts', accounts],
  ['categories', categories],
  ['rules', rules],
  ['mappingProfiles', mappingProfiles],
  ['importBatches', importBatches],
  ['transfers', transfers],
  ['loans', loans],
  ['recurringOverrides', recurringOverrides],
];

export const createApiRouters = (db: DrizzleDb): ApiRouter[] => [
  ...UNIFORM_ENTITIES.map(([name, table]) => ({
    path: `/api/${name}`,
    router: createEntityRouter({ db, table }),
  })),
  { path: '/api/transactions', router: createTransactionsRouter(db) },
  { path: '/api/goals', router: createGoalsRouter(db) },
  { path: '/api/salaryMetadata', router: createSalaryMetadataRouter(db) },
  { path: '/api/categoryModel', router: createCategoryModelRouter(db) },
  ...SETTINGS_TABLES.map((settings) => ({
    path: `/api/settings/${settings.name}`,
    router: createSettingsRouter(db, settings),
  })),
];
