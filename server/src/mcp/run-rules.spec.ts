import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { TestApp } from '../app.testing.js';
import { startTwoUserApp, type TestActor } from '../routes/samples.testing.js';
import { categories } from '../schema/categories.js';
import { rules } from '../schema/rules.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import { connectMcp } from './mcp.testing.js';

type Preview = {
  total: number;
  perRule: { ruleId: number; name: string; count: number }[];
  changes: { transactionId: number; newCategory: string; rule: string }[];
};
type Applied = {
  total: number;
  changed: { transactionId: number; previousCategoryId: number | null }[];
};

const addCategory = (app: TestApp, actor: TestActor, name: string): number =>
  app.db
    .insert(categories)
    .values({
      userId: actor.session.id,
      name,
      kind: 'expense',
      color: '#000',
      icon: 'tag',
      archived: false,
      isSystem: false,
    })
    .returning({ id: categories.id })
    .get().id;

/** A rule matching descriptions that contain `text`. */
const addRule = (
  app: TestApp,
  actor: TestActor,
  text: string,
  categoryId: number,
  values: Partial<typeof rules.$inferInsert> = {},
): number =>
  app.db
    .insert(rules)
    .values({
      userId: actor.session.id,
      name: `Rule ${text}`,
      priority: 10,
      enabled: true,
      continueOnMatch: false,
      conditions: [{ field: 'description', operator: 'contains', value: text }],
      action: { setCategoryId: categoryId },
      ...values,
    })
    .returning({ id: rules.id })
    .get().id;

const addRow = (
  app: TestApp,
  actor: TestActor,
  rawDescription: string,
  values: Partial<typeof transactions.$inferInsert> = {},
): number =>
  app.db
    .insert(transactions)
    .values({
      userId: actor.session.id,
      accountId: actor.fixtures.accountId,
      bookingDate: '2026-05-15',
      amount: -10,
      rawDescription,
      fingerprint: `fp-${Math.random()}`,
      createdAt: '2026-05-15T00:00:00.000Z',
      ...values,
    })
    .returning({ id: transactions.id })
    .get().id;

const rowOf = (app: TestApp, id: number) =>
  app.db
    .select({ categoryId: transactions.categoryId, categoryManual: transactions.categoryManual })
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();

const snapshot = (app: TestApp) =>
  app.db
    .select({ id: transactions.id, categoryId: transactions.categoryId })
    .from(transactions)
    .all();

const setup = async () => {
  const context = await startTwoUserApp();
  return { ...context, client: await connectMcp(context.app, context.alice.session.id) };
};

describe('run_rules', () => {
  it('never touches manual or transfer-linked rows', async () => {
    const { app, alice, client } = await setup();
    const groceries = alice.fixtures.categoryId;
    const dining = addCategory(app, alice, 'Dining');
    addRule(app, alice, 'shop', groceries);
    const manual = addRow(app, alice, 'shop', { categoryId: dining, categoryManual: true });
    const leg = addRow(app, alice, 'shop');
    const other = addRow(app, alice, 'shop other leg', { amount: 10 });
    const transferId = app.db
      .insert(transfers)
      .values({
        userId: alice.session.id,
        fromTransactionId: leg,
        toTransactionId: other,
        method: 'manual',
        confidence: 'manual',
        linkedAt: '2026-05-15T00:00:00.000Z',
      })
      .returning({ id: transfers.id })
      .get().id;
    app.db.update(transactions).set({ transferId }).where(eq(transactions.id, leg)).run();
    app.db.update(transactions).set({ transferId }).where(eq(transactions.id, other)).run();
    const free = addRow(app, alice, 'shop');

    const applied = await client.value<Applied>('run_rules', { confirm: true });

    expect(applied.changed.map((row) => row.transactionId)).toEqual([free]);
    expect(rowOf(app, manual)).toEqual({ categoryId: dining, categoryManual: true });
    expect(rowOf(app, leg)?.categoryId).toBeNull();
  });

  it('writes nothing without confirm, and the preview totals equal what confirm applies', async () => {
    const { app, alice, client } = await setup();
    const dining = addCategory(app, alice, 'Dining');
    const shopRule = addRule(app, alice, 'shop', alice.fixtures.categoryId);
    const cafeRule = addRule(app, alice, 'cafe', dining);
    addRow(app, alice, 'shop');
    addRow(app, alice, 'shop');
    addRow(app, alice, 'cafe');
    const before = snapshot(app);

    const preview = await client.value<Preview>('run_rules');

    expect(snapshot(app)).toEqual(before);
    expect(preview.total).toBe(3);
    expect(preview.perRule).toEqual(
      expect.arrayContaining([
        { ruleId: shopRule, name: 'Rule shop', count: 2 },
        { ruleId: cafeRule, name: 'Rule cafe', count: 1 },
      ]),
    );
    expect(preview.changes).toContainEqual(
      expect.objectContaining({ newCategory: 'Dining', rule: 'Rule cafe' }),
    );

    const applied = await client.value<Applied>('run_rules', { confirm: true });

    expect(applied.total).toBe(preview.total);
    expect(applied.changed).toHaveLength(preview.total);
  });

  it('with ruleIds, a higher-priority winner still wins and its rows are left out', async () => {
    const { app, alice, client } = await setup();
    const dining = addCategory(app, alice, 'Dining');
    // Both match "shop cafe"; the priority-1 rule stops the run there.
    addRule(app, alice, 'cafe', dining, { priority: 1 });
    const tested = addRule(app, alice, 'shop', alice.fixtures.categoryId, { priority: 5 });
    addRow(app, alice, 'shop cafe');
    const onlyShop = addRow(app, alice, 'shop');

    const preview = await client.value<Preview>('run_rules', { ruleIds: [tested] });

    expect(preview.total).toBe(1);
    expect(preview.changes.map((change) => change.transactionId)).toEqual([onlyShop]);
  });

  it('evaluates a named disabled rule, and ignores it otherwise', async () => {
    const { app, alice, client } = await setup();
    const disabled = addRule(app, alice, 'shop', alice.fixtures.categoryId, { enabled: false });
    addRow(app, alice, 'shop');

    expect((await client.value<Preview>('run_rules')).total).toBe(0);
    expect((await client.value<Preview>('run_rules', { ruleIds: [disabled] })).total).toBe(1);
  });

  it('confirm sets categoryId only, leaving the row non-manual, and returns the previous category', async () => {
    const { app, alice, client } = await setup();
    const dining = addCategory(app, alice, 'Dining');
    addRule(app, alice, 'shop', alice.fixtures.categoryId);
    const row = addRow(app, alice, 'shop', { categoryId: dining, categoryManual: false });

    const applied = await client.value<Applied>('run_rules', { confirm: true });

    expect(applied.changed).toEqual([{ transactionId: row, previousCategoryId: dining }]);
    expect(rowOf(app, row)).toEqual({
      categoryId: alice.fixtures.categoryId,
      categoryManual: false,
    });
  });

  it("reads and writes only the token user's rules and rows, and refuses another user's rule id", async () => {
    const { app, alice, bob, client } = await setup();
    addRule(app, bob, 'shop', bob.fixtures.categoryId);
    const bobsRule = addRule(app, bob, 'leg', bob.fixtures.categoryId);
    const alicesRow = addRow(app, alice, 'shop');
    const before = snapshot(app);

    // Bob's rule would match Alice's row, and Bob's seed rows ("Leg 0/1") match his second rule.
    expect((await client.value<Preview>('run_rules', { confirm: true })).total).toBe(0);
    expect(rowOf(app, alicesRow)?.categoryId).toBeNull();
    expect(await client.call('run_rules', { ruleIds: [bobsRule] })).toEqual({
      ok: false,
      error: 'Unknown rule id; nothing was changed',
    });
    expect(snapshot(app)).toEqual(before);
  });
});
