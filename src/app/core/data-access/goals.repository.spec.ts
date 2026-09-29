import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { SavingsGoal } from './entities';
import { GoalsRepository } from './goals.repository';

const goal = { id: 1, name: 'Buffer', targetAmount: 5000, sortOrder: 0 } as SavingsGoal;

describe('GoalsRepository', () => {
  withApiTesting();

  const repository = (): GoalsRepository => TestBed.inject(GoalsRepository);

  // `savingsGoals` is the one table whose endpoint is not spelled like the table.
  it('getAll reads the goals endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/goals' }, [goal]),
    ).toEqual([goal]);
  });

  it('add posts the goal and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(goal),
        { method: 'POST', url: '/api/goals', body: goal },
        { ...goal, id: 17 },
      ),
    ).toBe(17);
  });

  it('update patches the one row and resolves to the number of rows changed', async () => {
    expect(
      await callApi(
        () => repository().update(1, { targetAmount: 6000 }),
        { method: 'PATCH', url: '/api/goals/1', body: { targetAmount: 6000 } },
        goal,
      ),
    ).toBe(1);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(1), { method: 'DELETE', url: '/api/goals/1' }),
    ).resolves.toBeUndefined();
  });

  it('bulkUpdateSortOrder sends the whole reorder as one request', async () => {
    const updates = [
      { id: 1, sortOrder: 1 },
      { id: 2, sortOrder: 0 },
    ];

    await expect(
      callApi(() => repository().bulkUpdateSortOrder(updates), {
        method: 'PATCH',
        url: '/api/goals/sort-order',
        body: updates,
      }),
    ).resolves.toBeUndefined();
  });

  // An empty reorder is nothing to do, not an empty request — `withApiTesting`'s verify is what
  // fails this if a request is made anyway.
  it('bulkUpdateSortOrder makes no request at all for an empty reorder', async () => {
    await expect(repository().bulkUpdateSortOrder([])).resolves.toBeUndefined();
  });
});
