import { eq } from 'drizzle-orm';
import { readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { abortOn, apiFetch, apiJson, type TestApp, type TestSession } from '../app.testing.js';
import { JSON_BODY_LIMIT } from '../app.js';
import { rules } from '../schema/rules.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import { DATA_SCHEMA_VERSION } from './data.js';
import { startTwoUserApp, transactionBody } from './samples.testing.js';

/**
 * `GET /api/data/export`, `POST /api/data/import` and `DELETE /api/data` (TICKET-SRV-04) — the three
 * whole-dataset operations, each over the signed-in user's rows only.
 *
 * An import is two requests since TICKET-SRV-11 — the document is staged to disk, then applied — so
 * `importAs` below drives both, and every case written against the single-request shape still reads
 * the same. The staging endpoint's own cases are in the last two `describe`s; the size ceiling it
 * enforces is asserted in `http/staged-upload.spec.ts`, at a limit a test can afford to exceed.
 *
 * The isolation cases matter more here than anywhere else in the API: these endpoints are the one
 * place a request means "every table", so a missing `where userId = ?` would hand one household's
 * finances to another rather than merely leaking one row.
 */

type Row = { id: number } & Record<string, unknown>;

type Document = {
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Row[]>;
};

const exportAs = (app: TestApp, as: TestSession): Promise<{ status: number; body: Document }> =>
  apiJson<Document>(app, '/api/data/export', { as });

/** `POST /import/staged` on its own: the document's bytes, as `application/octet-stream`. */
const stageAs = (
  app: TestApp,
  as: TestSession,
  document: string,
): Promise<{ status: number; body: { uploadId: string; error?: string } }> =>
  apiJson<{ uploadId: string; error?: string }>(app, '/api/data/import/staged', {
    as,
    method: 'POST',
    binary: new TextEncoder().encode(document),
  });

/** `POST /import` on its own: a mode and the id of something already staged. */
const applyAs = (
  app: TestApp,
  as: TestSession,
  body: unknown,
): Promise<{ status: number; body: { error?: string } }> =>
  apiJson<{ error?: string }>(app, '/api/data/import', { as, method: 'POST', body });

/**
 * The two requests one import takes, so a case that only cares what the import *did* reads as one
 * call. Staging is asserted here rather than returned: a case below that wants to drive the two
 * endpoints apart uses `stageAs` and `applyAs` directly.
 */
const importAs = async (
  app: TestApp,
  as: TestSession,
  { mode, data }: { mode: unknown; data: unknown },
): Promise<{ status: number; body: { error?: string } }> => {
  const staged = await stageAs(app, as, JSON.stringify(data));
  expect(staged.status, 'staging the document').toBe(201);

  return applyAs(app, as, { mode, uploadId: staged.body.uploadId });
};

/** A well-formed id that was never staged, for the cases that need one. */
const UNSTAGED_UPLOAD_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

const addTransaction = (app: TestApp, as: TestSession, accountId: number) =>
  apiJson<Row>(app, '/api/transactions', {
    as,
    method: 'POST',
    body: transactionBody(accountId, { rawDescription: 'Exported' }),
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

  /**
   * Ids are unique per table across every account, so a backup restored into another account
   * collides on every row. TICKET-SRV-12 took the other account's rows over; TICKET-SRV-14 writes
   * the importer's copies under fresh ids and rewrites every reference to them — foreign keys, soft
   * references and the ids inside a rule's JSON — so both accounts end up with a whole dataset.
   */
  it("renumbers rows whose ids another account holds, and leaves that account's rows alone", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const { accountId, categoryId, transactionIds } = bob.fixtures;
    const transferId = app.db
      .insert(transfers)
      .values({
        userId: bob.session.id,
        fromTransactionId: transactionIds[0],
        toTransactionId: transactionIds[1],
        method: 'manual',
        confidence: 'high',
        linkedAt: '2026-03-02T09:00:00.000Z',
      })
      .returning({ id: transfers.id })
      .get().id;
    app.db
      .update(transactions)
      .set({ transferId, categoryId })
      .where(eq(transactions.userId, bob.session.id))
      .run();
    app.db
      .insert(rules)
      .values({
        userId: bob.session.id,
        name: 'Bob rule',
        priority: 1,
        enabled: true,
        continueOnMatch: false,
        conditions: [{ field: 'accountId', operator: 'equals', value: accountId }],
        action: { setCategoryId: categoryId },
      })
      .run();
    const theirBackup = (await exportAs(app, bob.session)).body;

    const imported = await importAs(app, alice.session, { mode: 'merge', data: theirBackup });
    expect(imported.status).toBe(204);

    // Bob keeps everything he had, under the same ids.
    expect(
      (await apiJson<Row>(app, `/api/accounts/${accountId}`, { as: bob.session })).body['name'],
    ).toBe('Checking');
    expect((await apiJson<Row[]>(app, '/api/rules', { as: bob.session })).body).toHaveLength(1);
    expect(
      (await apiJson<Row[]>(app, '/api/transactions', { as: bob.session })).body.map((t) => [
        t.id,
        t['categoryId'],
        t['transferId'],
      ]),
    ).toEqual(transactionIds.map((id) => [id, categoryId, transferId]));

    // Alice gets her own copies, and every reference among them points at her copies.
    const account = (await apiJson<Row[]>(app, '/api/accounts', { as: alice.session })).body.find(
      (row) => row.id !== alice.fixtures.accountId,
    )!;
    const category = (
      await apiJson<Row[]>(app, '/api/categories', { as: alice.session })
    ).body.find((row) => row.id !== alice.fixtures.categoryId)!;
    const transfer = (await apiJson<Row[]>(app, '/api/transfers', { as: alice.session })).body[0]!;
    const copied = (
      await apiJson<Row[]>(app, '/api/transactions', { as: alice.session })
    ).body.filter((row) => row['accountId'] === account.id);
    const [rule] = (await apiJson<Row[]>(app, '/api/rules', { as: alice.session })).body;

    expect(account.id).not.toBe(accountId);
    expect(category.id).not.toBe(categoryId);
    expect(transfer.id).not.toBe(transferId);
    expect(copied).toHaveLength(2);
    expect(copied.map((row) => [row['categoryId'], row['transferId']])).toEqual([
      [category.id, transfer.id],
      [category.id, transfer.id],
    ]);
    expect([transfer['fromTransactionId'], transfer['toTransactionId']]).toEqual(
      copied.map((row) => row.id),
    );
    expect(rule!['action']).toEqual({ setCategoryId: category.id });
    expect(rule!['conditions']).toEqual([
      { field: 'accountId', operator: 'equals', value: account.id },
    ]);
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

  it('accepts import batches and profiles still naming a since-deleted account', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    const goneAccountId = 999_999;
    const batch = {
      id: 999_999,
      accountId: goneAccountId,
      fileName: 'old.csv',
      importedAt: '2026-03-02T09:00:00.000Z',
      rowsRead: 1,
      rowsAdded: 1,
      rowsDuplicate: 0,
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    };
    const profiles = (backup.tables['mappingProfiles'] ?? []).map((profile) => ({
      ...profile,
      defaultAccountId: goneAccountId,
    }));

    const restored = await importAs(app, alice.session, {
      mode: 'replace',
      data: {
        ...backup,
        tables: { ...backup.tables, importBatches: [batch], mappingProfiles: profiles },
      },
    });

    expect(restored.status).toBe(204);
    expect(
      (await apiJson<Row[]>(app, '/api/importBatches', { as: alice.session })).body,
    ).toHaveLength(1);
  });

  it("accepts a batch naming a deleted account whose id is now another user's", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    const batch = {
      id: 999_999,
      accountId: bob.fixtures.accountId,
      fileName: 'old.csv',
      importedAt: '2026-03-02T09:00:00.000Z',
      rowsRead: 1,
      rowsAdded: 1,
      rowsDuplicate: 0,
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    };

    const restored = await importAs(app, alice.session, {
      mode: 'replace',
      data: { ...backup, tables: { ...backup.tables, importBatches: [batch] } },
    });

    expect(restored.status).toBe(204);
    // bob keeps his account: the batch only carries its id, it does not take it over.
    expect(
      (await apiJson<Row[]>(app, '/api/accounts', { as: bob.session })).body.map((a) => a.id),
    ).toContain(bob.fixtures.accountId);
  });

  it('drops a transfer whose legs are not in the backup, as the pre-v3 app left behind', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    const orphan = {
      id: 999_999,
      fromTransactionId: 999_998,
      toTransactionId: 999_999,
      method: 'auto-amountdate',
      confidence: 'medium',
      linkedAt: '2026-07-05T20:44:18.337Z',
    };

    const restored = await importAs(app, alice.session, {
      mode: 'replace',
      data: {
        ...backup,
        tables: {
          ...backup.tables,
          transfers: [...(backup.tables['transfers'] ?? []), orphan],
        },
      },
    });

    expect(restored.status).toBe(204);
    const kept = await apiJson<Row[]>(app, '/api/transfers', { as: alice.session });
    expect(kept.body.map((row) => row.id)).not.toContain(orphan.id);
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

describe('POST /api/data/import/staged', () => {
  it('accepts a document larger than the app-wide JSON body limit', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;

    // Pinned to the constant rather than to "10mb": if the app-wide ceiling ever moves, this should
    // be re-read rather than quietly stop proving anything.
    expect(JSON_BODY_LIMIT).toBe('10mb');
    const padding = 'x'.repeat(11 * 1024 * 1024);
    const first = backup.tables['transactions']![0]!;
    first['rawLine'] = padding;

    const restored = await importAs(app, alice.session, { mode: 'replace', data: backup });

    expect(restored.status).toBe(204);
    const rows = await apiJson<Row[]>(app, '/api/transactions', { as: alice.session });
    expect(rows.body.find((row) => row.id === first.id)?.['rawLine']).toHaveLength(padding.length);
  });

  it('requires a session, like every other route on this router', async () => {
    const { app } = await startTwoUserApp();

    const response = await apiFetch(app, '/api/data/import/staged', {
      method: 'POST',
      binary: new TextEncoder().encode('{}'),
    });

    expect(response.status).toBe(401);
    expect(await readdir(app.stagedImportDir)).toEqual([]);
  });

  it('leaves no staged file behind once the import has been applied', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;

    expect((await importAs(app, alice.session, { mode: 'merge', data: backup })).status).toBe(204);

    expect(await readdir(app.stagedImportDir)).toEqual([]);
  });

  it('leaves no staged file behind when the import fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    abortOn(app, 'INSERT', 'transactions');

    expect((await importAs(app, alice.session, { mode: 'replace', data: backup })).status).toBe(
      500,
    );

    // An upload is consumed by the attempt, not by its success — otherwise a rejected document
    // would sit in the data directory until the sweep got to it.
    expect(await readdir(app.stagedImportDir)).toEqual([]);
  });
});

describe('POST /api/data/import — the staged document', () => {
  it('refuses an upload staged by another account', async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const staged = await stageAs(
      app,
      alice.session,
      JSON.stringify((await exportAs(app, alice.session)).body),
    );

    const stolen = await applyAs(app, bob.session, {
      mode: 'merge',
      uploadId: staged.body.uploadId,
    });

    // A 404 rather than a 403, and worded so it does not confirm the id is real for somebody else
    // (the rule TICKET-SRV-03 set).
    expect(stolen.status).toBe(404);
    // Alice's upload is still hers to apply, so a request from Bob cannot consume it either.
    expect(
      (await applyAs(app, alice.session, { mode: 'merge', uploadId: staged.body.uploadId })).status,
    ).toBe(204);
  });

  it('refuses an id that was never staged, and one that is not an id at all', async () => {
    const { app, alice } = await startTwoUserApp();

    expect(
      (await applyAs(app, alice.session, { mode: 'merge', uploadId: UNSTAGED_UPLOAD_ID })).status,
    ).toBe(404);
    for (const uploadId of ['../../money-mosaic.sqlite', '', 17, null]) {
      expect(
        (await applyAs(app, alice.session, { mode: 'merge', uploadId })).status,
        String(uploadId),
      ).toBe(404);
    }
  });

  it('cannot apply the same upload twice', async () => {
    const { app, alice } = await startTwoUserApp();
    const backup = (await exportAs(app, alice.session)).body;
    const staged = await stageAs(app, alice.session, JSON.stringify(backup));

    const first = await applyAs(app, alice.session, {
      mode: 'merge',
      uploadId: staged.body.uploadId,
    });
    const second = await applyAs(app, alice.session, {
      mode: 'merge',
      uploadId: staged.body.uploadId,
    });

    expect(first.status).toBe(204);
    expect(second.status).toBe(404);
  });

  it('rejects a staged file that is not JSON at all', async () => {
    const { app, alice } = await startTwoUserApp();
    // What someone uploads when they pick the wrong file: a bank CSV instead of a backup.
    const staged = await stageAs(app, alice.session, 'date;amount;description');

    const applied = await applyAs(app, alice.session, {
      mode: 'merge',
      uploadId: staged.body.uploadId,
    });

    expect(applied.status).toBe(400);
    expect(applied.body.error).toContain('not valid JSON');
  });

  it('rejects valid JSON that is not a backup document', async () => {
    const { app, alice } = await startTwoUserApp();
    const staged = await stageAs(app, alice.session, JSON.stringify({ hello: 'world' }));

    const applied = await applyAs(app, alice.session, {
      mode: 'merge',
      uploadId: staged.body.uploadId,
    });

    expect(applied.status).toBe(400);
    expect(applied.body.error).toContain('schemaVersion');
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
