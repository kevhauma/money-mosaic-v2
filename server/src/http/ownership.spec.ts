import { getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import { createTestUser, freshDatabase } from '../db.testing.js';
import { accounts } from '../schema/accounts.js';
import * as schema from '../schema/index.js';
import { ownsRow, referencesOf } from './ownership.js';

/**
 * What `referencesOf` derives, checked against the fields TICKET-SRV-03 enumerates by name.
 *
 * The derivation is the point — a hand-written list of foreign keys would stop matching the schema
 * the first time one was added. But a derivation that quietly returned *nothing* would also pass
 * every isolation test in `references.spec.ts`, since a check that never runs never wrongly
 * rejects. This is the assertion that says the set is neither smaller nor larger than it should be.
 */

/**
 * Every reference in the schema except the owner column, by table: the declared foreign keys plus
 * the soft references `ownership.ts` adds for the columns that are deliberately not foreign keys.
 */
const EXPECTED_REFERENCES: Record<string, string[]> = {
  transactions: ['accountId', 'categoryId', 'transferId', 'importBatchId'],
  transfers: ['fromTransactionId', 'toTransactionId'],
  recurringOverrides: ['anchorTransactionId', 'mergedIntoTransactionId'],
  loans: ['categoryId'],
  importBatches: ['accountId', 'mappingProfileId'],
  mappingProfiles: ['defaultAccountId'],
};

// Widened to `unknown` first: `Object.values` on the barrel yields a union of every concrete table
// type, which no single type predicate is assignable to (the `dexie-parity.spec.ts` convention).
const allTables = (Object.values(schema) as unknown[]).filter((value): value is SQLiteTable =>
  is(value, SQLiteTable),
);

describe('referencesOf', () => {
  it('derives exactly the foreign-key fields the ticket enumerates', () => {
    const derived = Object.fromEntries(
      allTables
        .map((table) => [getTableName(table), referencesOf(table).map(({ key }) => key)] as const)
        .filter(([, keys]) => keys.length > 0),
    );

    expect(derived).toEqual(EXPECTED_REFERENCES);
  });

  it('never treats the owner column as a reference to check', () => {
    expect(referencesOf(schema.transactions).map(({ key }) => key)).not.toContain('userId');
  });
});

describe('ownsRow', () => {
  it('answers for the owner only', () => {
    const { db } = freshDatabase();
    const alice = createTestUser(db, 'alice');
    const bob = createTestUser(db, 'bob');

    const accountId = db
      .insert(accounts)
      .values({
        userId: alice,
        name: 'Checking',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#0ea5e9',
        icon: 'bank',
        archived: false,
      })
      .returning({ id: accounts.id })
      .get().id;

    expect(ownsRow(db, accounts, accountId, alice)).toBe(true);
    expect(ownsRow(db, accounts, accountId, bob)).toBe(false);
    expect(ownsRow(db, accounts, accountId + 1, alice)).toBe(false);
  });
});
