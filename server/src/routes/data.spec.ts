import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { abortOn, apiFetch, apiJson, type TestApp, type TestSession } from '../app.testing.js';
import { DATA_SCHEMA_VERSION } from './data.js';
import { startTwoUserApp, transactionBody } from './samples.testing.js';

/**
 * `GET /api/data/export`, `POST /api/data/import` and `DELETE /api/data` (TICKET-SRV-04) — the three
 * whole-dataset operations, each over the signed-in user's rows only.
 *
 * The isolation cases matter more here than anywhere else in the API: these endpoints are the one
 * place a request means "every table", so a missing `where userId = ?` would hand one household's
 * finances to another rather than merely leaking one row.
 */

const APP_DB_FILE = fileURLToPath(
  new URL('../../../src/app/core/data-access/app-db.ts', import.meta.url),
);

type Row = { id: number } & Record<string, unknown>;

type Document = {
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Row[]>;
};

const exportAs = (app: TestApp, as: TestSession): Promise<{ status: number; body: Document }> =>
  apiJson<Document>(app, '/api/data/export', { as });

const importAs = (
  app: TestApp,
  as: TestSession,
  body: unknown,
): Promise<{ status: number; body: { error?: string } }> =>
  apiJson<{ error?: string }>(app, '/api/data/import', { as, method: 'POST', body });

const addTransaction = (app: TestApp, as: TestSession, accountId: number) =>
  apiJson<Row>(app, '/api/transactions', {
    as,
    method: 'POST',
    body: transactionBody(accountId, { rawDescription: 'Exported' }),
  });

describe('the schema version an export declares', () => {
  it("matches the Dexie schema this server's tables are a port of", () => {
    const source = fs.readFileSync(APP_DB_FILE, 'utf8');
    const versions = [...source.matchAll(/\.version\((\d+)\)/g)].map((match) => Number(match[1]));

    expect(versions.length).toBeGreaterThan(0);
    expect(DATA_SCHEMA_VERSION).toBe(Math.max(...versions));
  });
});

describe('GET /api/data/export', () => {
  it("returns only the signed-in user's rows, in both directions", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const mine = await addTransaction(app, alice.session, alice.fixtures.accountId);
    const theirs = await addTransaction(app, bob.session, bob.fixtures.accountId);

    const ours = await exportAs(app, alice.session);
    const yours = await exportAs(app, bob.session);

    expect(ours.status).toBe(200);
    const ourIds = ours.body.tables['transactions']!.map((row) => row.id);
    const yourIds = yours.body.tables['transactions']!.map((row) => row.id);

    expect(ourIds).toContain(mine.body.id);
    expect(ourIds).not.toContain(theirs.body.id);
    expect(yourIds).toContain(theirs.body.id);
    expect(yourIds).not.toContain(mine.body.id);

    expect(ours.body.tables['accounts']!.map((row) => row.id)).toEqual([alice.fixtures.accountId]);
  });

  it('carries every transportable table as a key, and no server-owned one', async () => {
    const { app, alice } = await startTwoUserApp();

    const { body } = await exportAs(app, alice.session);

    expect(body.schemaVersion).toBe(DATA_SCHEMA_VERSION);
    expect(body.exportedAt).toEqual(expect.any(String));
    expect(Object.keys(body.tables)).toContain('transactions');
    expect(Object.keys(body.tables)).toContain('appSettings');
    // `users`/`sessions` are the server's own, and the trained model has binary endpoints of its own.
    expect(Object.keys(body.tables)).not.toContain('users');
    expect(Object.keys(body.tables)).not.toContain('sessions');
    expect(Object.keys(body.tables)).not.toContain('categoryModel');
  });

  it('answers entity shapes: no userId, no nulls', async () => {
    const { app, alice } = await startTwoUserApp();

    const { body } = await exportAs(app, alice.session);
    const [account] = body.tables['accounts']!;

    expect(account!['userId']).toBeUndefined();
    // `iban` was never set, so it is absent rather than null — `'iban' in account` reads the same as
    // it did against IndexedDB.
    expect('iban' in account!).toBe(false);
  });
});

describe('POST /api/data/import', () => {
  it('restores an export of the same account, ids and all', async () => {
    const { app, alice } = await startTwoUserApp();
    const extra = await addTransaction(app, alice.session, alice.fixtures.accountId);
    const backup = (await exportAs(app, alice.session)).body;

    expect((await apiFetch(app, '/api/data', { as: alice.session, method: 'DELETE' })).status).toBe(
      204,
    );
    expect((await apiJson<Row[]>(app, '/api/transactions', { as: alice.session })).body).toEqual(
      [],
    );

    const restored = await importAs(app, alice.session, { mode: 'replace', data: backup });
    expect(restored.status).toBe(204);

    const after = await apiJson<Row[]>(app, '/api/transactions', { as: alice.session });
    // The same ids, which is what keeps `accountId`/`categoryId`/`transferId` pointing at the right
    // rows on the other side of a restore.
    expect(after.body.map((row) => row.id).sort()).toEqual(
      [...alice.fixtures.transactionIds, extra.body.id].sort(),
    );
    expect(
      (await apiJson<Row>(app, `/api/accounts/${alice.fixtures.accountId}`, { as: alice.session }))
        .status,
    ).toBe(200);
  });

  it('replaces, so a row absent from the backup is gone afterwards', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    const later = await addTransaction(app, alice.session, alice.fixtures.accountId);

    await importAs(app, alice.session, { mode: 'replace', data: backup });

    expect(
      (await apiFetch(app, `/api/transactions/${later.body.id}`, { as: alice.session })).status,
    ).toBe(404);
  });

  it('merges without clearing, updating the rows it carries', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    const later = await addTransaction(app, alice.session, alice.fixtures.accountId);

    backup.tables['accounts']![0]!['name'] = 'Renamed by restore';
    const merged = await importAs(app, alice.session, { mode: 'merge', data: backup });

    expect(merged.status).toBe(204);
    expect(
      (await apiFetch(app, `/api/transactions/${later.body.id}`, { as: alice.session })).status,
    ).toBe(200);
    expect(
      (await apiJson<Row>(app, `/api/accounts/${alice.fixtures.accountId}`, { as: alice.session }))
        .body['name'],
    ).toBe('Renamed by restore');
  });

  it('rejects a payload from a newer schema than the server, and writes nothing', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;

    const rejected = await importAs(app, alice.session, {
      mode: 'replace',
      data: {
        ...backup,
        schemaVersion: DATA_SCHEMA_VERSION + 1,
        tables: { accounts: [{ ...backup.tables['accounts']![0]!, name: 'From the future' }] },
      },
    });

    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toContain(`v${DATA_SCHEMA_VERSION + 1}`);
    // Nothing was cleared and nothing was written — the guard runs before the transaction opens.
    expect(
      (await apiJson<Row>(app, `/api/accounts/${alice.fixtures.accountId}`, { as: alice.session }))
        .body['name'],
    ).toBe('Checking');
    expect(
      (await apiJson<Row[]>(app, '/api/transactions', { as: alice.session })).body,
    ).toHaveLength(2);
  });

  it('rejects an unknown mode and a row without an id', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;

    const badMode = await importAs(app, alice.session, { mode: 'append', data: backup });
    expect(badMode.status).toBe(400);
    expect(badMode.body.error).toContain('mode');

    const noId = await importAs(app, alice.session, {
      mode: 'merge',
      data: {
        schemaVersion: DATA_SCHEMA_VERSION,
        tables: { accounts: [{ ...backup.tables['accounts']![0]!, id: undefined }] },
      },
    });
    expect(noId.status).toBe(400);
    expect(noId.body.error).toContain('no id');
  });

  it('refuses to overwrite a row whose id belongs to another account', async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const theirBackup = (await exportAs(app, bob.session)).body;

    const rejected = await importAs(app, alice.session, { mode: 'merge', data: theirBackup });

    expect(rejected.status).toBe(409);
    expect(rejected.body.error).toContain('another account');
    // Bob's rows are untouched, and Alice gained nothing.
    expect(
      (await apiJson<Row>(app, `/api/accounts/${bob.fixtures.accountId}`, { as: bob.session }))
        .body['name'],
    ).toBe('Checking');
    expect(
      (await apiFetch(app, `/api/accounts/${bob.fixtures.accountId}`, { as: alice.session }))
        .status,
    ).toBe(404);
  });

  it('rejects a document whose rows reference rows it does not contain', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;

    const rejected = await importAs(app, alice.session, {
      mode: 'replace',
      data: {
        schemaVersion: DATA_SCHEMA_VERSION,
        // The transactions, without the account they belong to.
        tables: { transactions: backup.tables['transactions'] },
      },
    });

    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toContain('transactions');
    expect(rejected.body.error).toContain('Nothing was imported');
    // `replace` had already cleared the tables inside the transaction; the rollback put them back.
    expect(
      (await apiJson<Row[]>(app, '/api/transactions', { as: alice.session })).body,
    ).toHaveLength(2);
  });

  it('writes nothing when a later table fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    // `transactions` is written well after `accounts`, so this fails the import halfway through.
    abortOn(app, 'INSERT', 'transactions');

    const failed = await importAs(app, alice.session, { mode: 'replace', data: backup });

    expect(failed.status).toBe(500);
    const accounts = await apiJson<Row[]>(app, '/api/accounts', { as: alice.session });
    expect(accounts.body.map((row) => row.id)).toEqual([alice.fixtures.accountId]);
    expect(
      (await apiJson<Row[]>(app, '/api/transactions', { as: alice.session })).body,
    ).toHaveLength(2);
  });
});

describe('DELETE /api/data', () => {
  it("clears the signed-in user's rows and leaves every other user's intact", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const cleared = await apiFetch(app, '/api/data', { as: alice.session, method: 'DELETE' });

    expect(cleared.status).toBe(204);
    for (const path of ['/api/accounts', '/api/categories', '/api/transactions']) {
      expect((await apiJson<Row[]>(app, path, { as: alice.session })).body, path).toEqual([]);
    }
    expect((await apiJson<Row[]>(app, '/api/accounts', { as: bob.session })).body).toHaveLength(1);
    expect((await apiJson<Row[]>(app, '/api/transactions', { as: bob.session })).body).toHaveLength(
      2,
    );
  });

  it('clears nothing when one of the tables fails', async () => {
    const { app, alice } = await startTwoUserApp();
    // `accounts` is cleared before `transactions`, so this fails the delete partway through.
    abortOn(app, 'DELETE', 'transactions');

    const failed = await apiFetch(app, '/api/data', { as: alice.session, method: 'DELETE' });

    expect(failed.status).toBe(500);
    expect((await apiJson<Row[]>(app, '/api/accounts', { as: alice.session })).body).toHaveLength(
      1,
    );
    expect(
      (await apiJson<Row[]>(app, '/api/transactions', { as: alice.session })).body,
    ).toHaveLength(2);
  });
});
