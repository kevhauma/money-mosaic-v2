import { describe, expect, it } from 'vitest';

import { abortOn, apiFetch, apiJson, type TestApp, type TestSession } from '../app.testing.js';
import { startTwoUserApp, transactionBody, type EntityFixtures } from './samples.testing.js';

/**
 * `POST /api/transfers/link`, `/link/batch` and `POST /api/transfers/:id/unlink` (TICKET-SRV-04).
 *
 * A link is one fact written in two tables — the `Transfer` row and a `transferId` on each leg — so
 * every case here checks all three rows, and the atomicity cases check that a failure leaves all
 * three as they were. There is no half-linked shape a client could make sense of: a transaction
 * pointing at a transfer that does not exist reads, everywhere in the app, as a live link.
 */

type Row = { id: number } & Record<string, unknown>;

type LinkResult = {
  transfer: Row;
  updatedTransactions: [Row, Row];
};

const linkBody = (from: number, to: number, overrides: Record<string, unknown> = {}) => ({
  fromTransactionId: from,
  toTransactionId: to,
  method: 'manual',
  confidence: 'manual',
  ...overrides,
});

const link = (
  app: TestApp,
  as: TestSession,
  body: Record<string, unknown>,
): Promise<{ status: number; body: LinkResult }> =>
  apiJson<LinkResult>(app, '/api/transfers/link', { as, method: 'POST', body });

/** A fresh pair of legs, so a test never links rows another case already linked. */
const legs = async (
  app: TestApp,
  as: TestSession,
  fixtures: EntityFixtures,
  overrides: Record<string, unknown> = {},
): Promise<[number, number]> => {
  const created = await Promise.all(
    ['Out', 'In'].map((label) =>
      apiJson<Row>(app, '/api/transactions', {
        as,
        method: 'POST',
        body: transactionBody(fixtures.accountId, { rawDescription: label, ...overrides }),
      }),
    ),
  );
  return [created[0]!.body.id, created[1]!.body.id];
};

const transactionAt = (app: TestApp, as: TestSession, id: number): Promise<{ body: Row }> =>
  apiJson<Row>(app, `/api/transactions/${id}`, { as });

describe('POST /api/transfers/link', () => {
  it('writes the transfer and stamps both legs', async () => {
    const { app, alice } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures);

    const { status, body } = await link(app, alice.session, linkBody(from, to));

    expect(status).toBe(201);
    expect(body.transfer['fromTransactionId']).toBe(from);
    expect(body.transfer['linkedAt']).toEqual(expect.any(String));
    expect(body.updatedTransactions.map((leg) => leg.id)).toEqual([from, to]);

    for (const id of [from, to]) {
      expect((await transactionAt(app, alice.session, id)).body['transferId']).toBe(
        body.transfer.id,
      );
    }
  });

  it("clears both legs' category, since a transfer is neither spending nor income", async () => {
    const { app, alice } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures, {
      categoryId: alice.fixtures.categoryId,
      categoryManual: true,
    });

    const { body } = await link(app, alice.session, linkBody(from, to));

    for (const leg of body.updatedTransactions) {
      expect(leg['categoryId']).toBeUndefined();
      expect(leg['categoryManual']).toBeUndefined();
    }
    expect((await transactionAt(app, alice.session, from)).body['categoryId']).toBeUndefined();
  });

  it('honours an explicit linkedAt, so a whole auto pass shares one instant', async () => {
    const { app, alice } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures);

    const { body } = await link(
      app,
      alice.session,
      linkBody(from, to, {
        linkedAt: '2026-03-02T09:00:00.000Z',
        method: 'auto-iban',
        confidence: 'high',
      }),
    );

    expect(body.transfer['linkedAt']).toBe('2026-03-02T09:00:00.000Z');
    expect(body.transfer['method']).toBe('auto-iban');
  });

  it('refuses a leg belonging to another user, and writes nothing', async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(app, '/api/transfers/link', {
      as: alice.session,
      method: 'POST',
      body: linkBody(alice.fixtures.transactionIds[0], bob.fixtures.transactionIds[0]),
    });

    expect(rejected.status).toBe(404);
    expect((await apiJson<Row[]>(app, '/api/transfers', { as: alice.session })).body).toEqual([]);
    expect(
      (await transactionAt(app, alice.session, alice.fixtures.transactionIds[0])).body[
        'transferId'
      ],
    ).toBeUndefined();
  });

  it('writes nothing when the last step fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures);
    // Stamping the legs is the link's last step: the `Transfer` row already exists by then.
    abortOn(app, 'UPDATE', 'transactions');

    const failed = await apiFetch(app, '/api/transfers/link', {
      as: alice.session,
      method: 'POST',
      body: linkBody(from, to),
    });

    expect(failed.status).toBe(500);
    expect((await apiJson<Row[]>(app, '/api/transfers', { as: alice.session })).body).toEqual([]);
    expect((await transactionAt(app, alice.session, from)).body['transferId']).toBeUndefined();
  });
});

describe('POST /api/transfers/link/batch', () => {
  it('links a whole pass in one transaction', async () => {
    const { app, alice } = await startTwoUserApp();
    const first = await legs(app, alice.session, alice.fixtures);
    const second = await legs(app, alice.session, alice.fixtures);

    const linked = await apiJson<LinkResult[]>(app, '/api/transfers/link/batch', {
      as: alice.session,
      method: 'POST',
      body: [linkBody(...first), linkBody(...second)],
    });

    expect(linked.status).toBe(201);
    expect(linked.body).toHaveLength(2);
    expect((await apiJson<Row[]>(app, '/api/transfers', { as: alice.session })).body).toHaveLength(
      2,
    );
  });

  it('aborts the whole pass when one candidate fails, rather than half-linking it', async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const first = await legs(app, alice.session, alice.fixtures);

    const rejected = await apiFetch(app, '/api/transfers/link/batch', {
      as: alice.session,
      method: 'POST',
      body: [
        linkBody(...first),
        linkBody(alice.fixtures.transactionIds[0], bob.fixtures.transactionIds[0]),
      ],
    });

    expect(rejected.status).toBe(404);
    expect((await apiJson<Row[]>(app, '/api/transfers', { as: alice.session })).body).toEqual([]);
    expect((await transactionAt(app, alice.session, first[0])).body['transferId']).toBeUndefined();
  });
});

describe('POST /api/transfers/:id/unlink', () => {
  it('removes the transfer and clears both legs', async () => {
    const { app, alice } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures);
    const { body } = await link(app, alice.session, linkBody(from, to));

    const unlinked = await apiJson<{ clearedAttributionOverrides: unknown[] }>(
      app,
      `/api/transfers/${body.transfer.id}/unlink`,
      { as: alice.session, method: 'POST' },
    );

    expect(unlinked.status).toBe(200);
    expect(unlinked.body.clearedAttributionOverrides).toEqual([]);
    expect(
      (await apiFetch(app, `/api/transfers/${body.transfer.id}`, { as: alice.session })).status,
    ).toBe(404);
    for (const id of [from, to]) {
      expect((await transactionAt(app, alice.session, id)).body['transferId']).toBeUndefined();
    }
  });

  it('clears an attributionOverride that pointed at the transfer, and the column behind it', async () => {
    const { app, alice } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures);
    const { body } = await link(app, alice.session, linkBody(from, to));
    const transferId = body.transfer.id;

    const referring = await apiJson<Row>(app, '/api/transactions', {
      as: alice.session,
      method: 'POST',
      body: transactionBody(alice.fixtures.accountId, {
        attributionOverride: {
          mode: 'shared',
          jointAccountId: 7,
          reimbursementTransferId: transferId,
        },
      }),
    });

    const unlinked = await apiJson<{
      clearedAttributionOverrides: { id: number; attributionOverride: Record<string, unknown> }[];
    }>(app, `/api/transfers/${transferId}/unlink`, { as: alice.session, method: 'POST' });

    // Only the stale reference is dropped — mode and jointAccountId are the user's own choices.
    expect(unlinked.body.clearedAttributionOverrides).toEqual([
      { id: referring.body.id, attributionOverride: { mode: 'shared', jointAccountId: 7 } },
    ]);

    const stored = await transactionAt(app, alice.session, referring.body.id);
    expect(stored.body['attributionOverride']).toEqual({ mode: 'shared', jointAccountId: 7 });
    // The extracted column went with it, or the index seek would still find this row.
    expect(
      (
        await apiJson<Row[]>(app, `/api/transactions?reimbursementTransferId=${transferId}`, {
          as: alice.session,
        })
      ).body,
    ).toEqual([]);
  });

  it("answers 404 for another user's transfer and changes nothing", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures);
    const { body } = await link(app, alice.session, linkBody(from, to));

    const rejected = await apiFetch(app, `/api/transfers/${body.transfer.id}/unlink`, {
      as: bob.session,
      method: 'POST',
    });

    expect(rejected.status).toBe(404);
    expect(
      (await apiFetch(app, `/api/transfers/${body.transfer.id}`, { as: alice.session })).status,
    ).toBe(200);
    expect((await transactionAt(app, alice.session, from)).body['transferId']).toBe(
      body.transfer.id,
    );
  });

  it('writes nothing when the last step fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const [from, to] = await legs(app, alice.session, alice.fixtures);
    const { body } = await link(app, alice.session, linkBody(from, to));
    // Clearing the legs is the unlink's last `transactions` write (a dangling-override sweep follows it); the `Transfer` row is already gone by then.
    abortOn(app, 'UPDATE', 'transactions');

    const failed = await apiFetch(app, `/api/transfers/${body.transfer.id}/unlink`, {
      as: alice.session,
      method: 'POST',
    });

    expect(failed.status).toBe(500);
    expect(
      (await apiFetch(app, `/api/transfers/${body.transfer.id}`, { as: alice.session })).status,
    ).toBe(200);
    expect((await transactionAt(app, alice.session, from)).body['transferId']).toBe(
      body.transfer.id,
    );
  });
});
