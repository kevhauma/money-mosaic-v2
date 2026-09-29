import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { Loan } from './entities';
import { LoansRepository } from './loans.repository';

const loan = { id: 4, name: 'Car', categoryId: 3 } as Loan;

describe('LoansRepository', () => {
  withApiTesting();

  const repository = (): LoansRepository => TestBed.inject(LoansRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/loans' }, [loan]),
    ).toEqual([loan]);
  });

  it('add posts the loan and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(loan),
        { method: 'POST', url: '/api/loans', body: loan },
        { ...loan, id: 12 },
      ),
    ).toBe(12);
  });

  it('update patches the one row and resolves to the number of rows changed', async () => {
    expect(
      await callApi(
        () => repository().update(4, { archived: true }),
        { method: 'PATCH', url: '/api/loans/4', body: { archived: true } },
        loan,
      ),
    ).toBe(1);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(4), { method: 'DELETE', url: '/api/loans/4' }),
    ).resolves.toBeUndefined();
  });
});
