import { and, eq, is, sql } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import type { DrizzleDb } from '../db.js';
import { createTestUser, freshDatabase } from '../db.testing.js';
import * as schema from './index.js';
import {
  accounts,
  appSettings,
  categories,
  categoryComparisonSettings,
  categoryModel,
  categoryModelSettings,
  dashboardLayoutSettings,
  forecastSettings,
  importBatches,
  loans,
  mappingProfiles,
  recurringOverrides,
  rules,
  salaryMetadata,
  savingsGoals,
  transactions,
  transferSettings,
  transfers,
  uiPreferences,
  users,
} from './index.js';

/**
 * What the ported tables do once there is data in them (TICKET-SRV-02): the serialisation SQLite
 * needs and IndexedDB never did, the constraints Dexie never had, and the two properties that make
 * one installation safe for two people — isolation and a complete cascade.
 */

/** Bytes that are not all the same value, so a truncated or re-encoded blob cannot pass by luck. */
const patternedBytes = (length: number): Buffer => {
  const bytes = Buffer.alloc(length);
  for (let at = 0; at < length; at += 1) bytes[at] = (at * 31 + 7) % 256;
  return bytes;
};

/**
 * A real bank CSV's header row, as hostile as the ones this app actually imports: an embedded
 * quote, a newline inside a quoted field, and non-ASCII. Both keys and values, because
 * `Transaction.rawRow` is header-name -> cell-value.
 */
const AWKWARD_RAW_ROW: Record<string, string> = {
  'Omschrijving "vrije mededeling"': 'Betaling met "Bancontact"',
  'Adres\ntegenpartij': 'Grote Markt 1\n9000 Gent',
  Münt: '€ 12,34',
  'Naam tegenpartij': "Café L'Étoile — Ñuñoa",
  'Tab\tseparated': 'a\tb',
};

/** One row in every one of the nineteen tables, all owned by `userId`. */
const insertEveryTable = (db: DrizzleDb, userId: number): { transactionId: number } => {
  const accountId = db
    .insert(accounts)
    .values({
      userId,
      name: 'Checking',
      type: 'checking',
      openingBalance: 100,
      openingBalanceDate: '2026-01-01',
      color: '#4ADE80',
      icon: 'wallet',
      archived: false,
      coOwners: [{ name: 'Partner', ibans: ['BE68539007547034'], share: 0.5 }],
    })
    .returning({ id: accounts.id })
    .get().id;

  const categoryId = db
    .insert(categories)
    .values({
      userId,
      name: 'Groceries',
      kind: 'expense',
      color: '#4ADE80',
      icon: 'shopping-cart',
      archived: false,
      isSystem: true,
    })
    .returning({ id: categories.id })
    .get().id;

  const insertTransaction = (amount: number, fingerprint: string): number =>
    db
      .insert(transactions)
      .values({
        userId,
        accountId,
        bookingDate: '2026-02-03',
        amount,
        rawDescription: 'CARREFOUR',
        fingerprint,
        createdAt: '2026-02-03T10:00:00.000Z',
        rawRow: AWKWARD_RAW_ROW,
        attributionOverride: { mode: 'shared', jointAccountId: accountId },
      })
      .returning({ id: transactions.id })
      .get().id;

  const transactionId = insertTransaction(-12.34, `fp-${userId}-a`);
  const counterpartId = insertTransaction(12.34, `fp-${userId}-b`);

  db.insert(transfers)
    .values({
      userId,
      fromTransactionId: transactionId,
      toTransactionId: counterpartId,
      method: 'auto-iban',
      confidence: 'high',
      linkedAt: '2026-02-04T10:00:00.000Z',
    })
    .run();

  db.insert(rules)
    .values({
      userId,
      name: 'Groceries',
      priority: 1,
      enabled: true,
      continueOnMatch: false,
      conditionMatch: 'all',
      conditions: [{ field: 'description', operator: 'contains', value: 'CARREFOUR' }],
      action: { setCategoryId: categoryId },
    })
    .run();

  db.insert(mappingProfiles)
    .values({
      userId,
      name: 'KBC',
      bankPreset: 'kbc',
      headerSignature: ['Rekeningnummer', 'Boekingsdatum'],
      delimiter: ';',
      decimalSeparator: ',',
      dateFormat: 'DD/MM/YYYY',
      encoding: 'windows-1252',
      headerRows: 1,
      signConvention: 'as-is',
      columns: { date: 'Boekingsdatum', amount: 'Bedrag', description: 'Omschrijving' },
    })
    .run();

  db.insert(importBatches)
    .values({
      userId,
      accountId,
      fileName: 'kbc.csv',
      importedAt: '2026-02-03T10:00:00.000Z',
      rowsRead: 2,
      rowsAdded: 2,
      rowsDuplicate: 0,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-03',
    })
    .run();

  db.insert(transferSettings)
    .values({ userId, matchWindowDays: 3, autoLinkMediumConfidence: true })
    .run();

  db.insert(categoryModel)
    .values({
      userId,
      modelTopology: patternedBytes(64),
      weightSpecs: patternedBytes(32),
      weightData: patternedBytes(128),
      categoryIdByIndex: [categoryId],
      featureConfig: { dim: 8192, charNgramMin: 3, charNgramMax: 5 },
      taxonomySignature: 'sig',
      metrics: { accuracy: 0.9, trainedSampleCount: 10, epochsRun: 3 },
      trainedAt: '2026-02-03T10:00:00.000Z',
      schemaVersion: 1,
    })
    .run();

  db.insert(categoryModelSettings).values({ userId, trainingWindowYears: 2 }).run();
  db.insert(categoryComparisonSettings)
    .values({ userId, excludedCategoryIds: [categoryId] })
    .run();
  db.insert(dashboardLayoutSettings)
    .values({ userId, rowOrder: ['stats', 'trend-chart'], hiddenRowIds: ['action-queue'] })
    .run();
  db.insert(appSettings)
    .values({
      userId,
      primaryColor: 'violet',
      currencySymbol: '€',
      currencySymbolPosition: 'before',
      locale: 'en-BE',
      excludedIncomeCategoryIds: [categoryId],
      recentRanges: [{ fromExpr: 'now-30d', toExpr: 'now' }],
    })
    .run();
  db.insert(uiPreferences)
    .values({ userId, themeStyle: 'memphis', hasVisited: true, backupReminderDismissed: false })
    .run();
  db.insert(salaryMetadata).values({ userId, yearMonth: '2026-02', grossWage: 4200 }).run();
  db.insert(savingsGoals)
    .values({
      userId,
      name: 'Kitchen',
      targetAmount: 8000,
      sortOrder: 1,
      archived: false,
      createdAt: '2026-01-01',
    })
    .run();
  db.insert(forecastSettings)
    .values({ userId, lookbackMonths: 6, basis: 'net-cash-flow', safetyNetAmount: 0 })
    .run();
  db.insert(loans)
    .values({
      userId,
      name: 'Mortgage',
      loanType: 'mortgage',
      principal: 250000,
      interestRate: 3.5,
      termMonths: 240,
      startDate: '2020-06-01',
      categoryId,
      archived: false,
      sortOrder: 0,
    })
    .run();
  db.insert(recurringOverrides)
    .values({
      userId,
      kind: 'dismissed',
      anchorTransactionId: transactionId,
      createdAt: '2026-02-05T10:00:00.000Z',
    })
    .run();

  return { transactionId };
};

/** Every entity table, read off the barrel rather than listed — the `dexie-parity.spec.ts` rule. */
const entityTables = (Object.values(schema) as unknown[])
  .filter((value): value is SQLiteTable => is(value, SQLiteTable))
  .filter((table) => getTableConfig(table).name !== 'users')
  .filter((table) => getTableConfig(table).name !== 'sessions')
  .filter((table) => getTableConfig(table).name !== 'apiTokens');

const countFor = (db: DrizzleDb, table: SQLiteTable, userId: number): number => {
  const owner = getTableConfig(table).columns.find((column) => column.name === 'userId');
  return (
    db
      .select({ value: sql<number>`count(*)` })
      .from(table)
      .where(eq(owner!, userId))
      .get()?.value ?? 0
  );
};

describe('schema: JSON columns', () => {
  it('round-trips a raw CSV row whose keys and values hold quotes, newlines and non-ASCII', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    const { transactionId } = insertEveryTable(db, userId);

    const row = db.select().from(transactions).where(eq(transactions.id, transactionId)).get();

    expect(row?.rawRow).toEqual(AWKWARD_RAW_ROW);
    // Not just deep-equal: the keys themselves have to survive, in order.
    expect(Object.keys(row?.rawRow ?? {})).toEqual(Object.keys(AWKWARD_RAW_ROW));
  });

  it('round-trips every other nested shape unchanged', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    insertEveryTable(db, userId);

    expect(db.select().from(accounts).get()?.coOwners).toEqual([
      { name: 'Partner', ibans: ['BE68539007547034'], share: 0.5 },
    ]);
    expect(db.select().from(transactions).get()?.attributionOverride).toEqual({
      mode: 'shared',
      jointAccountId: db.select().from(accounts).get()?.id,
    });
    expect(db.select().from(rules).get()).toMatchObject({
      conditions: [{ field: 'description', operator: 'contains', value: 'CARREFOUR' }],
      action: { setCategoryId: db.select().from(categories).get()?.id },
    });
    expect(db.select().from(mappingProfiles).get()).toMatchObject({
      headerSignature: ['Rekeningnummer', 'Boekingsdatum'],
      columns: { date: 'Boekingsdatum', amount: 'Bedrag', description: 'Omschrijving' },
    });
    expect(db.select().from(dashboardLayoutSettings).get()).toMatchObject({
      rowOrder: ['stats', 'trend-chart'],
      hiddenRowIds: ['action-queue'],
    });
    expect(db.select().from(appSettings).get()?.recentRanges).toEqual([
      { fromExpr: 'now-30d', toExpr: 'now' },
    ]);
  });

  it('reads a user with no appSettings row as every field unset, the DEFAULT_APP_SETTINGS tri-state', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');

    expect(
      db.select().from(appSettings).where(eq(appSettings.userId, userId)).get(),
    ).toBeUndefined();
  });
});

describe('schema: categoryModel blob columns', () => {
  const insertArtifact = (db: DrizzleDb, userId: number, weightData: Buffer): void => {
    db.insert(categoryModel)
      .values({
        userId,
        modelTopology: patternedBytes(16),
        weightSpecs: patternedBytes(16),
        weightData,
        categoryIdByIndex: [1, 2],
        featureConfig: { dim: 8192, charNgramMin: 3, charNgramMax: 5 },
        taxonomySignature: 'sig',
        metrics: { accuracy: 0.9, trainedSampleCount: 10 },
        trainedAt: '2026-02-03T10:00:00.000Z',
        schemaVersion: 1,
      })
      .run();
  };

  it('round-trips an ArrayBuffer byte for byte', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    const source: ArrayBuffer = patternedBytes(1024).buffer as ArrayBuffer;
    insertArtifact(db, userId, Buffer.from(source));

    const stored = db.select().from(categoryModel).get()?.weightData;

    expect(Buffer.from(stored!).equals(Buffer.from(source))).toBe(true);
  });

  it('round-trips a multi-megabyte artifact — the DAT-05 weight loss cannot recur here', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    const source = patternedBytes(4 * 1024 * 1024);
    insertArtifact(db, userId, source);

    const stored = db.select().from(categoryModel).get()?.weightData;

    expect(stored?.byteLength).toBe(source.byteLength);
    expect(Buffer.from(stored!).equals(source)).toBe(true);
    // The bug DAT-05 recorded: JSON.stringify turns an ArrayBuffer into `{}`.
    expect(JSON.stringify(source.buffer)).toBe('{}');
  });
});

describe('schema: salaryMetadata uniqueness', () => {
  it('rejects a second row for the same user and month', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    db.insert(salaryMetadata).values({ userId, yearMonth: '2026-02', grossWage: 4200 }).run();

    expect(() =>
      db.insert(salaryMetadata).values({ userId, yearMonth: '2026-02', grossWage: 4300 }).run(),
    ).toThrow(/UNIQUE/i);
  });

  it('lets the repository upsert by month rather than throwing', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    db.insert(salaryMetadata).values({ userId, yearMonth: '2026-02', grossWage: 4200 }).run();

    db.insert(salaryMetadata)
      .values({ userId, yearMonth: '2026-02', grossWage: 4300 })
      .onConflictDoUpdate({
        target: [salaryMetadata.userId, salaryMetadata.yearMonth],
        set: { grossWage: 4300 },
      })
      .run();

    const rows = db.select().from(salaryMetadata).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.grossWage).toBe(4300);
  });

  it('leaves two users free to each have the same month', () => {
    const { db } = freshDatabase();
    const first = createTestUser(db, 'a');
    const second = createTestUser(db, 'b');

    db.insert(salaryMetadata).values({ userId: first, yearMonth: '2026-02' }).run();
    db.insert(salaryMetadata).values({ userId: second, yearMonth: '2026-02' }).run();

    expect(db.select().from(salaryMetadata).all()).toHaveLength(2);
  });
});

describe('schema: reimbursement lookup', () => {
  it('seeks the extracted column through an index instead of scanning the JSON', () => {
    const { sqlite, db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    insertEveryTable(db, userId);

    const plan = sqlite
      .prepare(
        'EXPLAIN QUERY PLAN SELECT id FROM transactions WHERE userId = ? AND reimbursementTransferId = ?',
      )
      .all(userId, 1) as { detail: string }[];

    expect(plan.map((step) => step.detail).join(' ')).toContain(
      'transactions_userId_reimbursementTransferId_idx',
    );
  });
});

describe('schema: per-user isolation', () => {
  it('gives each user their own rows in all nineteen tables, invisible to the other', () => {
    const { db } = freshDatabase();
    const first = createTestUser(db, 'a');
    const second = createTestUser(db, 'b');
    insertEveryTable(db, first);
    insertEveryTable(db, second);

    for (const table of entityTables) {
      const name = getTableConfig(table).name;
      expect(countFor(db, table, first), `${name} for the first user`).toBeGreaterThan(0);
      expect(countFor(db, table, second), `${name} for the second user`).toBeGreaterThan(0);
      expect(countFor(db, table, first), `${name} is not shared`).toBe(countFor(db, table, second));
    }

    // And the ids really are distinct rows, not one row seen twice.
    expect(
      db
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, first), eq(accounts.name, 'Checking')))
        .all(),
    ).toHaveLength(1);
  });
});

describe('schema: user deletion', () => {
  it('cascades across all nineteen tables and leaves the other user untouched', () => {
    const { sqlite, db } = freshDatabase();
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1);

    const first = createTestUser(db, 'a');
    const second = createTestUser(db, 'b');
    insertEveryTable(db, first);
    insertEveryTable(db, second);

    db.delete(users).where(eq(users.id, first)).run();

    for (const table of entityTables) {
      const name = getTableConfig(table).name;
      expect(countFor(db, table, first), `${name} still holds deleted rows`).toBe(0);
      expect(countFor(db, table, second), `${name} lost the surviving user's rows`).toBeGreaterThan(
        0,
      );
    }
  });
});
