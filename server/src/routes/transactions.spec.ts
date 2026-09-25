import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import { startTwoUserApp, transactionBody, type TwoUserApp } from './samples.testing.js';

/**
 * What `/api/transactions` has that no other entity does (TICKET-SRV-03): the extra reads as query
 * parameters, the count, and the three bulk writes — each of which has to be **all or nothing**.
 *
 * A half-applied import is the failure this is really about. The client would have no way to tell
 * which half landed, and the rows that did would collide by fingerprint with the retry.
 */

type Row = { id: number } & Record<string, unknown>;

const create = (app: TwoUserApp['app'], as: TwoUserApp['alice']['session'], body: unknown) =>
  apiJson<Row>(app, '/api/transactions', { as, method: 'POST', body });

const list = (app: TwoUserApp['app'], as: TwoUserApp['alice']['session'], query = '') =>
  apiJson<Row[]>(app, `/api/transactions${query}`, { as });

describe('reads', () => {
  it('filters the list by accountId', async () => {
    const { app, alice } = await startTwoUserApp();
    const other = await apiJson<Row>(app, '/api/accounts', {
      as: alice.session,
      method: 'POST',
      body: {
        name: 'Savings',
        type: 'savings',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#0ea5e9',
        icon: 'bank',
        archived: false,
      },
    });

    const mine = await create(app, alice.session, transactionBody(other.body.id));

    const filtered = await list(app, alice.session, `?accountId=${other.body.id}`);
    expect(filtered.body.map((row) => row.id)).toEqual([mine.body.id]);
  });

  it('filters the list by importBatchId', async () => {
    const { app, alice } = await startTwoUserApp();
    const batch = await apiJson<Row>(app, '/api/importBatches', {
      as: alice.session,
      method: 'POST',
      body: {
        accountId: alice.fixtures.accountId,
        fileName: 'march.csv',
        importedAt: '2026-03-02T09:00:00.000Z',
        rowsRead: 1,
        rowsAdded: 1,
        rowsDuplicate: 0,
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      },
    });

    const mine = await create(
      app,
      alice.session,
      transactionBody(alice.fixtures.accountId, { importBatchId: batch.body.id }),
    );

    const filtered = await list(app, alice.session, `?importBatchId=${batch.body.id}`);
    expect(filtered.body.map((row) => row.id)).toEqual([mine.body.id]);
  });

  it('extracts reimbursementTransferId out of the override so the lookup keeps its index', async () => {
    const { app, alice } = await startTwoUserApp();

    const mine = await create(
      app,
      alice.session,
      transactionBody(alice.fixtures.accountId, {
        attributionOverride: { mode: 'shared', reimbursementTransferId: 77 },
      }),
    );

    // Written from the nested value, and hidden from the response: it is a column, not a field of
    // `Transaction`.
    expect(mine.body['reimbursementTransferId']).toBeUndefined();

    const filtered = await list(app, alice.session, '?reimbursementTransferId=77');
    expect(filtered.body.map((row) => row.id)).toEqual([mine.body.id]);

    // Clearing the override clears the extracted copy with it.
    await apiFetch(app, `/api/transactions/${mine.body.id}`, {
      as: alice.session,
      method: 'PATCH',
      body: { attributionOverride: null },
    });
    expect((await list(app, alice.session, '?reimbursementTransferId=77')).body).toEqual([]);
  });

  it('counts only the signed-in user’s rows', async () => {
    const { app, alice, bob } = await startTwoUserApp();
    await create(app, bob.session, transactionBody(bob.fixtures.accountId));

    const counted = await apiJson<{ count: number }>(app, '/api/transactions/count', {
      as: alice.session,
    });

    // The two legs `seedFixtures` creates, and nothing of Bob's.
    expect(counted.body.count).toBe(2);
  });

  it('rejects a filter that is not an id rather than answering with every row', async () => {
    const { app, alice } = await startTwoUserApp();

    const response = await apiJson<{ error: string }>(app, '/api/transactions?accountId=nope', {
      as: alice.session,
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('accountId');
  });
});

describe('bulk writes run in one transaction', () => {
  it('creates a whole batch', async () => {
    const { app, alice } = await startTwoUserApp();

    const created = await apiJson<{ ids: number[] }>(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'POST',
      body: [1, 2, 3].map(() => transactionBody(alice.fixtures.accountId)),
    });

    expect(created.status).toBe(201);
    expect(created.body.ids).toHaveLength(3);
    expect((await list(app, alice.session)).body).toHaveLength(5);
  });

  it('applies none of a batch whose last row is malformed', async () => {
    const { app, alice } = await startTwoUserApp();

    const rejected = await apiJson<{ error: string }>(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'POST',
      body: [
        transactionBody(alice.fixtures.accountId),
        transactionBody(alice.fixtures.accountId),
        transactionBody(alice.fixtures.accountId, { amount: 'a lot' }),
      ],
    });

    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toBe('Invalid value for "amount": expected a number (item 2)');
    // The two good rows ahead of it went back with the transaction.
    expect((await list(app, alice.session)).body).toHaveLength(2);
  });

  it("applies none of a batch whose last row references another user's account", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'POST',
      body: [transactionBody(alice.fixtures.accountId), transactionBody(bob.fixtures.accountId)],
    });

    expect(rejected.status).toBe(404);
    expect((await list(app, alice.session)).body).toHaveLength(2);
  });

  it('updates a whole batch, or none of it', async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const [first, second] = alice.fixtures.transactionIds;
    const theirs = bob.fixtures.transactionIds[0];

    const updated = await apiJson<{ updated: number }>(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'PATCH',
      body: [
        { id: first, changes: { notes: 'one' } },
        { id: second, changes: { notes: 'two' } },
      ],
    });
    expect(updated.body.updated).toBe(2);

    const rejected = await apiFetch(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'PATCH',
      body: [
        { id: first, changes: { notes: 'rolled back' } },
        { id: theirs, changes: { notes: 'not mine' } },
      ],
    });
    expect(rejected.status).toBe(404);

    const after = await apiJson<Row>(app, `/api/transactions/${first}`, { as: alice.session });
    expect(after.body['notes']).toBe('one');
  });

  it('deletes a whole batch, or none of it', async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const [first, second] = alice.fixtures.transactionIds;

    const rejected = await apiFetch(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'DELETE',
      body: [first, bob.fixtures.transactionIds[0]],
    });
    expect(rejected.status).toBe(404);
    expect((await list(app, alice.session)).body).toHaveLength(2);

    const deleted = await apiFetch(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'DELETE',
      body: [first, second],
    });
    expect(deleted.status).toBe(204);
    expect((await list(app, alice.session)).body).toEqual([]);
  });

  it('rejects a bulk body that is not an array', async () => {
    const { app, alice } = await startTwoUserApp();

    const response = await apiJson<{ error: string }>(app, '/api/transactions/bulk', {
      as: alice.session,
      method: 'POST',
      body: { id: 1 },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Request body must be an array');
  });
});
