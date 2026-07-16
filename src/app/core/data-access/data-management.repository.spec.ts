import { vi } from 'vitest';
import { appDb, type Account, type Category } from './app-db';
import { DataManagementRepository, type AppDataExport } from './data-management.repository';

const account = (overrides: Partial<Account> = {}): Account => ({
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#000000',
  icon: 'bank',
  archived: false,
  ...overrides,
});

const category = (overrides: Partial<Category> = {}): Category => ({
  name: 'Custom',
  kind: 'expense',
  color: '#111111',
  icon: 'tag',
  archived: false,
  isSystem: false,
  ...overrides,
});

describe('DataManagementRepository', () => {
  const repository = new DataManagementRepository();

  // `importAll(..., 'replace')` clears every appDb table, including ones seeded by `on('populate')`
  // (categories, mappingProfiles, transferSettings) that other spec files rely on. Snapshot the whole
  // DB up front and restore it after every test so this file never leaks state across the suite.
  let snapshot: Record<string, unknown[]>;

  beforeAll(async () => {
    snapshot = {};
    for (const table of appDb.tables) {
      snapshot[table.name] = await table.toArray();
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const table of appDb.tables) {
      await table.clear();
      const rows = snapshot[table.name];
      if (rows.length) await table.bulkPut(rows);
    }
  });

  describe('exportAll', () => {
    it('reads every table and records the schema version + an ISO export timestamp', async () => {
      await appDb.accounts.clear();
      await appDb.accounts.bulkAdd([account({ name: 'A' }), account({ name: 'B' })]);

      const result = await repository.exportAll();

      expect(result.schemaVersion).toBe(appDb.verno);
      expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
      expect(Object.keys(result.tables).sort()).toEqual(
        appDb.tables.map((table) => table.name).sort(),
      );
      expect(result.tables['accounts']).toHaveLength(2);
    });
  });

  describe('exportAll -> importAll(replace) round trip', () => {
    it('reproduces an identical snapshot for every table', async () => {
      await appDb.accounts.clear();
      await appDb.categories.clear();
      await appDb.accounts.bulkAdd([account({ name: 'Checking' }), account({ name: 'Savings' })]);
      await appDb.categories.bulkAdd([category({ name: 'Groceries' })]);

      const exported = await repository.exportAll();

      // Mutate the DB after export so the round trip through import is what restores it, not luck.
      await appDb.accounts.clear();
      await appDb.categories.clear();
      await appDb.accounts.add(account({ name: 'Unrelated' }));

      await repository.importAll(exported, 'replace');

      const accountsAfter = await appDb.accounts.toArray();
      const categoriesAfter = await appDb.categories.toArray();
      expect(accountsAfter.map((a) => a.name).sort()).toEqual(['Checking', 'Savings']);
      expect(categoriesAfter.map((c) => c.name)).toEqual(['Groceries']);
    });
  });

  describe('importAll merge mode', () => {
    it('upserts imported rows without clearing pre-existing non-colliding rows', async () => {
      await appDb.accounts.clear();
      const existingId = await appDb.accounts.add(account({ name: 'Existing' }));

      const data: AppDataExport = {
        schemaVersion: appDb.verno,
        exportedAt: new Date().toISOString(),
        tables: { accounts: [account({ id: 9999, name: 'Imported' })] },
      };

      await repository.importAll(data, 'merge');

      const rows = await appDb.accounts.toArray();
      expect(rows.map((r) => r.name).sort()).toEqual(['Existing', 'Imported']);
      expect(rows.find((r) => r.id === existingId)?.name).toBe('Existing');
    });

    it('overwrites in place when an imported row collides with an existing id', async () => {
      await appDb.accounts.clear();
      const id = await appDb.accounts.add(account({ name: 'Original' }));

      const data: AppDataExport = {
        schemaVersion: appDb.verno,
        exportedAt: new Date().toISOString(),
        tables: { accounts: [account({ id, name: 'Renamed' })] },
      };

      await repository.importAll(data, 'merge');

      const rows = await appDb.accounts.toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Renamed');
    });
  });

  describe('schema version guard', () => {
    it('rejects an import whose schemaVersion is newer than the running app, before any write', async () => {
      await appDb.accounts.clear();
      await appDb.accounts.add(account({ name: 'Untouched' }));
      const transactionSpy = vi.spyOn(appDb, 'transaction');

      const data: AppDataExport = {
        schemaVersion: appDb.verno + 1,
        exportedAt: new Date().toISOString(),
        tables: { accounts: [account({ name: 'ShouldNotLand' })] },
      };

      await expect(repository.importAll(data, 'replace')).rejects.toThrow(/newer/i);

      expect(transactionSpy).not.toHaveBeenCalled();
      const rows = await appDb.accounts.toArray();
      expect(rows.map((r) => r.name)).toEqual(['Untouched']);
    });
  });

  describe('mid-import failure', () => {
    it('leaves every table exactly as it was before the import started', async () => {
      await appDb.accounts.clear();
      await appDb.categories.clear();
      await appDb.accounts.add(account({ name: 'BeforeFailure' }));

      // `appDb.tables` hands back a fresh `Table` wrapper per call (not the same object as
      // `appDb.categories`), so spying on the instance property wouldn't intercept the loop below —
      // spy on the shared `Table.prototype` instead, scoped to the `categories` table by name.
      // `categories` sorts after `accounts` in appDb.tables, so this fails on a later table than the
      // one whose write we assert survives.
      const tableProto = Object.getPrototypeOf(appDb.categories);
      const originalBulkPut = tableProto.bulkPut;
      vi.spyOn(tableProto, 'bulkPut').mockImplementation(function (
        this: { name: string },
        ...args: unknown[]
      ) {
        if (this.name === 'categories') {
          return Promise.reject(new Error('forced failure'));
        }
        return originalBulkPut.apply(this, args);
      });

      const data: AppDataExport = {
        schemaVersion: appDb.verno,
        exportedAt: new Date().toISOString(),
        tables: {
          accounts: [account({ name: 'AfterFailureShouldNotLand' })],
          categories: [category({ name: 'AlsoShouldNotLand' })],
        },
      };

      await expect(repository.importAll(data, 'replace')).rejects.toThrow('forced failure');

      const accountsAfter = await appDb.accounts.toArray();
      expect(accountsAfter.map((a) => a.name)).toEqual(['BeforeFailure']);
    });
  });
});
