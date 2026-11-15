import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { apiFetch, type TestApp } from '../app.testing.js';
import { ENTITY_SAMPLES, startTwoUserApp, type TestActor } from '../routes/samples.testing.js';
import { accounts } from '../schema/accounts.js';
import { appSettings } from '../schema/app-settings.js';
import { categories } from '../schema/categories.js';
import { loans } from '../schema/loans.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { rules } from '../schema/rules.js';
import { salaryMetadata } from '../schema/salary-metadata.js';
import { savingsGoals } from '../schema/savings-goals.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { DrizzleDb } from '../db.js';
import { connectMcp, type McpTestClient } from './mcp.testing.js';

type Row = { id: number };
type Page = {
  transactions: (Row & { bookingDate: string; category: Row | null })[];
  nextCursor: string | null;
};

const ids = (rows: readonly Row[]): number[] => rows.map((row) => row.id).sort((a, b) => a - b);

/** One row in every entity table the read tools cover, created through the API as the user. */
const fillTables = async (app: TestApp, actor: TestActor): Promise<void> => {
  for (const sample of ENTITY_SAMPLES) {
    const response = await apiFetch(app, sample.path, {
      as: actor.session,
      method: 'POST',
      body: sample.create(actor.fixtures),
    });
    expect(response.status, sample.path).toBe(201);
  }
};

type IdTable = SQLiteTable & { id: SQLiteColumn; userId: SQLiteColumn };

const ownIds = (db: DrizzleDb, table: IdTable, userId: number): number[] =>
  ids(db.select({ id: table.id }).from(table).where(eq(table.userId, userId)).all() as Row[]);

describe('read tools: isolation', () => {
  const readAll = async (client: McpTestClient) => ({
    accounts: await client.value<Row[]>('list_accounts'),
    categories: await client.value<Row[]>('list_categories', { includeArchived: true }),
    rules: await client.value<Row[]>('list_rules'),
    transactions: await client.value<Page>('search_transactions', {
      from: '1900-01-01',
      to: '2999-12-31',
      limit: 1000,
    }),
    loans: await client.value<Row[]>('get_loans'),
    future: await client.value<{ savingsGoals: Row[]; recurringOverrides: Row[] }>('get_future'),
    income: await client.value<{ salaryMetadata: Row[]; mainIncomeCategoryId: number | null }>(
      'get_income',
    ),
  });

  it("every read tool returns only the token user's rows", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    await fillTables(app, alice);
    await fillTables(app, bob);
    app.db
      .insert(appSettings)
      .values({ userId: alice.session.id, mainIncomeCategoryId: alice.fixtures.categoryId })
      .run();

    for (const [actor, other] of [
      [alice, bob],
      [bob, alice],
    ] as const) {
      const userId = actor.session.id;
      const read = await readAll(await connectMcp(app, userId));

      expect(ids(read.accounts)).toEqual(ownIds(app.db, accounts, userId));
      expect(ids(read.categories)).toEqual(ownIds(app.db, categories, userId));
      expect(ids(read.rules)).toEqual(ownIds(app.db, rules, userId));
      expect(ids(read.transactions.transactions)).toEqual(ownIds(app.db, transactions, userId));
      expect(ids(read.loans)).toEqual(ownIds(app.db, loans, userId));
      expect(ids(read.future.savingsGoals)).toEqual(ownIds(app.db, savingsGoals, userId));
      expect(ids(read.future.recurringOverrides)).toEqual(
        ownIds(app.db, recurringOverrides, userId),
      );
      expect(ids(read.income.salaryMetadata)).toEqual(ownIds(app.db, salaryMetadata, userId));
      // The premise: both users have rows, so "only mine" is not "nothing".
      expect(read.accounts).not.toHaveLength(0);
      expect(ids(read.accounts)).not.toEqual(ownIds(app.db, accounts, other.session.id));
    }

    expect(
      (
        await (
          await connectMcp(app, alice.session.id)
        ).value<{ mainIncomeCategoryId: number }>('get_income')
      ).mainIncomeCategoryId,
    ).toBe(alice.fixtures.categoryId);
    expect(
      (
        await (
          await connectMcp(app, bob.session.id)
        ).value<{ mainIncomeCategoryId: null }>('get_income')
      ).mainIncomeCategoryId,
    ).toBeNull();
  });

  it('names the category a rule assigns and a loan tracks', async () => {
    const { app, alice } = await startTwoUserApp();
    await fillTables(app, alice);
    const client = await connectMcp(app, alice.session.id);

    const [rule] = await client.value<{ category: { id: number; name: string } }[]>('list_rules');
    const [loan] = await client.value<{ categoryName: string }[]>('get_loans');

    expect(rule?.category).toEqual({ id: alice.fixtures.categoryId, name: 'Groceries' });
    expect(loan?.categoryName).toBe('Groceries');
  });
});

describe('list_categories', () => {
  it('hides archived categories unless includeArchived is set', async () => {
    const { app, alice } = await startTwoUserApp();
    app.db
      .update(categories)
      .set({ archived: true })
      .where(eq(categories.id, alice.fixtures.categoryId))
      .run();
    const client = await connectMcp(app, alice.session.id);

    expect(await client.value('list_categories')).toEqual([]);
    expect(ids(await client.value<Row[]>('list_categories', { includeArchived: true }))).toEqual([
      alice.fixtures.categoryId,
    ]);
  });
});

describe('search_transactions', () => {
  /** Inserts a transaction for the actor and returns its id. */
  const addRow = (
    app: TestApp,
    actor: TestActor,
    values: Partial<typeof transactions.$inferInsert> = {},
  ): number =>
    app.db
      .insert(transactions)
      .values({
        userId: actor.session.id,
        accountId: actor.fixtures.accountId,
        bookingDate: '2026-05-15',
        amount: -10,
        rawDescription: 'Row',
        fingerprint: `fp-${Math.random()}`,
        createdAt: '2026-05-15T00:00:00.000Z',
        ...values,
      })
      .returning({ id: transactions.id })
      .get().id;

  const setup = async () => {
    const context = await startTwoUserApp();
    // The seed rows are in March; these tests work in May so the seed stays out of the way.
    return { ...context, client: await connectMcp(context.app, context.alice.session.id) };
  };

  const search = (client: McpTestClient, args: Record<string, unknown>) =>
    client.value<Page>('search_transactions', { from: '2026-05-01', to: '2026-05-31', ...args });

  it('includes both ends of the date range', async () => {
    const { app, alice, client } = await setup();
    const first = addRow(app, alice, { bookingDate: '2026-05-01' });
    const last = addRow(app, alice, { bookingDate: '2026-05-31' });
    addRow(app, alice, { bookingDate: '2026-04-30' });
    addRow(app, alice, { bookingDate: '2026-06-01' });

    expect(ids((await search(client, {})).transactions)).toEqual([first, last]);
  });

  it('filters on accountIds and on categoryId', async () => {
    const { app, alice, client } = await setup();
    const otherAccount = app.db
      .insert(accounts)
      .values({
        userId: alice.session.id,
        name: 'Savings',
        type: 'savings',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#000',
        icon: 'bank',
        archived: false,
      })
      .returning({ id: accounts.id })
      .get().id;
    const inOther = addRow(app, alice, { accountId: otherAccount });
    const categorised = addRow(app, alice, { categoryId: alice.fixtures.categoryId });

    expect(ids((await search(client, { accountIds: [otherAccount] })).transactions)).toEqual([
      inOther,
    ]);
    expect(
      ids((await search(client, { categoryId: alice.fixtures.categoryId })).transactions),
    ).toEqual([categorised]);
  });

  it('uncategorised leaves out categorised and transfer-linked rows', async () => {
    const { app, alice, client } = await setup();
    const loose = addRow(app, alice);
    addRow(app, alice, { categoryId: alice.fixtures.categoryId });
    const legA = addRow(app, alice);
    const legB = addRow(app, alice, { amount: 10 });
    const transferId = app.db
      .insert(transfers)
      .values({
        userId: alice.session.id,
        fromTransactionId: legA,
        toTransactionId: legB,
        method: 'manual',
        confidence: 'manual',
        linkedAt: '2026-05-15T00:00:00.000Z',
      })
      .returning({ id: transfers.id })
      .get().id;
    app.db.update(transactions).set({ transferId }).where(eq(transactions.id, legA)).run();
    app.db.update(transactions).set({ transferId }).where(eq(transactions.id, legB)).run();

    expect(ids((await search(client, { uncategorised: true })).transactions)).toEqual([loose]);
  });

  it('text matches description, counterparty and notes, ignoring case', async () => {
    const { app, alice, client } = await setup();
    const byDescription = addRow(app, alice, { rawDescription: 'CARD Bakery Ghent' });
    const byCounterparty = addRow(app, alice, { counterpartyName: 'The BAKERY' });
    const byNotes = addRow(app, alice, { notes: 'birthday bakery run' });
    addRow(app, alice, { rawDescription: 'Butcher' });

    expect(ids((await search(client, { text: 'bakery' })).transactions)).toEqual([
      byDescription,
      byCounterparty,
      byNotes,
    ]);
  });

  it('pages with nextCursor, returning every row exactly once even when dates repeat', async () => {
    const { app, alice, client } = await setup();
    const created = [
      '2026-05-03',
      '2026-05-03',
      '2026-05-03',
      '2026-05-02',
      '2026-05-02',
      '2026-05-01',
      '2026-05-03',
    ].map((bookingDate) => addRow(app, alice, { bookingDate }));

    const seen: Page['transactions'] = [];
    let cursor: string | null | undefined;
    do {
      const page = await search(client, { limit: 2, ...(cursor ? { cursor } : {}) });
      seen.push(...page.transactions);
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(seen.map((row) => row.id).sort((a, b) => a - b)).toEqual(
      [...created].sort((a, b) => a - b),
    );
    // Newest first.
    expect(seen.map((row) => row.bookingDate)).toEqual(
      [...seen.map((row) => row.bookingDate)].sort().reverse(),
    );
  });

  it('defaults to 200 rows per page', async () => {
    const { app, alice, client } = await setup();
    for (let index = 0; index < 201; index++) addRow(app, alice);

    const page = await search(client, {});

    expect(page.transactions).toHaveLength(200);
    expect(page.nextCursor).not.toBeNull();
  });

  it('answers a tool error naming the field for bad input, not a 500', async () => {
    const { client } = await setup();

    const missing = await client.call('search_transactions', { from: '2026-05-01' });
    const malformed = await client.call('search_transactions', {
      from: '01/05/2026',
      to: '2026-05-31',
    });
    const overLimit = await client.call('search_transactions', {
      from: '2026-05-01',
      to: '2026-05-31',
      limit: 1001,
    });
    const badCursor = await client.call('search_transactions', {
      from: '2026-05-01',
      to: '2026-05-31',
      cursor: 'nope',
    });

    expect(missing).toMatchObject({ ok: false, error: expect.stringMatching(/at to$/) });
    expect(malformed).toMatchObject({ ok: false, error: expect.stringMatching(/at from$/) });
    expect(overLimit).toMatchObject({ ok: false, error: expect.stringMatching(/at limit$/) });
    expect(badCursor).toMatchObject({
      ok: false,
      error: expect.stringContaining('Invalid cursor'),
    });
  });

  it('returns the compact row shape without the bulky raw columns', async () => {
    const { app, alice, client } = await setup();
    addRow(app, alice, {
      rawLine: 'a;b;c',
      rawRow: { a: 'b' },
      categoryId: alice.fixtures.categoryId,
      categoryManual: true,
    });

    const [row] = (await search(client, {})).transactions;

    expect(row).toEqual({
      id: expect.any(Number),
      bookingDate: '2026-05-15',
      amount: -10,
      currency: 'EUR',
      account: { id: alice.fixtures.accountId, name: 'Checking' },
      counterpartyName: null,
      counterpartyIban: null,
      rawDescription: 'Row',
      category: { id: alice.fixtures.categoryId, name: 'Groceries' },
      categoryManual: true,
      transferId: null,
      notes: null,
    });
  });
});
