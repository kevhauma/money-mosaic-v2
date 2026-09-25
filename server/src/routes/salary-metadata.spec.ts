import { describe, expect, it } from 'vitest';

import { apiJson, type TestSession } from '../app.testing.js';
import { startTwoUserApp, type TwoUserApp } from './samples.testing.js';

/**
 * `PUT /api/salaryMetadata` (TICKET-SRV-03) — the endpoint behind `SalaryMetadataRepository.upsert`,
 * keyed by `yearMonth` rather than by id, and replacing rather than merging (a Dexie `put`).
 */

type Salary = { id: number; yearMonth: string; grossWage?: number; note?: string };

const put = (app: TwoUserApp['app'], as: TestSession, body: unknown) =>
  apiJson<Salary>(app, '/api/salaryMetadata', { as, method: 'PUT', body });

describe('PUT /api/salaryMetadata', () => {
  it('creates the month, then replaces it in place', async () => {
    const { app, alice } = await startTwoUserApp();
    const as = alice.session;

    const created = await put(app, as, { yearMonth: '2026-03', grossWage: 4200, note: 'March' });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ yearMonth: '2026-03', grossWage: 4200, note: 'March' });

    const replaced = await put(app, as, { yearMonth: '2026-03', grossWage: 4400 });

    // Same row, and the omitted `note` is cleared rather than kept — a `put` writes the whole row.
    expect(replaced.body.id).toBe(created.body.id);
    expect(replaced.body.grossWage).toBe(4400);
    expect(replaced.body.note).toBeUndefined();

    expect((await apiJson<Salary[]>(app, '/api/salaryMetadata', { as })).body).toHaveLength(1);
  });

  it("writes a month of its own rather than touching another user's", async () => {
    const { app, alice, bob } = await startTwoUserApp();

    await put(app, alice.session, { yearMonth: '2026-03', grossWage: 4200 });
    const theirs = await put(app, bob.session, { yearMonth: '2026-03', grossWage: 3100 });

    expect(theirs.body.grossWage).toBe(3100);
    expect(
      (await apiJson<Salary[]>(app, '/api/salaryMetadata', { as: alice.session })).body,
    ).toEqual([expect.objectContaining({ grossWage: 4200 })]);
  });

  it('rejects a body with no month', async () => {
    const { app, alice } = await startTwoUserApp();

    const response = await apiJson<{ error: string }>(app, '/api/salaryMetadata', {
      as: alice.session,
      method: 'PUT',
      body: { grossWage: 4200 },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required field "yearMonth"');
  });
});
