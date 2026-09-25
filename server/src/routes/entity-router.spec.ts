import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import { ENTITY_SAMPLES, startTwoUserApp, type EntitySample } from './samples.testing.js';

/**
 * The central test of TICKET-SRV-03: **user B cannot read, update or delete user A's rows.**
 *
 * It runs against every entity endpoint rather than a sample of them. One `where userId = ?`
 * forgotten on one table is the whole property gone for that table, and the only way to know is to
 * ask each of them — which is exactly what the shared router factory makes affordable.
 */

type Row = { id: number } & Record<string, unknown>;

const eachSample = ENTITY_SAMPLES.map((sample): [string, EntitySample] => [sample.path, sample]);

describe.each(eachSample)('%s', (path, sample) => {
  it('creates a row, reads it back, and lists it', async () => {
    const { app, alice } = await startTwoUserApp();

    const created = await apiJson<Row>(app, path, {
      as: alice.session,
      method: 'POST',
      body: sample.create(alice.fixtures),
    });
    expect(created.status).toBe(201);
    expect(created.body.id).toBeGreaterThan(0);
    // `userId` is how the server scopes rows and is not a field of any entity type.
    expect(created.body['userId']).toBeUndefined();

    const read = await apiJson<Row>(app, `${path}/${created.body.id}`, { as: alice.session });
    expect(read.status).toBe(200);
    expect(read.body).toEqual(created.body);

    const listed = await apiJson<Row[]>(app, path, { as: alice.session });
    expect(listed.body.map((row) => row.id)).toContain(created.body.id);
  });

  it("lists only the signed-in user's rows", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const mine = await apiJson<Row>(app, path, {
      as: alice.session,
      method: 'POST',
      body: sample.create(alice.fixtures),
    });
    const theirs = await apiJson<Row>(app, path, {
      as: bob.session,
      method: 'POST',
      body: sample.create(bob.fixtures),
    });
    expect(theirs.status).toBe(201);

    const listed = await apiJson<Row[]>(app, path, { as: alice.session });
    const ids = listed.body.map((row) => row.id);
    expect(ids).toContain(mine.body.id);
    expect(ids).not.toContain(theirs.body.id);
  });

  it("answers 404 — not 403 — for another user's id, and changes nothing", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const mine = await apiJson<Row>(app, path, {
      as: alice.session,
      method: 'POST',
      body: sample.create(alice.fixtures),
    });
    const target = `${path}/${mine.body.id}`;

    expect((await apiFetch(app, target, { as: bob.session })).status).toBe(404);
    expect(
      (await apiFetch(app, target, { as: bob.session, method: 'PATCH', body: sample.patch }))
        .status,
    ).toBe(404);
    expect((await apiFetch(app, target, { as: bob.session, method: 'DELETE' })).status).toBe(404);

    const after = await apiJson<Row>(app, target, { as: alice.session });
    expect(after.status).toBe(200);
    expect(after.body).toEqual(mine.body);
  });

  it('patches and deletes its own row', async () => {
    const { app, alice } = await startTwoUserApp();

    const mine = await apiJson<Row>(app, path, {
      as: alice.session,
      method: 'POST',
      body: sample.create(alice.fixtures),
    });
    const target = `${path}/${mine.body.id}`;

    const patched = await apiJson<Row>(app, target, {
      as: alice.session,
      method: 'PATCH',
      body: sample.patch,
    });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject(sample.patch);

    expect((await apiFetch(app, target, { as: alice.session, method: 'DELETE' })).status).toBe(204);
    expect((await apiFetch(app, target, { as: alice.session })).status).toBe(404);
  });

  it("ignores a userId in the body rather than creating a row under another user's id", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    const created = await apiJson<Row>(app, path, {
      as: alice.session,
      method: 'POST',
      body: { ...sample.create(alice.fixtures), userId: bob.session.id },
    });
    expect(created.status).toBe(201);

    // The row is Alice's: Bob can neither see it in his list nor fetch it by id.
    const bobList = await apiJson<Row[]>(app, path, { as: bob.session });
    expect(bobList.body.map((row) => row.id)).not.toContain(created.body.id);
    expect((await apiFetch(app, `${path}/${created.body.id}`, { as: bob.session })).status).toBe(
      404,
    );
  });

  it('rejects an unknown field with a 400 that names it, and writes nothing', async () => {
    const { app, alice } = await startTwoUserApp();

    const before = await apiJson<Row[]>(app, path, { as: alice.session });
    const rejected = await apiJson<{ error: string }>(app, path, {
      as: alice.session,
      method: 'POST',
      body: { ...sample.create(alice.fixtures), notAColumn: 'nope' },
    });

    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toContain('notAColumn');

    const after = await apiJson<Row[]>(app, path, { as: alice.session });
    expect(after.body).toHaveLength(before.body.length);
  });

  it('answers 404 for an id that is not an id', async () => {
    const { app, alice } = await startTwoUserApp();

    expect((await apiFetch(app, `${path}/not-an-id`, { as: alice.session })).status).toBe(404);
  });
});

describe('entity router: shared behaviour', () => {
  it('filters a list by ?ids=, and an empty list asks for no rows', async () => {
    const { app, alice } = await startTwoUserApp();

    const first = await apiJson<Row>(app, '/api/accounts', {
      as: alice.session,
      method: 'POST',
      body: ENTITY_SAMPLES[0]!.create(alice.fixtures),
    });

    const selected = await apiJson<Row[]>(app, `/api/accounts?ids=${first.body.id}`, {
      as: alice.session,
    });
    expect(selected.body.map((row) => row.id)).toEqual([first.body.id]);

    const none = await apiJson<Row[]>(app, '/api/accounts?ids=', { as: alice.session });
    expect(none.body).toEqual([]);
  });

  it('rejects a malformed ?ids= rather than answering with every row', async () => {
    const { app, alice } = await startTwoUserApp();

    const response = await apiJson<{ error: string }>(app, '/api/accounts?ids=1,two', {
      as: alice.session,
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('ids');
  });

  it('never answers with a SQLite constraint message', async () => {
    const { app, alice } = await startTwoUserApp();

    // `loans.categoryId` is NO ACTION, so deleting a category an active loan tracks is refused by
    // SQLite itself (TICKET-SRV-02). The friendly wording belongs to TICKET-SRV-04; what must be
    // true *now* is that the raw constraint failure never reaches the client.
    await apiFetch(app, '/api/loans', {
      as: alice.session,
      method: 'POST',
      body: {
        name: 'Car',
        loanType: 'auto',
        principal: 12000,
        interestRate: 3.5,
        termMonths: 60,
        startDate: '2026-01-01',
        categoryId: alice.fixtures.categoryId,
        archived: false,
        sortOrder: 0,
      },
    });

    const refused = await apiJson<{ error: string }>(
      app,
      `/api/categories/${alice.fixtures.categoryId}`,
      { as: alice.session, method: 'DELETE' },
    );

    expect(refused.status).toBe(500);
    expect(refused.body.error).toBe('Internal server error');
  });
});
