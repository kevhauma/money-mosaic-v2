import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import { createApiRouters } from './api.js';
import { ENTITY_SAMPLES, startTwoUserApp } from './samples.testing.js';

/**
 * Promises about the API as a whole (TICKET-SRV-03, extended by TICKET-SRV-04).
 *
 * 1. **Every repository method has an endpoint.** The repository layer is the seam TICKET-SRV-05
 *    swaps, so a method with nowhere to send its call is a migration that cannot finish. The
 *    repository side of the checklist is *read out of the source files* rather than listed here,
 *    so a method added later fails this spec instead of being discovered by TICKET-SRV-05.
 * 2. **Every multi-table operation has one too.** The four services in `OPERATION_FILES` are the
 *    ones that opened a Dexie transaction across tables, which is precisely what a per-table REST
 *    API cannot express; TICKET-SRV-04 gives each of their methods a single endpoint, and this is
 *    the list of which.
 * 3. **Every router answers 401 without a session** — checked per router rather than for one
 *    sample route, since the middleware is mounted per router and a missed mount is invisible
 *    from anywhere else.
 *
 * The client sources are read as **files, not imports**: the TICKET-SRV-01 ESLint guard forbids the
 * backend importing from `src/app/`, and an import would drag Angular and Dexie into a Node test.
 */

const CORE_DIR = fileURLToPath(new URL('../../../src/app/core/', import.meta.url));
const DATA_ACCESS_DIR = `${CORE_DIR}data-access/`;

/**
 * The services that opened an `appDb.transaction('rw', [...])` spanning tables — the nine write
 * paths TICKET-SRV-04 moves behind one endpoint each. Listed by file because they live one per
 * feature folder rather than in a single directory, so a rename fails this spec on the read.
 */
const OPERATION_FILES: readonly string[] = [
  'import/import.service.ts',
  'transactions/transaction-deletion.service.ts',
  'transfers/transfer-linking.service.ts',
  'accounts/account-deletion.service.ts',
];

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
    add: ['POST', '/api/transfers'],
    // `getByIds` is gone too: its only caller was `TransferCleanupService`, deleted with `remove`
    // below, and the surface spec pinning it was the only thing keeping it alive.
    // `remove` is gone (TICKET-SRV-05). `DELETE /api/transfers/1` still exists, but it removes the
    // `Transfer` row and leaves both legs' `transferId` stamped — the orphan state TICKET-SRV-04
    // exists to prevent, where `POST /api/transfers/:id/unlink` is the one that cleans up. The
    // method's only caller was `TransferCleanupService`, whose whole body is server-side now, so it
    // was deleted rather than ported into a trap. This map is compared to the repository's real
    // methods in both directions, so an entry here would fail rather than document anything.
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
    // `bulkRemove` is gone for the same reason as `TransfersRepository.remove` above
    // (TICKET-SRV-05): `DELETE /api/transactions/bulk` deletes rows without the transfer cleanup,
    // so a surviving leg would keep a `transferId` pointing at a transfer that cascaded away.
    // `POST /api/transactions/delete` is the one with the cleanup, and
    // `TransactionDeletionService.removeMany` — the method's only caller — is what calls it.
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
  DataManagementRepository: {
    exportAll: ['GET', '/api/data/export'],
    importAll: ['POST', '/api/data/import'],
    deleteAll: ['DELETE', '/api/data'],
  },
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

/**
 * Service method -> the endpoint it will call once TICKET-SRV-05 rewires its body (TICKET-SRV-04).
 *
 * `previewImport` is the odd one out, deliberately: it is pure arithmetic over one read the list
 * endpoint already answers, and the point of the duplicate preview is that it decides sameness with
 * the same code the commit does — client-side in both cases.
 */
const OPERATIONS: Record<string, Record<string, Endpoint>> = {
  ImportService: {
    previewImport: ['GET', '/api/transactions?accountId=1'],
    commitImport: ['POST', '/api/import/commit'],
    previewUndo: ['GET', '/api/import/1/undo-preview'],
    undoImport: ['POST', '/api/import/1/undo'],
  },
  TransactionDeletionService: {
    removeMany: ['POST', '/api/transactions/delete'],
  },
  TransferLinkingService: {
    linkManually: ['POST', '/api/transfers/link'],
    linkAuto: ['POST', '/api/transfers/link'],
    linkAutoBatch: ['POST', '/api/transfers/link/batch'],
    unlink: ['POST', '/api/transfers/1/unlink'],
  },
  AccountDeletionService: {
    clearTransactions: ['POST', '/api/accounts/1/transactions/delete'],
    deleteAccount: ['DELETE', '/api/accounts/1'],
  },
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
      .map((source) => [/export class (\w+)/.exec(source)?.[1] ?? '', methodsOf(source)]),
  );

/** The same reading, for the four operation services. */
const operationMethods = (): Record<string, string[]> =>
  Object.fromEntries(
    OPERATION_FILES.map((name) => fs.readFileSync(`${CORE_DIR}${name}`, 'utf8')).map((source) => [
      /export class (\w+)/.exec(source)?.[1] ?? '',
      methodsOf(source),
    ]),
  );

describe('every repository method has an endpoint', () => {
  const methods = repositoryMethods();

  it('finds every repository in the folder', () => {
    expect(Object.keys(methods)).toHaveLength(18);
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

    for (const [className, mapped] of [
      ...Object.entries(ENDPOINTS),
      ...Object.entries(OPERATIONS),
    ]) {
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

describe('every multi-table operation has an endpoint', () => {
  const methods = operationMethods();

  it('finds the four services TICKET-SRV-04 moves', () => {
    expect(Object.keys(OPERATIONS).sort()).toEqual(Object.keys(methods).sort());
  });

  it.each(Object.entries(OPERATIONS))('%s', (className, mapped) => {
    // Both directions, as above: a public method with no endpoint fails, and so does an entry for a
    // method that no longer exists.
    expect(Object.keys(mapped).sort()).toEqual([...(methods[className] ?? [])].sort());
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
      // The settings singletons, the binary model artifact, the two operation-only routers
      // (`/api/import`, `/api/data`) and the admin panel's account management (`/api/admin/users`,
      // whose rows are accounts rather than the caller's own data — TICKET-AUTH-03) have specs of
      // their own; everything else is an entity router and has to appear in `ENTITY_SAMPLES`.
      .filter(
        (path) =>
          !path.startsWith('/api/settings/') &&
          !['/api/categoryModel', '/api/import', '/api/data', '/api/admin/users'].includes(path),
      );

    expect(ENTITY_SAMPLES.map(({ path }) => path).sort()).toEqual(entityPaths.sort());
  });
});
