import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { PARTNER_CONTRIBUTION_CATEGORY_NAME } from 'shared/seed-data.js';

import type { TestApp } from '../app.testing.js';
import { startTwoUserApp, type TestActor } from '../routes/samples.testing.js';
import { categories } from '../schema/categories.js';
import { loans } from '../schema/loans.js';
import { rules } from '../schema/rules.js';
import { transactions } from '../schema/transactions.js';
import { connectMcp } from './mcp.testing.js';

type Row = { id: number } & Record<string, unknown>;

const setup = async () => {
  const context = await startTwoUserApp();
  return { ...context, client: await connectMcp(context.app, context.alice.session.id) };
};

const categoryRow = (app: TestApp, id: number) =>
  app.db.select().from(categories).where(eq(categories.id, id)).get();

const transactionSnapshot = (app: TestApp) =>
  app.db
    .select({
      id: transactions.id,
      categoryId: transactions.categoryId,
      categoryManual: transactions.categoryManual,
    })
    .from(transactions)
    .all();

const addPartnerContribution = (app: TestApp, actor: TestActor): number =>
  app.db
    .insert(categories)
    .values({
      userId: actor.session.id,
      name: PARTNER_CONTRIBUTION_CATEGORY_NAME,
      kind: 'neutral',
      color: '#000',
      icon: 'users',
      archived: false,
      isSystem: true,
    })
    .returning({ id: categories.id })
    .get().id;

const validRule = (categoryId: number) => ({
  name: 'Delhaize',
  conditions: [{ field: 'description', operator: 'contains', value: 'delhaize' }],
  action: { setCategoryId: categoryId },
});

describe('create_category / update_category', () => {
  it('creates a non-system, unarchived category with the default colour and icon', async () => {
    const { app, client } = await setup();

    const created = await client.value<Row>('create_category', { name: 'Pets', kind: 'expense' });

    expect(categoryRow(app, created.id)).toMatchObject({
      name: 'Pets',
      kind: 'expense',
      color: '#9CA3AF',
      icon: 'tag',
      archived: false,
      isSystem: false,
    });
  });

  it('refuses a duplicate name regardless of case, on create and on rename', async () => {
    const { client } = await setup();
    const pets = await client.value<Row>('create_category', { name: 'Pets', kind: 'expense' });

    const created = await client.call('create_category', { name: 'groceries', kind: 'expense' });
    const renamed = await client.call('update_category', { id: pets.id, name: 'GROCERIES' });

    expect(created).toMatchObject({
      ok: false,
      error: expect.stringMatching(/^name: .*"Groceries"/),
    });
    expect(renamed).toMatchObject({ ok: false, error: expect.stringMatching(/^name: /) });
  });

  it('archives with archived: true, hides it from list_categories, and returns the previous values', async () => {
    const { alice, client } = await setup();

    const result = await client.value<{ previous: Row; current: Row }>('update_category', {
      id: alice.fixtures.categoryId,
      archived: true,
    });

    expect(result.previous).toMatchObject({ archived: false, name: 'Groceries' });
    expect(result.current).toMatchObject({ archived: true });
    expect(await client.value('list_categories')).toEqual([]);
  });

  it('refuses renaming Partner contribution, but renames any other seeded category', async () => {
    const { app, alice, client } = await setup();
    const partner = addPartnerContribution(app, alice);
    app.db
      .update(categories)
      .set({ isSystem: true })
      .where(eq(categories.id, alice.fixtures.categoryId))
      .run();

    const refused = await client.call('update_category', { id: partner, name: 'Partner' });
    const renamed = await client.call('update_category', {
      id: alice.fixtures.categoryId,
      name: 'Food',
    });

    expect(refused).toMatchObject({
      ok: false,
      error: expect.stringContaining('cannot be renamed'),
    });
    expect(renamed.ok).toBe(true);
    expect(categoryRow(app, partner)?.name).toBe(PARTNER_CONTRIBUTION_CATEGORY_NAME);
  });
});

describe('delete_category', () => {
  it('previews without writing: the affected transaction count and the blocking loans and rules', async () => {
    const { app, alice, client } = await setup();
    const categoryId = alice.fixtures.categoryId;
    app.db.update(transactions).set({ categoryId }).run();
    const loan = app.db
      .insert(loans)
      .values({
        userId: alice.session.id,
        name: 'Car',
        loanType: 'auto',
        principal: 1,
        interestRate: 1,
        termMonths: 1,
        startDate: '2026-01-01',
        categoryId,
        archived: false,
        sortOrder: 0,
      })
      .returning({ id: loans.id })
      .get().id;
    const rule = await client.value<Row>('create_rule', validRule(categoryId));
    const before = transactionSnapshot(app);

    const preview = await client.value('delete_category', { id: categoryId });

    expect(preview).toMatchObject({
      transactionsLosingCategory: 2,
      blockedBy: { loans: [{ id: loan, name: 'Car' }], rules: [{ id: rule.id, name: 'Delhaize' }] },
      canDelete: false,
    });
    expect(categoryRow(app, categoryId)).toBeDefined();
    expect(transactionSnapshot(app)).toEqual(before);
  });

  it('with confirm, refuses while a rule targets it and otherwise clears its transactions as non-manual', async () => {
    const { app, alice, client } = await setup();
    const categoryId = alice.fixtures.categoryId;
    app.db.update(transactions).set({ categoryId, categoryManual: true }).run();
    const rule = await client.value<Row>('create_rule', validRule(categoryId));

    const refused = await client.call('delete_category', { id: categoryId, confirm: true });
    expect(refused).toMatchObject({
      ok: false,
      error: expect.stringContaining('the rule "Delhaize" assigns it'),
    });
    expect(categoryRow(app, categoryId)).toBeDefined();

    await client.value('delete_rule', { id: rule.id, confirm: true });
    await client.value('delete_category', { id: categoryId, confirm: true });

    expect(categoryRow(app, categoryId)).toBeUndefined();
    expect(
      transactionSnapshot(app)
        .filter((row) => alice.fixtures.transactionIds.includes(row.id))
        .map(({ categoryId, categoryManual }) => ({ categoryId, categoryManual })),
    ).toEqual([
      { categoryId: null, categoryManual: false },
      { categoryId: null, categoryManual: false },
    ]);
  });

  it('refuses deleting Partner contribution, but deletes another seeded category', async () => {
    const { app, alice, client } = await setup();
    const partner = addPartnerContribution(app, alice);
    app.db
      .update(categories)
      .set({ isSystem: true })
      .where(eq(categories.id, alice.fixtures.categoryId))
      .run();

    expect(await client.call('delete_category', { id: partner, confirm: true })).toMatchObject({
      ok: false,
      error: expect.stringContaining('cannot be deleted'),
    });
    expect(
      (await client.call('delete_category', { id: alice.fixtures.categoryId, confirm: true })).ok,
    ).toBe(true);
    expect(categoryRow(app, partner)).toBeDefined();
  });
});

describe('create_rule / update_rule', () => {
  const conditionError = async (condition: Record<string, unknown>) => {
    const { alice, client } = await setup();
    return client.call('create_rule', {
      ...validRule(alice.fixtures.categoryId),
      conditions: [condition],
    });
  };

  it('rejects an operator the field does not allow, naming the condition', async () => {
    expect(await conditionError({ field: 'amount', operator: 'contains', value: 5 })).toMatchObject(
      {
        ok: false,
        error: expect.stringMatching(
          /^conditions\[0\]: operator "contains" is not allowed for field "amount"/,
        ),
      },
    );
  });

  it('rejects a malformed between', async () => {
    for (const value of [[10, 5], [1], 7]) {
      expect(await conditionError({ field: 'amount', operator: 'between', value })).toMatchObject({
        ok: false,
        error: expect.stringMatching(/^conditions\[0\]: "between" needs \[min, max\]/),
      });
    }
  });

  it('rejects a regex that does not compile', async () => {
    expect(
      await conditionError({ field: 'description', operator: 'regex', value: '(open' }),
    ).toMatchObject({
      ok: false,
      error: 'conditions[0]: regex does not compile',
    });
  });

  it('rejects a rule with no conditions, naming the field', async () => {
    const { alice, client } = await setup();
    expect(
      await client.call('create_rule', { ...validRule(alice.fixtures.categoryId), conditions: [] }),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/at conditions$/),
    });
  });

  it('rejects a target category that is foreign, missing or archived', async () => {
    const { app, alice, bob, client } = await setup();
    const archived = await client.value<Row>('create_category', { name: 'Old', kind: 'expense' });
    app.db.update(categories).set({ archived: true }).where(eq(categories.id, archived.id)).run();

    for (const [categoryId, message] of [
      [bob.fixtures.categoryId, 'action.setCategoryId: unknown category id'],
      [999_999, 'action.setCategoryId: unknown category id'],
      [archived.id, 'action.setCategoryId: that category is archived'],
    ] as const) {
      expect(await client.call('create_rule', validRule(categoryId))).toEqual({
        ok: false,
        error: message,
      });
    }
    const rule = await client.value<Row>('create_rule', validRule(alice.fixtures.categoryId));
    expect(
      await client.call('update_rule', { id: rule.id, action: { setCategoryId: archived.id } }),
    ).toEqual({
      ok: false,
      error: 'action.setCategoryId: that category is archived',
    });
    expect(
      await client.call('update_rule', {
        id: rule.id,
        conditions: [{ field: 'amount', operator: 'regex', value: 'x' }],
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/^conditions\[0\]: /) });
  });

  it('changes no transaction when a rule is saved', async () => {
    const { app, alice, client } = await setup();
    const before = transactionSnapshot(app);

    const rule = await client.value<Row>('create_rule', {
      ...validRule(alice.fixtures.categoryId),
      conditions: [{ field: 'description', operator: 'contains', value: 'leg' }],
    });
    await client.value('update_rule', { id: rule.id, name: 'Legs' });

    expect(transactionSnapshot(app)).toEqual(before);
  });

  it('puts a rule without a priority after every existing rule', async () => {
    const { client, alice } = await setup();
    await client.value('create_rule', { ...validRule(alice.fixtures.categoryId), priority: 40 });

    const placed = await client.value<Row>('create_rule', validRule(alice.fixtures.categoryId));

    expect(placed['priority']).toBe(41);
  });

  it('disables with enabled: false, returns the previous rule, and run_rules then ignores it', async () => {
    const { client, alice } = await setup();
    const rule = await client.value<Row>('create_rule', {
      ...validRule(alice.fixtures.categoryId),
      conditions: [{ field: 'description', operator: 'contains', value: 'leg' }],
    });
    expect((await client.value<{ total: number }>('run_rules')).total).toBe(2);

    const result = await client.value<{ previous: Row; current: Row }>('update_rule', {
      id: rule.id,
      enabled: false,
    });

    expect(result.previous).toMatchObject({ enabled: true });
    expect(result.current).toMatchObject({ enabled: false });
    expect((await client.value<{ total: number }>('run_rules')).total).toBe(0);
  });
});

describe('delete_rule', () => {
  it('writes nothing without confirm; with confirm it deletes and the categorised rows keep their category', async () => {
    const { app, alice, client } = await setup();
    const rule = await client.value<Row>('create_rule', {
      ...validRule(alice.fixtures.categoryId),
      conditions: [{ field: 'description', operator: 'contains', value: 'leg' }],
    });
    await client.value('run_rules', { confirm: true });
    const categorised = transactionSnapshot(app);

    expect(await client.value('delete_rule', { id: rule.id })).toMatchObject({
      wouldDelete: { id: rule.id },
    });
    expect(app.db.select().from(rules).where(eq(rules.id, rule.id)).get()).toBeDefined();

    await client.value('delete_rule', { id: rule.id, confirm: true });

    expect(app.db.select().from(rules).where(eq(rules.id, rule.id)).get()).toBeUndefined();
    expect(transactionSnapshot(app)).toEqual(categorised);
  });
});

describe('editing tools: isolation', () => {
  it("every tool refuses another user's ids", async () => {
    const { app, bob, client } = await setup();
    const bobsRule = app.db
      .insert(rules)
      .values({
        userId: bob.session.id,
        name: 'Bob',
        priority: 1,
        enabled: true,
        continueOnMatch: false,
        conditions: [{ field: 'description', operator: 'contains', value: 'x' }],
        action: { setCategoryId: bob.fixtures.categoryId },
      })
      .returning({ id: rules.id })
      .get().id;
    const bobsCategory = bob.fixtures.categoryId;
    const before = {
      category: categoryRow(app, bobsCategory),
      rule: app.db.select().from(rules).where(eq(rules.id, bobsRule)).get(),
    };

    const calls: [string, Record<string, unknown>][] = [
      ['update_category', { id: bobsCategory, name: 'Mine now' }],
      ['delete_category', { id: bobsCategory }],
      ['delete_category', { id: bobsCategory, confirm: true }],
      ['create_rule', validRule(bobsCategory)],
      ['update_rule', { id: bobsRule, name: 'Mine now' }],
      ['delete_rule', { id: bobsRule }],
      ['delete_rule', { id: bobsRule, confirm: true }],
    ];
    for (const [name, args] of calls) {
      expect(await client.call(name, args), name).toMatchObject({
        ok: false,
        error: expect.stringMatching(/[Uu]nknown/),
      });
    }
    expect(categoryRow(app, bobsCategory)).toEqual(before.category);
    expect(app.db.select().from(rules).where(eq(rules.id, bobsRule)).get()).toEqual(before.rule);
  });
});
