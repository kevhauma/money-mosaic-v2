import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { Transfer } from './entities';
import { TransfersRepository } from './transfers.repository';

const transfer = { id: 5, fromTransactionId: 10, toTransactionId: 11 } as Transfer;

describe('TransfersRepository', () => {
  withApiTesting();

  const repository = (): TransfersRepository => TestBed.inject(TransfersRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/transfers' }, [
        transfer,
      ]),
    ).toEqual([transfer]);
  });

  it('add posts the transfer and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(transfer),
        { method: 'POST', url: '/api/transfers', body: transfer },
        { ...transfer, id: 16 },
      ),
    ).toBe(16);
  });
});
