import { appDb, type CategoryModelArtifact } from '@/core/data-access/app-db';
import {
  deleteLocalDatabase,
  localDatabaseExists,
  readLocalDatabase,
  readLocalDatabaseSummary,
} from './local-database';

/**
 * The reader TICKET-SRV-07 migrates through, against a real (fake-indexeddb) browser database.
 *
 * The load-bearing test here is the first one: **asking whether a database exists must not create
 * one.** `indexedDB.open` does, and a detection built on it would turn "this browser has nothing to
 * migrate" into a permanent offer to migrate an empty database that the detection itself wrote.
 */

const account = {
  name: 'Checking',
  type: 'checking' as const,
  currency: 'EUR' as const,
  openingBalance: 0,
  openingBalanceDate: '2024-01-01',
  color: '#0ea5e9',
  icon: 'bank',
  archived: false,
};

const transaction = (bookingDate: string) => ({
  accountId: 1,
  bookingDate,
  amount: -10,
  currency: 'EUR' as const,
  rawDescription: `Row ${bookingDate}`,
  fingerprint: `fp-${bookingDate}`,
  createdAt: '2025-01-01T00:00:00.000Z',
});

const artifact = (): CategoryModelArtifact => ({
  id: 1,
  modelTopology: new Uint8Array([1, 2, 3]).buffer,
  weightSpecs: new Uint8Array([4, 5]).buffer,
  weightData: new Uint8Array([6]).buffer,
  categoryIdByIndex: [1, 2],
  featureConfig: { dim: 8, charNgramMin: 3, charNgramMax: 5 },
  taxonomySignature: 'sig',
  metrics: { accuracy: 0.9, trainedSampleCount: 10 },
  trainedAt: '2025-01-01T00:00:00.000Z',
  schemaVersion: 1,
});

describe('local-database: detection', () => {
  beforeEach(async () => {
    await deleteLocalDatabase();
  });

  it('answers "nothing here" without creating a database', async () => {
    expect(await readLocalDatabaseSummary()).toBeNull();
    // The half that matters: the question left the browser exactly as it found it.
    expect(await localDatabaseExists()).toBe(false);
  });

  it('answers "nothing here" for a database holding only its first-run seed', async () => {
    // Opening it runs Dexie's `on('populate')`, so this is the state a browser is in if the app was
    // ever loaded and nothing was ever imported.
    await appDb.open();
    expect(await appDb.categories.count()).toBeGreaterThan(0);

    expect(await readLocalDatabaseSummary()).toBeNull();
  });

  it('reports real counts and the date range once there is data', async () => {
    await appDb.open();
    await appDb.accounts.add(account);
    await appDb.transactions.bulkAdd([transaction('2025-01-05'), transaction('2025-06-30')]);
    await appDb.categoryModel.put(artifact());

    expect(await readLocalDatabaseSummary()).toMatchObject({
      accounts: 1,
      transactions: 2,
      earliestBookingDate: '2025-01-05',
      latestBookingDate: '2025-06-30',
      hasTrainedModel: true,
    });
  });
});

describe('local-database: reading it', () => {
  beforeEach(async () => {
    await deleteLocalDatabase();
    await appDb.open();
    await appDb.accounts.add(account);
    await appDb.transactions.add(transaction('2025-01-05'));
  });

  it('reads every table except the model, at the schema version Dexie upgraded it to', async () => {
    const { data } = await readLocalDatabase();

    expect(data.schemaVersion).toBe(16);
    expect(data.tables['accounts']).toHaveLength(1);
    expect(data.tables['transactions']).toHaveLength(1);
    // Every table is carried, generically, including the ones nobody thinks about.
    expect(Object.keys(data.tables)).toContain('recurringOverrides');
    expect(Object.keys(data.tables)).not.toContain('categoryModel');
  });

  it('carries the trained model beside the document, with its buffers intact', async () => {
    await appDb.categoryModel.put(artifact());

    const { model } = await readLocalDatabase();

    expect(model?.categoryIdByIndex).toEqual([1, 2]);
    // The whole reason it travels outside the JSON document (TICKET-DAT-05's closing note).
    expect(new Uint8Array(model!.modelTopology)).toEqual(new Uint8Array([1, 2, 3]));
    expect(JSON.parse(JSON.stringify({ buffer: model!.modelTopology })).buffer).toEqual({});
  });

  it('is absent again once deleted', async () => {
    await deleteLocalDatabase();

    expect(await localDatabaseExists()).toBe(false);
  });
});
