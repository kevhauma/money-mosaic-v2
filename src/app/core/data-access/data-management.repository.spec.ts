import { TestBed } from '@angular/core/testing';
import { callApi, failApiCall, withApiTesting } from './api-client.testing';
import { DataManagementRepository, type AppDataExport } from './data-management.repository';

const document = (): AppDataExport => ({
  schemaVersion: 16,
  exportedAt: '2026-07-01T00:00:00.000Z',
  tables: { accounts: [{ id: 1, name: 'Checking' }], transactions: [] },
});

describe('DataManagementRepository', () => {
  withApiTesting();

  const repository = (): DataManagementRepository => TestBed.inject(DataManagementRepository);

  it('exportAll reads the whole-dataset export', async () => {
    expect(
      await callApi(
        () => repository().exportAll(),
        { method: 'GET', url: '/api/data/export' },
        document(),
      ),
    ).toEqual(document());
  });

  it.each(['replace', 'merge'] as const)(
    'importAll posts the document in %s mode',
    async (mode) => {
      await expect(
        callApi(() => repository().importAll(document(), mode), {
          method: 'POST',
          url: '/api/data/import',
          body: { mode, data: document() },
        }),
      ).resolves.toBeUndefined();
    },
  );

  /**
   * The `schemaVersion` guard moved to the side that now owns the schema (TICKET-SRV-04): it runs
   * before the transaction opens, so nothing is written, and its sentence is what the user is shown.
   */
  it('rejects a backup from a newer schema with the server sentence, having written nothing', async () => {
    const message = await failApiCall(
      () => repository().importAll({ ...document(), schemaVersion: 99 }, 'merge'),
      { method: 'POST', url: '/api/data/import' },
      {
        status: 400,
        body: {
          error:
            'This backup was created with a newer database schema (v99) than this server supports (v16). Update the server before importing.',
        },
      },
    );

    expect(message).toContain('newer database schema (v99)');
  });

  it('localMigrationState reads what the account already holds', async () => {
    const state = { counts: { transactions: 4 }, hasExistingData: true };

    expect(
      await callApi(
        () => repository().localMigrationState(),
        { method: 'GET', url: '/api/data/migrate-local' },
        state,
      ),
    ).toEqual(state);
  });

  /**
   * A different endpoint from `importAll`, deliberately, and the spec says so: the same document
   * goes to `/migrate-local`, where every id is reassigned rather than preserved (TICKET-SRV-07).
   */
  it('migrateLocalDatabase posts the browser database and resolves the report', async () => {
    const report = {
      migrated: { accounts: 2 },
      reused: { categories: 1 },
      skipped: {},
      clearedReferences: 0,
      categoryIds: { 1: 44 },
    };

    expect(
      await callApi(
        () => repository().migrateLocalDatabase(document(), 'merge'),
        {
          method: 'POST',
          url: '/api/data/migrate-local',
          body: { mode: 'merge', data: document() },
        },
        report,
      ),
    ).toEqual(report);
  });

  it('deleteAll clears the signed-in user rows', async () => {
    await expect(
      callApi(() => repository().deleteAll(), { method: 'DELETE', url: '/api/data' }),
    ).resolves.toBeUndefined();
  });
});
