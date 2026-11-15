import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { TestApp } from '../app.testing.js';
import { startTwoUserApp, type TestActor } from '../routes/samples.testing.js';
import { categories } from '../schema/categories.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import { connectMcp } from './mcp.testing.js';

type Changed = {
  transactionId: number;
  categoryId: number | null;
  categoryManual: boolean;
  previousCategoryId: number | null;
  previousCategoryManual: boolean;
};
type Skipped = { transactionId: number; reason: string };

const setup = async () => {
  const context = await startTwoUserApp();
  const { app, alice } = context;
  const extraCategory = (values: Partial<typeof categories.$inferInsert> = {}) =>
    app.db
      .insert(categories)
      .values({
        userId: alice.session.id,
        name: 'Dining',
        kind: 'expense',
        color: '#000',
        icon: 'tag',
        archived: false,
        isSystem: false,
        ...values,
      })
      .returning({ id: categories.id })
      .get().id;
  return { ...context, extraCategory, client: await connectMcp(app, alice.session.id) };
};

const rowOf = (app: TestApp, id: number) =>
  app.db
    .select({ categoryId: transactions.categoryId, categoryManual: transactions.categoryManual })
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();

const snapshot = (app: TestApp) =>
  app.db
    .select({
      id: transactions.id,
      categoryId: transactions.categoryId,
      categoryManual: transactions.categoryManual,
    })
    .from(transactions)
    .all();

const linkTransfer = (app: TestApp, actor: TestActor) => {
  const [from, to] = actor.fixtures.transactionIds;
  const transferId = app.db
    .insert(transfers)
    .values({
      userId: actor.session.id,
      fromTransactionId: from,
      toTransactionId: to,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-03-02T00:00:00.000Z',
    })
    .returning({ id: transfers.id })
    .get().id;
  app.db.update(transactions).set({ transferId }).where(eq(transactions.id, from)).run();
};

describe('assign_categories', () => {
  it('assigns as manual, and clearing with null sets categoryManual false', async () => {
    const { app, alice, client } = await setup();
    const [first, second] = alice.fixtures.transactionIds;
    app.db
      .update(transactions)
      .set({ categoryId: alice.fixtures.categoryId, categoryManual: true })
      .where(eq(transactions.id, second))
      .run();

    await client.value('assign_categories', {
      assignments: [
        { transactionId: first, categoryId: alice.fixtures.categoryId },
        { transactionId: second, categoryId: null },
      ],
      confirm: true,
    });

    expect(rowOf(app, first)).toEqual({
      categoryId: alice.fixtures.categoryId,
      categoryManual: true,
    });
    expect(rowOf(app, second)).toEqual({ categoryId: null, categoryManual: false });
  });

  it('writes nothing without confirm, and previews current and new category', async () => {
    const { app, alice, client, extraCategory } = await setup();
    const [first] = alice.fixtures.transactionIds;
    const dining = extraCategory();
    app.db
      .update(transactions)
      .set({ categoryId: alice.fixtures.categoryId, categoryManual: true })
      .where(eq(transactions.id, first))
      .run();
    const before = snapshot(app);

    const preview = await client.value<{ wouldChange: unknown[]; skipped: Skipped[] }>(
      'assign_categories',
      { assignments: [{ transactionId: first, categoryId: dining }] },
    );

    expect(snapshot(app)).toEqual(before);
    expect(preview).toEqual({
      wouldChange: [
        {
          transactionId: first,
          bookingDate: '2026-03-01',
          amount: -50,
          counterpartyName: null,
          rawDescription: 'Leg 0',
          currentCategory: { name: 'Groceries', manual: true },
          newCategory: 'Dining',
        },
      ],
      skipped: [],
    });
  });

  it('applies all or nothing when a write fails partway through', async () => {
    const { app, alice, client } = await setup();
    const [first, second] = alice.fixtures.transactionIds;
    app.handle.sqlite.exec(
      `CREATE TRIGGER abort_second BEFORE UPDATE ON transactions WHEN NEW.id = ${second} ` +
        `BEGIN SELECT RAISE(ABORT, 'forced failure (test)'); END`,
    );
    const before = snapshot(app);

    const outcome = await client.call('assign_categories', {
      assignments: [
        { transactionId: first, categoryId: alice.fixtures.categoryId },
        { transactionId: second, categoryId: alice.fixtures.categoryId },
      ],
      confirm: true,
    });

    expect(outcome.ok).toBe(false);
    expect(snapshot(app)).toEqual(before);
  });

  it('skips transfer-linked rows and still applies the rest', async () => {
    const { app, alice, client } = await setup();
    const [linked, free] = alice.fixtures.transactionIds;
    linkTransfer(app, alice);

    const result = await client.value<{ changed: Changed[]; skipped: Skipped[] }>(
      'assign_categories',
      {
        assignments: [
          { transactionId: linked, categoryId: alice.fixtures.categoryId },
          { transactionId: free, categoryId: alice.fixtures.categoryId },
        ],
        confirm: true,
      },
    );

    expect(result.skipped).toEqual([{ transactionId: linked, reason: 'linked transfer' }]);
    expect(result.changed.map((row) => row.transactionId)).toEqual([free]);
    expect(rowOf(app, linked)?.categoryId).toBeNull();
  });

  it('skips archived categories and ones outside their active window, with a reason', async () => {
    const { alice, client, extraCategory } = await setup();
    const [first, second] = alice.fixtures.transactionIds; // booked 2026-03-01 and 2026-03-02
    const archived = extraCategory({ name: 'Old', archived: true });
    const later = extraCategory({ name: 'Later', activeFrom: '2026-03-02' });

    const { wouldChange, skipped } = await client.value<{
      wouldChange: unknown[];
      skipped: Skipped[];
    }>('assign_categories', {
      assignments: [
        { transactionId: first, categoryId: later },
        { transactionId: second, categoryId: archived },
      ],
    });

    expect(wouldChange).toEqual([]);
    expect(skipped).toEqual([
      { transactionId: first, reason: 'category "Later" does not apply on 2026-03-01' },
      { transactionId: second, reason: 'category "Old" is archived' },
    ]);
  });

  it('skips an assignment that would change nothing', async () => {
    const { alice, client } = await setup();
    const [first] = alice.fixtures.transactionIds;

    const { skipped } = await client.value<{ skipped: Skipped[] }>('assign_categories', {
      assignments: [{ transactionId: first, categoryId: null }],
    });

    expect(skipped).toEqual([{ transactionId: first, reason: 'unchanged' }]);
  });

  it("refuses the whole call for another user's transaction or category, without saying which", async () => {
    const { app, alice, bob, client } = await setup();
    const [mine] = alice.fixtures.transactionIds;
    const before = snapshot(app);

    const foreignRow = await client.call('assign_categories', {
      assignments: [
        { transactionId: mine, categoryId: alice.fixtures.categoryId },
        { transactionId: bob.fixtures.transactionIds[0], categoryId: alice.fixtures.categoryId },
      ],
      confirm: true,
    });
    const foreignCategory = await client.call('assign_categories', {
      assignments: [{ transactionId: mine, categoryId: bob.fixtures.categoryId }],
      confirm: true,
    });
    const missing = await client.call('assign_categories', {
      assignments: [{ transactionId: 999_999, categoryId: null }],
    });

    const message = 'Unknown transaction or category id; nothing was changed';
    expect(foreignRow).toEqual({ ok: false, error: message });
    expect(foreignCategory).toEqual({ ok: false, error: message });
    expect(missing).toEqual({ ok: false, error: message });
    expect(snapshot(app)).toEqual(before);
  });

  it('refuses 501 items and a repeated transactionId', async () => {
    const { alice, client } = await setup();
    const [first] = alice.fixtures.transactionIds;

    const tooMany = await client.call('assign_categories', {
      assignments: Array.from({ length: 501 }, (_, index) => ({
        transactionId: index + 1,
        categoryId: null,
      })),
    });
    const repeated = await client.call('assign_categories', {
      assignments: [
        { transactionId: first, categoryId: null },
        { transactionId: first, categoryId: alice.fixtures.categoryId },
      ],
    });

    expect(tooMany).toMatchObject({ ok: false, error: expect.stringMatching(/at assignments$/) });
    expect(repeated).toMatchObject({ ok: false, error: expect.stringContaining('only once') });
  });

  it('returns previous values that put every row back when fed in again', async () => {
    const { app, alice, client, extraCategory } = await setup();
    const [ruleSet, manualSet] = alice.fixtures.transactionIds;
    const dining = extraCategory();
    app.db
      .update(transactions)
      .set({ categoryId: alice.fixtures.categoryId, categoryManual: false })
      .where(eq(transactions.id, ruleSet))
      .run();
    app.db
      .update(transactions)
      .set({ categoryId: alice.fixtures.categoryId, categoryManual: true })
      .where(eq(transactions.id, manualSet))
      .run();
    const before = snapshot(app);

    const { changed } = await client.value<{ changed: Changed[] }>('assign_categories', {
      assignments: [
        { transactionId: ruleSet, categoryId: dining },
        { transactionId: manualSet, categoryId: null },
      ],
      confirm: true,
    });
    await client.value('assign_categories', {
      assignments: changed.map((row) => ({
        transactionId: row.transactionId,
        categoryId: row.previousCategoryId,
        manual: row.previousCategoryManual,
      })),
      confirm: true,
    });

    expect(snapshot(app)).toEqual(before);
  });

  it('reassigns a row that was already manual, and the preview says it was', async () => {
    const { app, alice, client, extraCategory } = await setup();
    const [first] = alice.fixtures.transactionIds;
    const dining = extraCategory();
    app.db
      .update(transactions)
      .set({ categoryId: alice.fixtures.categoryId, categoryManual: true })
      .where(eq(transactions.id, first))
      .run();

    const preview = await client.value<{ wouldChange: { currentCategory: unknown }[] }>(
      'assign_categories',
      { assignments: [{ transactionId: first, categoryId: dining }] },
    );
    await client.value('assign_categories', {
      assignments: [{ transactionId: first, categoryId: dining }],
      confirm: true,
    });

    expect(preview.wouldChange[0]?.currentCategory).toEqual({ name: 'Groceries', manual: true });
    expect(rowOf(app, first)).toEqual({ categoryId: dining, categoryManual: true });
  });
});
