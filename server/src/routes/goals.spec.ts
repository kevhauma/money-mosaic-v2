import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import { startTwoUserApp, type TestActor, type TwoUserApp } from './samples.testing.js';

/**
 * `PATCH /api/goals/sort-order` (TICKET-SRV-03) — the one write that is a whole list rather than a
 * row. Goals are funded top-down (TICKET-FUT-05), so a half-applied reorder does not just look
 * wrong, it moves every ETA on the forecast page.
 */

type Goal = { id: number; name: string; sortOrder?: number };

const addGoal = (
  app: TwoUserApp['app'],
  as: TestActor['session'],
  name: string,
  sortOrder: number,
) =>
  apiJson<Goal>(app, '/api/goals', {
    as,
    method: 'POST',
    body: {
      name,
      targetAmount: 1000,
      sortOrder,
      archived: false,
      createdAt: '2026-03-01T10:00:00.000Z',
    },
  });

describe('PATCH /api/goals/sort-order', () => {
  it('applies the whole order', async () => {
    const { app, alice } = await startTwoUserApp();
    const first = await addGoal(app, alice.session, 'Bike', 0);
    const second = await addGoal(app, alice.session, 'Holiday', 1);

    const response = await apiFetch(app, '/api/goals/sort-order', {
      as: alice.session,
      method: 'PATCH',
      body: [
        { id: first.body.id, sortOrder: 1 },
        { id: second.body.id, sortOrder: 0 },
      ],
    });
    expect(response.status).toBe(204);

    // Keyed by id rather than compared positionally: a list endpoint promises the user's rows, not
    // an order — this very reorder changes which index SQLite reads them back through.
    const listed = await apiJson<Goal[]>(app, '/api/goals', { as: alice.session });
    expect(Object.fromEntries(listed.body.map(({ id, sortOrder }) => [id, sortOrder]))).toEqual({
      [first.body.id]: 1,
      [second.body.id]: 0,
    });
  });

  it('applies none of it when one row belongs to another user', async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const mine = await addGoal(app, alice.session, 'Bike', 0);
    const theirs = await addGoal(app, bob.session, 'Their bike', 0);

    const response = await apiFetch(app, '/api/goals/sort-order', {
      as: alice.session,
      method: 'PATCH',
      body: [
        { id: mine.body.id, sortOrder: 7 },
        { id: theirs.body.id, sortOrder: 8 },
      ],
    });
    expect(response.status).toBe(404);

    // The first update went back with the transaction, and Bob's goal never moved.
    expect(
      (await apiJson<Goal>(app, `/api/goals/${mine.body.id}`, { as: alice.session })).body
        .sortOrder,
    ).toBe(0);
    expect(
      (await apiJson<Goal>(app, `/api/goals/${theirs.body.id}`, { as: bob.session })).body
        .sortOrder,
    ).toBe(0);
  });

  it('rejects a malformed entry before writing anything', async () => {
    const { app, alice } = await startTwoUserApp();
    const mine = await addGoal(app, alice.session, 'Bike', 0);

    const response = await apiJson<{ error: string }>(app, '/api/goals/sort-order', {
      as: alice.session,
      method: 'PATCH',
      body: [{ id: mine.body.id, sortOrder: 'first' }],
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('sortOrder');
    expect(
      (await apiJson<Goal>(app, `/api/goals/${mine.body.id}`, { as: alice.session })).body
        .sortOrder,
    ).toBe(0);
  });
});
