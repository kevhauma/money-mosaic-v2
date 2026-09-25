import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import { startTwoUserApp, transactionBody, type EntityFixtures } from './samples.testing.js';

/**
 * **A write may not reference another user's row** (TICKET-SRV-03's first acceptance criterion).
 *
 * TICKET-SRV-02 left this deliberately unenforced in the schema — composite `(userId, parentId)`
 * foreign keys across eighteen tables were a bigger change than that ticket, and *reads* were never
 * at risk, since every query is user-scoped. The hole was on the way in: nothing stopped a
 * transaction owned by Alice naming Bob's account, and from then on Bob's account page would be
 * missing money that Alice's balance had.
 *
 * Every foreign key in the schema is covered below, and a mismatch is a **404** — a row the caller
 * does not own is a row that does not exist as far as they are concerned.
 */

type Body = (mine: EntityFixtures, theirs: EntityFixtures) => Record<string, unknown>;

const loanBody = (categoryId: number): Record<string, unknown> => ({
  name: 'Car',
  loanType: 'auto',
  principal: 12000,
  interestRate: 3.5,
  termMonths: 60,
  startDate: '2026-01-01',
  categoryId,
  archived: false,
  sortOrder: 0,
});

const transferBody = (from: number, to: number): Record<string, unknown> => ({
  fromTransactionId: from,
  toTransactionId: to,
  method: 'manual',
  confidence: 'manual',
  linkedAt: '2026-03-02T09:00:00.000Z',
});

/** One foreign-key field, with a body that points it at the other user's row. */
const CASES: readonly [string, string, Body][] = [
  [
    'transactions.accountId',
    '/api/transactions',
    (_mine, theirs) => transactionBody(theirs.accountId),
  ],
  [
    'transactions.categoryId',
    '/api/transactions',
    (mine, theirs) => transactionBody(mine.accountId, { categoryId: theirs.categoryId }),
  ],
  ['loans.categoryId', '/api/loans', (_mine, theirs) => loanBody(theirs.categoryId)],
  [
    'transfers.fromTransactionId',
    '/api/transfers',
    (mine, theirs) => transferBody(theirs.transactionIds[0], mine.transactionIds[1]),
  ],
  [
    'transfers.toTransactionId',
    '/api/transfers',
    (mine, theirs) => transferBody(mine.transactionIds[0], theirs.transactionIds[1]),
  ],
  [
    'recurringOverrides.anchorTransactionId',
    '/api/recurringOverrides',
    (_mine, theirs) => ({
      kind: 'dismissed',
      anchorTransactionId: theirs.transactionIds[0],
      createdAt: '2026-03-02T09:00:00.000Z',
    }),
  ],
];

describe.each(CASES)('%s', (_field, path, body) => {
  it("answers 404 when a create references another user's row, and writes nothing", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const before = await apiJson<unknown[]>(app, path, { as: alice.session });
    const rejected = await apiFetch(app, path, {
      as: alice.session,
      method: 'POST',
      body: body(alice.fixtures, bob.fixtures),
    });

    expect(rejected.status).toBe(404);

    const after = await apiJson<unknown[]>(app, path, { as: alice.session });
    expect(after.body).toHaveLength(before.body.length);
  });

  it('accepts the same write when every reference is the caller’s own', async () => {
    const { app, alice } = await startTwoUserApp();

    const accepted = await apiFetch(app, path, {
      as: alice.session,
      method: 'POST',
      body: body(alice.fixtures, alice.fixtures),
    });

    expect(accepted.status).toBe(201);
  });
});

/**
 * The same rule for the id columns that are deliberately **not** foreign keys.
 *
 * Each of these is a plain `integer()` by schema decision — an import batch outlives the account
 * it loaded, `transactions.transferId` would close a reference cycle with `transfers`, and so on.
 * Sound reasons not to constrain them in SQLite, but none of them a reason to let a body point one
 * at another user's row, so `ownership.ts` carries them as soft references. Before that they
 * validated, stored, and dangled.
 */
describe('references: the columns that are not foreign keys', () => {
  const importBatchBody = (accountId: number): Record<string, unknown> => ({
    accountId,
    fileName: 'march.csv',
    importedAt: '2026-03-02T09:00:00.000Z',
    rowsRead: 10,
    rowsAdded: 9,
    rowsDuplicate: 1,
    dateFrom: '2026-03-01',
    dateTo: '2026-03-31',
  });

  it("refuses an import batch naming another user's account", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(app, '/api/importBatches', {
      as: alice.session,
      method: 'POST',
      body: importBatchBody(bob.fixtures.accountId),
    });

    expect(rejected.status).toBe(404);
    expect(
      (await apiJson<unknown[]>(app, '/api/importBatches', { as: alice.session })).body,
    ).toHaveLength(0);
  });

  it("refuses a mapping profile defaulting to another user's account", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(app, '/api/mappingProfiles', {
      as: alice.session,
      method: 'POST',
      body: {
        name: 'My bank',
        delimiter: ';',
        decimalSeparator: ',',
        dateFormat: 'DD/MM/YYYY',
        encoding: 'utf-8',
        headerRows: 1,
        signConvention: 'as-is',
        columns: { date: 'Date', description: 'Description', amount: 'Amount' },
        defaultAccountId: bob.fixtures.accountId,
      },
    });

    expect(rejected.status).toBe(404);
  });

  it("refuses a transaction naming another user's import batch", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const theirBatch = await apiJson<{ id: number }>(app, '/api/importBatches', {
      as: bob.session,
      method: 'POST',
      body: importBatchBody(bob.fixtures.accountId),
    });

    const rejected = await apiFetch(app, '/api/transactions', {
      as: alice.session,
      method: 'POST',
      body: transactionBody(alice.fixtures.accountId, { importBatchId: theirBatch.body.id }),
    });

    expect(rejected.status).toBe(404);
  });

  it("refuses a transaction naming another user's transfer", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const theirTransfer = await apiJson<{ id: number }>(app, '/api/transfers', {
      as: bob.session,
      method: 'POST',
      body: transferBody(bob.fixtures.transactionIds[0], bob.fixtures.transactionIds[1]),
    });

    const rejected = await apiFetch(app, '/api/transactions', {
      as: alice.session,
      method: 'POST',
      body: transactionBody(alice.fixtures.accountId, { transferId: theirTransfer.body.id }),
    });

    expect(rejected.status).toBe(404);
  });

  it("refuses a recurring override merged into another user's transaction", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const rejected = await apiFetch(app, '/api/recurringOverrides', {
      as: alice.session,
      method: 'POST',
      body: {
        kind: 'dismissed',
        anchorTransactionId: alice.fixtures.transactionIds[0],
        mergedIntoTransactionId: bob.fixtures.transactionIds[0],
        createdAt: '2026-03-02T09:00:00.000Z',
      },
    });

    expect(rejected.status).toBe(404);
  });
});

describe('references: on the patch path too', () => {
  it("refuses to move a transaction onto another user's account", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const mine = await apiJson<{ id: number; accountId: number }>(app, '/api/transactions', {
      as: alice.session,
      method: 'POST',
      body: transactionBody(alice.fixtures.accountId),
    });

    const rejected = await apiFetch(app, `/api/transactions/${mine.body.id}`, {
      as: alice.session,
      method: 'PATCH',
      body: { accountId: bob.fixtures.accountId },
    });
    expect(rejected.status).toBe(404);

    const after = await apiJson<{ accountId: number }>(app, `/api/transactions/${mine.body.id}`, {
      as: alice.session,
    });
    expect(after.body.accountId).toBe(alice.fixtures.accountId);
  });

  it('accepts clearing an optional reference', async () => {
    const { app, alice } = await startTwoUserApp();

    const mine = await apiJson<{ id: number }>(app, '/api/transactions', {
      as: alice.session,
      method: 'POST',
      body: transactionBody(alice.fixtures.accountId, {
        categoryId: alice.fixtures.categoryId,
      }),
    });

    const cleared = await apiJson<Record<string, unknown>>(
      app,
      `/api/transactions/${mine.body.id}`,
      { as: alice.session, method: 'PATCH', body: { categoryId: null } },
    );

    expect(cleared.status).toBe(200);
    expect(cleared.body['categoryId']).toBeUndefined();
  });
});
