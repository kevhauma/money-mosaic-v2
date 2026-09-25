import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import { createApiRouters } from './api.js';
import { ENTITY_SAMPLES, startTwoUserApp } from './samples.testing.js';

/**
 * Two promises about the API as a whole (TICKET-SRV-03).
 *
 * 1. **Every repository method has an endpoint.** The repository layer is the seam TICKET-SRV-05
 *    swaps, so a method with nowhere to send its call is a migration that cannot finish. The
 *    repository side of the checklist is *read out of the source files* rather than listed here,
 *    so a method added later fails this spec instead of being discovered by TICKET-SRV-05.
 * 2. **Every router answers 401 without a session** — checked per router rather than for one
 *    sample route, since the middleware is mounted per router and a missed mount is invisible
 *    from anywhere else.
 *
 * The repositories are read as **files, not imports**: the TICKET-SRV-01 ESLint guard forbids the
 * backend importing from `src/app/`, and an import would drag Angular and Dexie into a Node test.
 */

const DATA_ACCESS_DIR = fileURLToPath(
  new URL('../../../src/app/core/data-access/', import.meta.url),
);

/**
 * `exportAll`/`importAll`/`deleteAll` iterate every table at once. They are the transport for
 * TICKET-SRV-07's migration and land with the other multi-table operations in TICKET-SRV-04 —
 * deliberately out of scope here, per this ticket's Notes.
 */
const DEFERRED_REPOSITORIES = new Set(['DataManagementRepository']);

type Endpoint = readonly [method: string, path: string];

/** `get` plus "every setter patches the same row" — the shape of all six settings repositories. */
const settingsRepository = (
  path: string,
  setters: readonly string[],
): Record<string, Endpoint> => ({
  get: ['GET', path],
  ...Object.fromEntries(setters.map((setter) => [setter, ['PATCH', path] as Endpoint])),
});

/** The four verbs every uniform entity has, as one repository's worth of entries. */
const uniformRepository = (path: string): Record<string, Endpoint> => ({
  getAll: ['GET', path],
  add: ['POST', path],
  update: ['PATCH', `${path}/1`],
  remove: ['DELETE', `${path}/1`],
});

/** Repository method -> the endpoint it will call once TICKET-SRV-05 rewires it. */
const ENDPOINTS: Record<string, Record<string, Endpoint>> = {
  AccountsRepository: uniformRepository('/api/accounts'),
  CategoriesRepository: uniformRepository('/api/categories'),
  RulesRepository: uniformRepository('/api/rules'),
  LoansRepository: uniformRepository('/api/loans'),
  MappingProfilesRepository: {
    getAll: ['GET', '/api/mappingProfiles'],
    add: ['POST', '/api/mappingProfiles'],
    update: ['PATCH', '/api/mappingProfiles/1'],
  },
  ImportBatchesRepository: {
    getAll: ['GET', '/api/importBatches'],
    getById: ['GET', '/api/importBatches/1'],
    add: ['POST', '/api/importBatches'],
    remove: ['DELETE', '/api/importBatches/1'],
  },
  TransfersRepository: {
    getAll: ['GET', '/api/transfers'],
    getByIds: ['GET', '/api/transfers?ids=1,2'],
    add: ['POST', '/api/transfers'],
    remove: ['DELETE', '/api/transfers/1'],
  },
  RecurringOverridesRepository: {
    getAll: ['GET', '/api/recurringOverrides'],
    add: ['POST', '/api/recurringOverrides'],
    remove: ['DELETE', '/api/recurringOverrides/1'],
  },
  SalaryMetadataRepository: {
    getAll: ['GET', '/api/salaryMetadata'],
    upsert: ['PUT', '/api/salaryMetadata'],
    remove: ['DELETE', '/api/salaryMetadata/1'],
  },
  GoalsRepository: {
    ...uniformRepository('/api/goals'),
    bulkUpdateSortOrder: ['PATCH', '/api/goals/sort-order'],
  },
  TransactionsRepository: {
    getAll: ['GET', '/api/transactions'],
    count: ['GET', '/api/transactions/count'],
    getByAccount: ['GET', '/api/transactions?accountId=1'],
    getByImportBatch: ['GET', '/api/transactions?importBatchId=1'],
    getByReimbursementTransferId: ['GET', '/api/transactions?reimbursementTransferId=1'],
    update: ['PATCH', '/api/transactions/1'],
    bulkAdd: ['POST', '/api/transactions/bulk'],
    bulkUpdate: ['PATCH', '/api/transactions/bulk'],
    bulkRemove: ['DELETE', '/api/transactions/bulk'],
  },
  CategoryModelRepository: {
    get: ['GET', '/api/categoryModel'],
    save: ['PUT', '/api/categoryModel'],
    clear: ['DELETE', '/api/categoryModel'],
    getSettings: ['GET', '/api/settings/categoryModelSettings'],
    setTrainingWindowYears: ['PATCH', '/api/settings/categoryModelSettings'],
  },
  TransferSettingsRepository: {
    get: ['GET', '/api/settings/transferSettings'],
    update: ['PATCH', '/api/settings/transferSettings'],
  },
  CategoryComparisonSettingsRepository: settingsRepository(
    '/api/settings/categoryComparisonSettings',
    ['setExcludedCategoryIds'],
  ),
  DashboardLayoutSettingsRepository: settingsRepository('/api/settings/dashboardLayoutSettings', [
    'setRowOrder',
    'setHiddenRowIds',
  ]),
  ForecastSettingsRepository: settingsRepository('/api/settings/forecastSettings', [
    'setLookbackMonths',
    'setBasis',
    'setSafetyNetAmount',
    'setMode',
    'setScopeAccountIds',
  ]),
  AppSettingsRepository: settingsRepository('/api/settings/appSettings', [
    'setPrimaryColor',
    'setCurrencySymbol',
    'setCurrencySymbolPosition',
    'setLocale',
    'setExcludedIncomeCategoryIds',
    'setHeatmapExcludedCategoryIds',
    'setCareerStartDate',
    'setSmoothedBonusCategoryIds',
    'setGrossColor',
    'setMainIncomeCategoryId',
    'setPrivacyMode',
    'setFiscalYearStartMonth',
    'setRecentRanges',
  ]),
};

/** Every `name = (…) =>` member of the repository class in a file, in source order. */
const methodsOf = (source: string): string[] =>
  [...source.matchAll(/^ {2}(\w+) = /gm)].map((match) => match[1]!);

const repositoryMethods = (): Record<string, string[]> =>
  Object.fromEntries(
    fs
      .readdirSync(DATA_ACCESS_DIR)
      .filter((name) => name.endsWith('.repository.ts'))
      .map((name) => fs.readFileSync(`${DATA_ACCESS_DIR}${name}`, 'utf8'))
      .map((source) => [/export class (\w+)/.exec(source)?.[1] ?? '', methodsOf(source)])
      .filter(([className]) => !DEFERRED_REPOSITORIES.has(className as string)),
  );

describe('every repository method has an endpoint', () => {
  const methods = repositoryMethods();

  it('finds the seventeen repositories this ticket covers', () => {
    expect(Object.keys(methods)).toHaveLength(17);
    expect(Object.keys(ENDPOINTS).sort()).toEqual(Object.keys(methods).sort());
  });

  it.each(Object.entries(methods))('%s', (className, names) => {
    const mapped = ENDPOINTS[className] ?? {};
    // Both directions: a method with no route fails, and so does a route entry for a method that
    // no longer exists — a stale entry would quietly stop checking anything.
    expect(Object.keys(mapped).sort()).toEqual([...names].sort());
  });

  it('answers each of those endpoints with something other than "no such route"', async () => {
    const { app, alice } = await startTwoUserApp();

    for (const [className, mapped] of Object.entries(ENDPOINTS)) {
      for (const [name, [method, path]] of Object.entries(mapped)) {
        const response = await apiJson<{ error?: string }>(app, path, {
          as: alice.session,
          method,
        });

        // A route may well answer 400 (an empty create body) or 404 (id 1 is not this user's) —
        // what it must never answer is the app's own "there is no such endpoint".
        expect(response.body?.error ?? '', `${className}.${name} -> ${method} ${path}`).not.toMatch(
          /^No route for/,
        );
      }
    }
  });
});

describe('authentication', () => {
  it('answers 401 on every mounted router when there is no session', async () => {
    const { app } = await startTwoUserApp();

    for (const { path } of createApiRouters(app.db)) {
      const response = await apiFetch(app, path);
      expect(response.status, path).toBe(401);
    }
  });

  it('still answers 404 for an unknown /api path, rather than a misleading 401', async () => {
    const { app } = await startTwoUserApp();

    const response = await apiJson<{ error: string }>(app, '/api/nothing-here');
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('No route for');
  });
});

describe('test coverage of the registry itself', () => {
  it('has a sample body for every entity router', async () => {
    const { app } = await startTwoUserApp();

    const entityPaths = createApiRouters(app.db)
      .map(({ path }) => path)
      // The settings singletons and the binary model artifact have specs of their own; everything
      // else is an entity router and has to appear in `ENTITY_SAMPLES`.
      .filter((path) => !path.startsWith('/api/settings/') && path !== '/api/categoryModel');

    expect(ENTITY_SAMPLES.map(({ path }) => path).sort()).toEqual(entityPaths.sort());
  });
});
