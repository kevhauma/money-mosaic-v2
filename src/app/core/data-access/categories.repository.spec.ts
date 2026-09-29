import { TestBed } from '@angular/core/testing';
import { callApi, failApiCall, withApiTesting } from './api-client.testing';
import { CategoriesRepository } from './categories.repository';
import type { Category } from './entities';

const category = { id: 3, name: 'Groceries', kind: 'expense' } as Category;

describe('CategoriesRepository', () => {
  withApiTesting();

  const repository = (): CategoriesRepository => TestBed.inject(CategoriesRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/categories' }, [
        category,
      ]),
    ).toEqual([category]);
  });

  it('add posts the category and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(category),
        { method: 'POST', url: '/api/categories', body: category },
        { ...category, id: 9 },
      ),
    ).toBe(9);
  });

  it('update patches the one row and resolves to the number of rows changed', async () => {
    expect(
      await callApi(
        () => repository().update(3, { name: 'Food' }),
        { method: 'PATCH', url: '/api/categories/3', body: { name: 'Food' } },
        category,
      ),
    ).toBe(1);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(3), { method: 'DELETE', url: '/api/categories/3' }),
    ).resolves.toBeUndefined();
  });

  it('rejects with the refusal when a loan still tracks the category (TICKET-SRV-04)', async () => {
    const message = await failApiCall(
      () => repository().remove(3),
      { method: 'DELETE', url: '/api/categories/3' },
      {
        status: 409,
        body: { error: 'This category cannot be deleted while the loan "Car" tracks it.' },
      },
    );

    expect(message).toContain('"Car"');
  });
});
