import { describe, expect, it } from 'vitest';

import { abortOn, apiFetch, apiJson, type TestApp, type TestSession } from '../app.testing.js';
import { startTwoUserApp, transactionBody, type TwoUserApp } from './samples.testing.js';

/**
 * `DELETE /api/accounts/:id` and `POST /api/accounts/:id/transactions/delete` (TICKET-SRV-04) — the
 * two cascading writes behind `AccountDeletionService`.
 *
 * Foreign keys are on (`openDatabase` sets the pragma), so the cascade half of this is enforced by
 * SQLite and an incomplete cleanup fails these tests rather than passing quietly. The half SQLite
 * cannot do is the point: a transaction in *another* account that was linked to one of these keeps
 * its `transferId` unless something clears it, and FR-TRF-2 links across the whole dataset, so that
 * is not a rare case.
 */

type Row = { id: number } & Record<string, unknown>;

type CascadeResult = {
  removedTransactionIds: number[];
  unlinkedTransferIds: number[];
  clearedTransferTransactionIds: number[];
};

const ACCOUNT = {
  type: 'savings',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#0ea5e9',
  icon: 'bank',
  archived: false,
};

const addAccount = async (app: TestApp, as: TestSession, name: string): Promise<number> =>
  (await apiJson<Row>(app, '/api/accounts', { as, method: 'POST', body: { ...ACCOUNT, name } }))
    .body.id;

const addTransaction = async (app: TestApp, as: TestSession, accountId: number): Promise<number> =>
  (
    await apiJson<Row>(app, '/api/transactions', {
      as,
      method: 'POST',
      body: transactionBody(accountId),
    })
  ).body.id;

/**
 * One account whose single transaction is linked to a transaction in a second account — the
 * cross-account link a cascade has to repair rather than orphan.
 */
const linkedAcrossAccounts = async (app: TestApp, alice: TwoUserApp['alice']) => {
  const doomedAccount = await addAccount(app, alice.session, 'Doomed');
  const keptAccount = await addAccount(app, alice.session, 'Kept');
  const doomedLeg = await addTransaction(app, alice.session, doomedAccount);
  const survivingLeg = await addTransaction(app, alice.session, keptAccount);

  const linked = await apiJson<{ transfer: Row }>(app, '/api/transfers/link', {
    as: alice.session,
    method: 'POST',
    body: {
      fromTransactionId: doomedLeg,
      toTransactionId: survivingLeg,
      method: 'auto-iban',
      confidence: 'high',
    },
  });

  return {
    doomedAccount,
    doomedLeg,
    survivingLeg,
    transferId: linked.body.transfer.id,
  };
};

describe('DELETE /api/accounts/:id', () => {
  it('removes the account, its transactions, and every transfer that pointed at them', async () => {
    const { app, alice } = await startTwoUserApp();
    const { doomedAccount, doomedLeg, survivingLeg, transferId } = await linkedAcrossAccounts(
      app,
      alice,
    );

    const result = await apiJson<CascadeResult>(app, `/api/accounts/${doomedAccount}`, {
      as: alice.session,
      method: 'DELETE',
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      removedTransactionIds: [doomedLeg],
      unlinkedTransferIds: [transferId],
      clearedTransferTransactionIds: [survivingLeg],
    });

    expect(
      (await apiFetch(app, `/api/accounts/${doomedAccount}`, { as: alice.session })).status,
    ).toBe(404);
    expect(
      (await apiFetch(app, `/api/transactions/${doomedLeg}`, { as: alice.session })).status,
    ).toBe(404);
    expect(
      (await apiFetch(app, `/api/transfers/${transferId}`, { as: alice.session })).status,
    ).toBe(404);

    // The surviving transaction is in a different account and stays — with no orphan link on it.
    const surviving = await apiJson<Row>(app, `/api/transactions/${survivingLeg}`, {
      as: alice.session,
    });
    expect(surviving.status).toBe(200);
    expect(surviving.body['transferId']).toBeUndefined();
  });

  it("answers 404 for another user's account and removes nothing", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(app, `/api/accounts/${bob.fixtures.accountId}`, {
      as: alice.session,
      method: 'DELETE',
    });

    expect(rejected.status).toBe(404);
    expect(
      (await apiFetch(app, `/api/accounts/${bob.fixtures.accountId}`, { as: bob.session })).status,
    ).toBe(200);
    expect((await apiJson<Row[]>(app, '/api/transactions', { as: bob.session })).body).toHaveLength(
      2,
    );
  });

  it('writes nothing when the last step fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const { doomedAccount, doomedLeg, survivingLeg, transferId } = await linkedAcrossAccounts(
      app,
      alice,
    );
    // Removing the account row is the last step; its transactions and the transfer are already gone.
    abortOn(app, 'DELETE', 'accounts');

    const failed = await apiFetch(app, `/api/accounts/${doomedAccount}`, {
      as: alice.session,
      method: 'DELETE',
    });

    expect(failed.status).toBe(500);
    for (const path of [
      `/api/accounts/${doomedAccount}`,
      `/api/transactions/${doomedLeg}`,
      `/api/transfers/${transferId}`,
    ]) {
      expect((await apiFetch(app, path, { as: alice.session })).status, path).toBe(200);
    }
    expect(
      (await apiJson<Row>(app, `/api/transactions/${survivingLeg}`, { as: alice.session })).body[
        'transferId'
      ],
    ).toBe(transferId);
  });
});

describe('POST /api/accounts/:id/transactions/delete', () => {
  it('clears the transactions and their transfers, keeping the account row', async () => {
    const { app, alice } = await startTwoUserApp();
    const { doomedAccount, doomedLeg, survivingLeg, transferId } = await linkedAcrossAccounts(
      app,
      alice,
    );

    const result = await apiJson<CascadeResult>(
      app,
      `/api/accounts/${doomedAccount}/transactions/delete`,
      { as: alice.session, method: 'POST' },
    );

    expect(result.status).toBe(200);
    expect(result.body.removedTransactionIds).toEqual([doomedLeg]);
    expect(result.body.unlinkedTransferIds).toEqual([transferId]);

    // The account survives, so the user can re-import onto a clean slate (TICKET-ACC-01).
    expect(
      (await apiFetch(app, `/api/accounts/${doomedAccount}`, { as: alice.session })).status,
    ).toBe(200);
    expect(
      (
        await apiJson<Row[]>(app, `/api/transactions?accountId=${doomedAccount}`, {
          as: alice.session,
        })
      ).body,
    ).toEqual([]);
    expect(
      (await apiJson<Row>(app, `/api/transactions/${survivingLeg}`, { as: alice.session })).body[
        'transferId'
      ],
    ).toBeUndefined();
  });

  it("answers 404 for another user's account and removes nothing", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(
      app,
      `/api/accounts/${bob.fixtures.accountId}/transactions/delete`,
      { as: alice.session, method: 'POST' },
    );

    expect(rejected.status).toBe(404);
    expect((await apiJson<Row[]>(app, '/api/transactions', { as: bob.session })).body).toHaveLength(
      2,
    );
  });

  it('writes nothing when the last step fails', async () => {
    const { app, alice } = await startTwoUserApp();
    const { doomedAccount, doomedLeg, transferId } = await linkedAcrossAccounts(app, alice);
    // Deleting the transactions is the last step: the transfer has already been unpicked.
    abortOn(app, 'DELETE', 'transactions');

    const failed = await apiFetch(app, `/api/accounts/${doomedAccount}/transactions/delete`, {
      as: alice.session,
      method: 'POST',
    });

    expect(failed.status).toBe(500);
    expect(
      (await apiFetch(app, `/api/transactions/${doomedLeg}`, { as: alice.session })).status,
    ).toBe(200);
    expect(
      (await apiFetch(app, `/api/transfers/${transferId}`, { as: alice.session })).status,
    ).toBe(200);
  });
});
