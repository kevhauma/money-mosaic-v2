import { TestBed } from '@angular/core/testing';
import { AccountsRepository } from './accounts.repository';
import { callApi, failApiCall, withApiTesting } from './api-client.testing';
import type { Account } from './entities';

const account = { id: 7, name: 'Checking', type: 'checking' } as Account;

describe('AccountsRepository', () => {
  withApiTesting();

  const repository = (): AccountsRepository => TestBed.inject(AccountsRepository);

  it('getAll reads the list endpoint', async () => {
    const accounts = await callApi(
      () => repository().getAll(),
      { method: 'GET', url: '/api/accounts' },
      [account],
    );

    expect(accounts).toEqual([account]);
  });

  it('add posts the account and resolves to the id the server assigned', async () => {
    const id = await callApi(
      () => repository().add(account),
      { method: 'POST', url: '/api/accounts', body: account },
      { ...account, id: 42 },
    );

    expect(id).toBe(42);
  });

  it('update patches the one row and resolves to the number of rows changed', async () => {
    const changed = await callApi(
      () => repository().update(7, { name: 'Renamed' }),
      { method: 'PATCH', url: '/api/accounts/7', body: { name: 'Renamed' } },
      { ...account, name: 'Renamed' },
    );

    expect(changed).toBe(1);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(7), { method: 'DELETE', url: '/api/accounts/7' }),
    ).resolves.toBeUndefined();
  });

  it('surfaces a failure as a rejection carrying the server message, not a silent undefined', async () => {
    const message = await failApiCall(
      () => repository().remove(7),
      { method: 'DELETE', url: '/api/accounts/7' },
      { status: 404, body: { error: 'Not found' } },
    );

    expect(message).toBe('Not found');
  });
});
