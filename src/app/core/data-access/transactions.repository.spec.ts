import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { Transaction } from './entities';
import { TransactionsRepository } from './transactions.repository';

const transaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 1,
    accountId: 1,
    bookingDate: '2026-07-01',
    amount: -10,
    currency: 'EUR',
    rawDescription: 'Test',
    fingerprint: 'fp|1',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }) as Transaction;

describe('TransactionsRepository', () => {
  withApiTesting();

  const repository = (): TransactionsRepository => TestBed.inject(TransactionsRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/transactions' }, [
        transaction(),
      ]),
    ).toEqual([transaction()]);
  });

  it('count reads the count endpoint and unwraps the number', async () => {
    expect(
      await callApi(
        () => repository().count(),
        { method: 'GET', url: '/api/transactions/count' },
        { count: 12 },
      ),
    ).toBe(12);
  });

  // The three narrowed reads are query parameters on the list endpoint, not paths of their own.
  it('getByAccount narrows the list endpoint by account', async () => {
    expect(
      await callApi(
        () => repository().getByAccount(2),
        { method: 'GET', url: '/api/transactions?accountId=2' },
        [transaction({ accountId: 2 })],
      ),
    ).toEqual([transaction({ accountId: 2 })]);
  });

  it('getByImportBatch narrows the list endpoint by batch', async () => {
    expect(
      await callApi(
        () => repository().getByImportBatch(3),
        { method: 'GET', url: '/api/transactions?importBatchId=3' },
        [transaction({ importBatchId: 3 })],
      ),
    ).toEqual([transaction({ importBatchId: 3 })]);
  });

  it('getByReimbursementTransferId narrows the list endpoint by the reimbursed transfer', async () => {
    expect(
      await callApi(
        () => repository().getByReimbursementTransferId(42),
        { method: 'GET', url: '/api/transactions?reimbursementTransferId=42' },
        [transaction()],
      ),
    ).toEqual([transaction()]);
  });

  it('update patches the one row and resolves to the number of rows changed', async () => {
    expect(
      await callApi(
        () => repository().update(1, { categoryId: 4 }),
        { method: 'PATCH', url: '/api/transactions/1', body: { categoryId: 4 } },
        transaction({ categoryId: 4 }),
      ),
    ).toBe(1);
  });

  it('bulkUpdate patches the batch in one request and resolves to the rows changed', async () => {
    expect(
      await callApi(
        () => repository().bulkUpdate([{ id: 1, changes: { categoryId: 4 } }]),
        {
          method: 'PATCH',
          url: '/api/transactions/bulk',
          body: [{ id: 1, changes: { categoryId: 4 } }],
        },
        { updated: 1 },
      ),
    ).toBe(1);
  });

  // Dexie's `update` deleted a property set to `undefined`; `null` is how that reads on the wire,
  // and it is what `TransactionsStore.bulkClearCategory` depends on to actually clear a category.
  it('bulkUpdate sends a cleared field as null rather than dropping it', async () => {
    expect(
      await callApi(
        () => repository().bulkUpdate([{ id: 1, changes: { categoryId: undefined } }]),
        {
          method: 'PATCH',
          url: '/api/transactions/bulk',
          body: [{ id: 1, changes: { categoryId: null } }],
        },
        { updated: 1 },
      ),
    ).toBe(1);
  });

  it('bulkAdd posts the batch in one request and resolves to the new ids in order', async () => {
    const rows = [transaction({ id: undefined }), transaction({ id: undefined, amount: -20 })];

    expect(
      await callApi(
        () => repository().bulkAdd(rows),
        { method: 'POST', url: '/api/transactions/bulk' },
        { ids: [21, 22] },
      ),
    ).toEqual([21, 22]);
  });
});
