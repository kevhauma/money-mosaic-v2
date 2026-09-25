import { describe, expect, it } from 'vitest';

import { abortOn, apiFetch, apiJson, type TestApp, type TestSession } from '../app.testing.js';
import { startTwoUserApp, transactionBody } from './samples.testing.js';

/**
 * `POST /api/import/commit`, `POST /api/import/:batchId/undo` and its preview (TICKET-SRV-04).
 *
 * Two properties carry most of this file. **Atomicity**: each endpoint is forced to fail at its last
 * step — with a trigger, so the failure lands where no validation would have caught it — and nothing
 * may be written. **Cross-batch cleanup**: undoing an import has to repair a transfer that linked one
 * of its rows to a row from a *different* import, because FR-TRF-2 matches across the whole dataset;
 * that case is the reason undo spans three tables and it is tested on its own.
 */

type Row = { id: number } & Record<string, unknown>;

type CommitResult = {
  batch: Row;
  addedTransactions: Row[];
  duplicateCount: number;
  backfilledTransactions: { id: number; changes: Record<string, unknown> }[];
};

const batchBody = (accountId: number, overrides: Record<string, unknown> = {}) => ({
  accountId,
  fileName: 'march.csv',
  importedAt: '2026-03-02T09:00:00.000Z',
  rowsRead: 3,
  rowsAdded: 2,
  rowsDuplicate: 1,
  dateFrom: '2026-03-01',
  dateTo: '2026-03-31',
  ...overrides,
});

const commit = (
  app: TestApp,
  as: TestSession,
  body: Record<string, unknown>,
): Promise<{ status: number; body: CommitResult }> =>
  apiJson<CommitResult>(app, '/api/import/commit', { as, method: 'POST', body });

/** One committed batch of `rows` many transactions, for the undo cases. */
const commitRows = async (
  app: TestApp,
  as: TestSession,
  accountId: number,
  rows: number,
): Promise<CommitResult> => {
  const committed = await commit(app, as, {
    batch: batchBody(accountId, { rowsAdded: rows, rowsDuplicate: 0 }),
    transactions: Array.from({ length: rows }, () => transactionBody(accountId)),
  });
  expect(committed.status).toBe(201);
  return committed.body;
};

const transactionsOf = (app: TestApp, as: TestSession): Promise<{ status: number; body: Row[] }> =>
  apiJson<Row[]>(app, '/api/transactions', { as });

describe('POST /api/import/commit', () => {
  it('writes the batch and its rows, and answers in the shape commitImport returns', async () => {
    const { app, alice } = await startTwoUserApp();

    const { status, body } = await commit(app, alice.session, {
      batch: batchBody(alice.fixtures.accountId),
      transactions: [
        transactionBody(alice.fixtures.accountId, { rawDescription: 'One' }),
        transactionBody(alice.fixtures.accountId, { rawDescription: 'Two' }),
      ],
    });

    expect(status).toBe(201);
    expect(Object.keys(body).sort()).toEqual([
      'addedTransactions',
      'backfilledTransactions',
      'batch',
      'duplicateCount',
    ]);
    expect(body.batch['fileName']).toBe('march.csv');
    expect(body.duplicateCount).toBe(1);
    expect(body.backfilledTransactions).toEqual([]);

    // Every row carries the id of the batch created in the same transaction.
    expect(body.addedTransactions).toHaveLength(2);
    for (const added of body.addedTransactions) {
      expect(added['importBatchId']).toBe(body.batch.id);
      expect(added['userId']).toBeUndefined();
    }

    const stored = await apiJson<Row[]>(app, `/api/transactions?importBatchId=${body.batch.id}`, {
      as: alice.session,
    });
    expect(stored.body.map((row) => row['rawDescription']).sort()).toEqual(['One', 'Two']);
  });

  it('applies the rawLine/rawRow backfill to a row that already existed', async () => {
    const { app, alice } = await startTwoUserApp();
    const existing = alice.fixtures.transactionIds[0];

    const { body } = await commit(app, alice.session, {
      batch: batchBody(alice.fixtures.accountId, { rowsAdded: 0, rowsDuplicate: 1 }),
      transactions: [],
      backfill: [
        { id: existing, changes: { rawLine: 'raw;line', rawRow: { Date: '2026-03-01' } } },
      ],
    });

    expect(body.backfilledTransactions).toEqual([
      { id: existing, changes: { rawLine: 'raw;line', rawRow: { Date: '2026-03-01' } } },
    ]);

    const stored = await apiJson<Row>(app, `/api/transactions/${existing}`, { as: alice.session });
    expect(stored.body['rawLine']).toBe('raw;line');
  });

  it('rejects a row that names its own importBatchId, since this endpoint assigns it', async () => {
    const { app, alice } = await startTwoUserApp();

    const rejected = await apiJson<{ error: string }>(app, '/api/import/commit', {
      as: alice.session,
      method: 'POST',
      body: {
        batch: batchBody(alice.fixtures.accountId),
        transactions: [transactionBody(alice.fixtures.accountId, { importBatchId: 99 })],
      },
    });

    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toContain('importBatchId');
    expect((await apiJson<Row[]>(app, '/api/importBatches', { as: alice.session })).body).toEqual(
      [],
    );
  });

  it("refuses a batch naming another user's account, and writes nothing", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(app, '/api/import/commit', {
      as: alice.session,
      method: 'POST',
      body: {
        batch: batchBody(bob.fixtures.accountId),
        transactions: [transactionBody(bob.fixtures.accountId)],
      },
    });

    expect(rejected.status).toBe(404);
    expect((await apiJson<Row[]>(app, '/api/importBatches', { as: alice.session })).body).toEqual(
      [],
    );
  });

  it('rolls back the batch and every earlier row when a later row is malformed', async () => {
    const { app, alice } = await startTwoUserApp();
    const before = (await transactionsOf(app, alice.session)).body.length;

    const rejected = await apiJson<{ error: string }>(app, '/api/import/commit', {
      as: alice.session,
      method: 'POST',
      body: {
        batch: batchBody(alice.fixtures.accountId),
        transactions: [
          transactionBody(alice.fixtures.accountId),
          transactionBody(alice.fixtures.accountId, { amount: 'not a number' }),
        ],
      },
    });

    expect(rejected.status).toBe(400);
    // Named field *and* the position, so a four-hundred-row file is diagnosable.
    expect(rejected.body.error).toContain('amount');
    expect(rejected.body.error).toContain('item 1');

    expect((await apiJson<Row[]>(app, '/api/importBatches', { as: alice.session })).body).toEqual(
      [],
    );
    expect((await transactionsOf(app, alice.session)).body).toHaveLength(before);
  });

  it('writes nothing when the last step fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const before = (await transactionsOf(app, alice.session)).body.length;
    // The backfill is the commit's last write. A trigger fails it after the batch and the new rows
    // are already inserted, which is exactly the state one transaction is supposed to make invisible.
    abortOn(app, 'UPDATE', 'transactions');

    const failed = await apiFetch(app, '/api/import/commit', {
      as: alice.session,
      method: 'POST',
      body: {
        batch: batchBody(alice.fixtures.accountId),
        transactions: [transactionBody(alice.fixtures.accountId)],
        backfill: [{ id: alice.fixtures.transactionIds[0], changes: { rawLine: 'raw' } }],
      },
    });

    expect(failed.status).toBe(500);
    expect((await apiJson<Row[]>(app, '/api/importBatches', { as: alice.session })).body).toEqual(
      [],
    );
    expect((await transactionsOf(app, alice.session)).body).toHaveLength(before);
  });
});

describe('GET /api/import/:batchId/undo-preview', () => {
  it('counts the rows undo would remove, and what cannot be got back by re-importing', async () => {
    const { app, alice } = await startTwoUserApp();
    const committed = await commitRows(app, alice.session, alice.fixtures.accountId, 3);
    const [first, second] = committed.addedTransactions;

    await apiFetch(app, `/api/transactions/${first!.id}`, {
      as: alice.session,
      method: 'PATCH',
      body: { categoryId: alice.fixtures.categoryId, categoryManual: true },
    });
    await apiFetch(app, '/api/transfers/link', {
      as: alice.session,
      method: 'POST',
      body: {
        fromTransactionId: second!.id,
        toTransactionId: alice.fixtures.transactionIds[0],
        method: 'manual',
        confidence: 'manual',
      },
    });

    const preview = await apiJson<{
      rowCount: number;
      manuallyCategorisedCount: number;
      transferLinkedCount: number;
    }>(app, `/api/import/${committed.batch.id}/undo-preview`, { as: alice.session });

    expect(preview.body).toEqual({
      rowCount: 3,
      manuallyCategorisedCount: 1,
      transferLinkedCount: 1,
    });
  });

  it('cannot disagree with what the undo removes', async () => {
    const { app, alice } = await startTwoUserApp();
    const committed = await commitRows(app, alice.session, alice.fixtures.accountId, 4);
    const before = (await transactionsOf(app, alice.session)).body.length;

    const preview = await apiJson<{ rowCount: number }>(
      app,
      `/api/import/${committed.batch.id}/undo-preview`,
      { as: alice.session },
    );

    await apiFetch(app, `/api/import/${committed.batch.id}/undo`, {
      as: alice.session,
      method: 'POST',
    });

    const after = (await transactionsOf(app, alice.session)).body.length;
    expect(preview.body.rowCount).toBe(4);
    expect(before - after).toBe(preview.body.rowCount);
  });

  it('reports zeroes for a batch that was already undone', async () => {
    const { app, alice } = await startTwoUserApp();
    const committed = await commitRows(app, alice.session, alice.fixtures.accountId, 2);
    await apiFetch(app, `/api/import/${committed.batch.id}/undo`, {
      as: alice.session,
      method: 'POST',
    });

    const preview = await apiJson<{ rowCount: number }>(
      app,
      `/api/import/${committed.batch.id}/undo-preview`,
      { as: alice.session },
    );
    expect(preview.body.rowCount).toBe(0);
  });
});

describe('POST /api/import/:batchId/undo', () => {
  it('removes the batch and every row it created', async () => {
    const { app, alice } = await startTwoUserApp();
    const committed = await commitRows(app, alice.session, alice.fixtures.accountId, 2);

    const undone = await apiJson<{
      unlinkedTransferIds: number[];
      clearedTransferTransactionIds: number[];
    }>(app, `/api/import/${committed.batch.id}/undo`, { as: alice.session, method: 'POST' });

    expect(undone.status).toBe(200);
    expect(undone.body).toEqual({ unlinkedTransferIds: [], clearedTransferTransactionIds: [] });
    expect(
      (await apiFetch(app, `/api/importBatches/${committed.batch.id}`, { as: alice.session }))
        .status,
    ).toBe(404);
    expect(
      (
        await apiJson<Row[]>(app, `/api/transactions?importBatchId=${committed.batch.id}`, {
          as: alice.session,
        })
      ).body,
    ).toEqual([]);
  });

  it('cleans up a transfer that linked into a different batch (FR-TRF-2)', async () => {
    const { app, alice } = await startTwoUserApp();
    const undone = await commitRows(app, alice.session, alice.fixtures.accountId, 1);
    const kept = await commitRows(app, alice.session, alice.fixtures.accountId, 1);
    const doomedLeg = undone.addedTransactions[0]!;
    const survivingLeg = kept.addedTransactions[0]!;

    const link = await apiJson<Row>(app, '/api/transfers/link', {
      as: alice.session,
      method: 'POST',
      body: {
        fromTransactionId: doomedLeg.id,
        toTransactionId: survivingLeg.id,
        method: 'auto-iban',
        confidence: 'high',
      },
    });
    const transferId = (link.body['transfer'] as Row).id;

    const result = await apiJson<{
      unlinkedTransferIds: number[];
      clearedTransferTransactionIds: number[];
    }>(app, `/api/import/${undone.batch.id}/undo`, { as: alice.session, method: 'POST' });

    expect(result.body).toEqual({
      unlinkedTransferIds: [transferId],
      clearedTransferTransactionIds: [survivingLeg.id],
    });

    // The other batch's row survives, with no dangling link left on it.
    const surviving = await apiJson<Row>(app, `/api/transactions/${survivingLeg.id}`, {
      as: alice.session,
    });
    expect(surviving.status).toBe(200);
    expect(surviving.body['transferId']).toBeUndefined();
    expect(
      (await apiFetch(app, `/api/transfers/${transferId}`, { as: alice.session })).status,
    ).toBe(404);
  });

  it('is a no-op reporting zeroes when the batch was already undone', async () => {
    const { app, alice } = await startTwoUserApp();
    const committed = await commitRows(app, alice.session, alice.fixtures.accountId, 2);
    const path = `/api/import/${committed.batch.id}/undo`;

    await apiFetch(app, path, { as: alice.session, method: 'POST' });
    const second = await apiJson<{
      unlinkedTransferIds: number[];
      clearedTransferTransactionIds: number[];
    }>(app, path, { as: alice.session, method: 'POST' });

    expect(second.status).toBe(200);
    expect(second.body).toEqual({ unlinkedTransferIds: [], clearedTransferTransactionIds: [] });
  });

  it("does nothing to another user's batch", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const committed = await commitRows(app, alice.session, alice.fixtures.accountId, 2);

    const attempt = await apiJson<{ unlinkedTransferIds: number[] }>(
      app,
      `/api/import/${committed.batch.id}/undo`,
      { as: bob.session, method: 'POST' },
    );

    // The same zeroes a re-undo gets: every statement is user-scoped, so Bob's request finds nothing
    // to remove and learns nothing about whether the id exists.
    expect(attempt.status).toBe(200);
    expect(attempt.body.unlinkedTransferIds).toEqual([]);
    expect(
      (
        await apiJson<Row[]>(app, `/api/transactions?importBatchId=${committed.batch.id}`, {
          as: alice.session,
        })
      ).body,
    ).toHaveLength(2);
    expect(
      (await apiFetch(app, `/api/importBatches/${committed.batch.id}`, { as: alice.session }))
        .status,
    ).toBe(200);
  });

  it('writes nothing when the last step fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const committed = await commitRows(app, alice.session, alice.fixtures.accountId, 2);
    // Deleting the batch row is undo's last step; everything before it has already happened.
    abortOn(app, 'DELETE', 'importBatches');

    const failed = await apiFetch(app, `/api/import/${committed.batch.id}/undo`, {
      as: alice.session,
      method: 'POST',
    });

    expect(failed.status).toBe(500);
    expect(
      (
        await apiJson<Row[]>(app, `/api/transactions?importBatchId=${committed.batch.id}`, {
          as: alice.session,
        })
      ).body,
    ).toHaveLength(2);
  });
});
