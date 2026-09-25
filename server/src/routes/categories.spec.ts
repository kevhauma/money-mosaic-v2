import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson, type TestApp, type TestSession } from '../app.testing.js';
import { startTwoUserApp, transactionBody } from './samples.testing.js';

/**
 * `DELETE /api/categories/:id` refusing in words (TICKET-SRV-04).
 *
 * `loans.categoryId` is NO ACTION, so SQLite refuses to delete a category a loan still tracks — with
 * `FOREIGN KEY constraint failed`, which the error handler correctly turns into a bare 500 nobody can
 * act on. This is the endpoint that asks *which* loans first, and says so.
 */

type Row = { id: number } & Record<string, unknown>;

const addCategory = async (app: TestApp, as: TestSession, name: string): Promise<number> =>
  (
    await apiJson<Row>(app, '/api/categories', {
      as,
      method: 'POST',
      body: {
        name,
        kind: 'expense',
        color: '#16a34a',
        icon: 'cart',
        archived: false,
        isSystem: false,
      },
    })
  ).body.id;

const addLoan = (
  app: TestApp,
  as: TestSession,
  categoryId: number,
  overrides: Record<string, unknown> = {},
) =>
  apiJson<Row>(app, '/api/loans', {
    as,
    method: 'POST',
    body: {
      name: 'Car',
      loanType: 'auto',
      principal: 12000,
      interestRate: 3.5,
      termMonths: 60,
      startDate: '2026-01-01',
      categoryId,
      archived: false,
      sortOrder: 0,
      ...overrides,
    },
  });

describe('DELETE /api/categories/:id', () => {
  it('deletes a category nothing tracks', async () => {
    const { app, alice } = await startTwoUserApp();
    const id = await addCategory(app, alice.session, 'Transport');

    expect(
      (await apiFetch(app, `/api/categories/${id}`, { as: alice.session, method: 'DELETE' }))
        .status,
    ).toBe(204);
    expect((await apiFetch(app, `/api/categories/${id}`, { as: alice.session })).status).toBe(404);
  });

  it('refuses with a 409 naming the loan, and leaves both rows intact', async () => {
    const { app, alice } = await startTwoUserApp();
    const categoryId = await addCategory(app, alice.session, 'Car payments');
    const loan = await addLoan(app, alice.session, categoryId, { name: 'Volvo' });

    const refused = await apiJson<{ error: string }>(app, `/api/categories/${categoryId}`, {
      as: alice.session,
      method: 'DELETE',
    });

    expect(refused.status).toBe(409);
    expect(refused.body.error).toContain('"Volvo"');
    expect(refused.body.error).not.toContain('constraint');
    expect(
      (await apiFetch(app, `/api/categories/${categoryId}`, { as: alice.session })).status,
    ).toBe(200);
    expect((await apiFetch(app, `/api/loans/${loan.body.id}`, { as: alice.session })).status).toBe(
      200,
    );
  });

  it('refuses for an archived loan too, since the constraint does not care', async () => {
    const { app, alice } = await startTwoUserApp();
    const categoryId = await addCategory(app, alice.session, 'Old loan');
    await addLoan(app, alice.session, categoryId, { name: 'Paid off', archived: true });

    const refused = await apiJson<{ error: string }>(app, `/api/categories/${categoryId}`, {
      as: alice.session,
      method: 'DELETE',
    });

    expect(refused.status).toBe(409);
    expect(refused.body.error).toContain('"Paid off"');
  });

  it('names every loan when more than one tracks the category', async () => {
    const { app, alice } = await startTwoUserApp();
    const categoryId = await addCategory(app, alice.session, 'Loans');
    await addLoan(app, alice.session, categoryId, { name: 'Volvo' });
    await addLoan(app, alice.session, categoryId, { name: 'Kitchen' });

    const refused = await apiJson<{ error: string }>(app, `/api/categories/${categoryId}`, {
      as: alice.session,
      method: 'DELETE',
    });

    expect(refused.status).toBe(409);
    expect(refused.body.error).toContain('"Volvo" and "Kitchen"');
    expect(refused.body.error).toContain('loans');
  });

  it('clears categoryManual off its transactions, not just categoryId', async () => {
    const { app, alice } = await startTwoUserApp();
    const categoryId = await addCategory(app, alice.session, 'Groceries');

    const transaction = await apiJson<Row>(app, '/api/transactions', {
      as: alice.session,
      method: 'POST',
      body: transactionBody(alice.fixtures.accountId, { categoryId, categoryManual: true }),
    });

    const deleted = await apiFetch(app, `/api/categories/${categoryId}`, {
      as: alice.session,
      method: 'DELETE',
    });
    expect(deleted.status).toBe(204);

    // The column's ON DELETE SET NULL clears `categoryId` and stops there. A row left saying "the
    // user chose this category" with no category is one `RulesEngineService` skips forever, so it
    // could never be categorised again.
    const after = await apiJson<Row>(app, `/api/transactions/${transaction.body.id}`, {
      as: alice.session,
    });
    expect(after.body['categoryId']).toBeUndefined();
    expect(after.body['categoryManual']).toBe(false);
  });

  it("still answers 404 for another user's category rather than 409", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const categoryId = await addCategory(app, alice.session, 'Mine');
    await addLoan(app, alice.session, categoryId, { name: 'Volvo' });

    // Bob owns no loan tracking it, so the refusal he gets is the one for a row he cannot see —
    // which must not confirm that a loan of somebody else's exists.
    const rejected = await apiJson<{ error: string }>(app, `/api/categories/${categoryId}`, {
      as: bob.session,
      method: 'DELETE',
    });

    expect(rejected.status).toBe(404);
    expect(rejected.body.error).toBe('Not found');
  });
});
