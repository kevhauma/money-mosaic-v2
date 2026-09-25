import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { DrizzleDb } from '../db.js';
import { createTestUser, freshDatabase } from '../db.testing.js';
import { accounts } from '../schema/accounts.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import {
  cleanupTransfersForRemovedTransactions,
  doomedTransactions,
  removeTransactionsWithTransferCleanup,
} from './transfer-cleanup.js';

/**
 * The client's `transfer-cleanup.service.spec.ts`, ported (TICKET-SRV-04) — the same cases,
 * asserted against real SQLite rows instead of mocked repository calls. The old spec could only
 * check that `update(20, { transferId: undefined })` was *called*; here the surviving leg is read
 * back, with foreign keys on, so an incomplete cleanup fails rather than passing quietly.
 */

type Fixture = {
  readonly db: DrizzleDb;
  readonly userId: number;
  /** Inserts a transaction, optionally already carrying a transferId, and returns its id. */
  readonly transaction: (transferId?: number) => number;
  /** Links two transactions, stamping both legs the way the link endpoint does. */
  readonly transfer: (from: number, to: number) => number;
  readonly rowsOf: () => { id: number; transferId: number | null }[];
  readonly transferIds: () => number[];
};

const setup = (): Fixture => {
  const { db } = freshDatabase();
  const userId = createTestUser(db, 'owner@example.com');
  const accountId = db
    .insert(accounts)
    .values({
      userId,
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

  let sequence = 0;
  const transaction = (transferId?: number): number => {
    sequence += 1;
    return db
      .insert(transactions)
      .values({
        userId,
        accountId,
        bookingDate: '2026-03-01',
        amount: -10 * sequence,
        currency: 'EUR',
        rawDescription: `Row ${sequence}`,
        fingerprint: `fp-${sequence}`,
        createdAt: '2026-03-01T10:00:00.000Z',
        transferId: transferId ?? null,
      })
      .returning({ id: transactions.id })
      .get().id;
  };

  const transfer = (from: number, to: number): number => {
    const id = db
      .insert(transfers)
      .values({
        userId,
        fromTransactionId: from,
        toTransactionId: to,
        method: 'manual',
        confidence: 'manual',
        linkedAt: '2026-03-02T09:00:00.000Z',
      })
      .returning({ id: transfers.id })
      .get().id;

    for (const legId of [from, to]) {
      db.update(transactions).set({ transferId: id }).where(eq(transactions.id, legId)).run();
    }
    return id;
  };

  return {
    db,
    userId,
    transaction,
    transfer,
    rowsOf: () =>
      db
        .select({ id: transactions.id, transferId: transactions.transferId })
        .from(transactions)
        // Ordered explicitly: an index scan is free to answer in whatever order it likes.
        .orderBy(transactions.id)
        .all(),
    transferIds: () =>
      db
        .select({ id: transfers.id })
        .from(transfers)
        .all()
        .map((row) => row.id),
  };
};

describe('cleanupTransfersForRemovedTransactions', () => {
  it('is a no-op when none of the removed transactions carry a transferId', () => {
    const fixture = setup();
    const first = fixture.transaction();
    const second = fixture.transaction();

    const result = fixture.db.transaction((tx) =>
      cleanupTransfersForRemovedTransactions(tx, [{ id: first }, { id: second }], fixture.userId),
    );

    expect(result).toEqual({ unlinkedTransferIds: [], clearedTransferTransactionIds: [] });
    expect(fixture.rowsOf()).toEqual([
      { id: first, transferId: null },
      { id: second, transferId: null },
    ]);
  });

  it("removes the transfer and clears the surviving side's transferId when it isn't also being removed", () => {
    const fixture = setup();
    const doomed = fixture.transaction();
    const surviving = fixture.transaction();
    const transferId = fixture.transfer(doomed, surviving);

    const result = fixture.db.transaction((tx) =>
      cleanupTransfersForRemovedTransactions(tx, [{ id: doomed, transferId }], fixture.userId),
    );

    expect(result).toEqual({
      unlinkedTransferIds: [transferId],
      clearedTransferTransactionIds: [surviving],
    });
    expect(fixture.transferIds()).toEqual([]);
    expect(fixture.rowsOf()).toEqual([
      // The doomed row keeps its stale transferId: this half only repairs what survives.
      { id: doomed, transferId },
      { id: surviving, transferId: null },
    ]);
  });

  it('removes the transfer but leaves the surviving side alone when it is also in the doomed set', () => {
    const fixture = setup();
    const first = fixture.transaction();
    const second = fixture.transaction();
    const transferId = fixture.transfer(first, second);

    const result = fixture.db.transaction((tx) =>
      cleanupTransfersForRemovedTransactions(
        tx,
        [
          { id: first, transferId },
          { id: second, transferId },
        ],
        fixture.userId,
      ),
    );

    expect(result).toEqual({
      unlinkedTransferIds: [transferId],
      clearedTransferTransactionIds: [],
    });
    expect(fixture.transferIds()).toEqual([]);
  });

  it('de-duplicates a transferId shared across multiple removed rows', () => {
    const fixture = setup();
    const doomed = fixture.transaction();
    const surviving = fixture.transaction();
    const transferId = fixture.transfer(doomed, surviving);
    const alsoDoomed = fixture.transaction(transferId);

    const result = fixture.db.transaction((tx) =>
      cleanupTransfersForRemovedTransactions(
        tx,
        [
          { id: doomed, transferId },
          { id: alsoDoomed, transferId },
        ],
        fixture.userId,
      ),
    );

    // One transfer, reported once, and the surviving leg cleared once.
    expect(result).toEqual({
      unlinkedTransferIds: [transferId],
      clearedTransferTransactionIds: [surviving],
    });
  });

  it("never touches another user's transfer, even when its id is handed in", () => {
    const fixture = setup();
    const doomed = fixture.transaction();
    const surviving = fixture.transaction();
    const transferId = fixture.transfer(doomed, surviving);

    const intruder = createTestUser(fixture.db, 'intruder@example.com');
    const result = fixture.db.transaction((tx) =>
      cleanupTransfersForRemovedTransactions(tx, [{ id: doomed, transferId }], intruder),
    );

    expect(result).toEqual({ unlinkedTransferIds: [], clearedTransferTransactionIds: [] });
    expect(fixture.transferIds()).toEqual([transferId]);
  });
});

describe('removeTransactionsWithTransferCleanup', () => {
  it('cleans up transfers, then removes exactly the given transactions', () => {
    const fixture = setup();
    const doomed = fixture.transaction();
    const surviving = fixture.transaction();
    const transferId = fixture.transfer(doomed, surviving);

    const result = fixture.db.transaction((tx) =>
      removeTransactionsWithTransferCleanup(tx, [{ id: doomed, transferId }], fixture.userId),
    );

    expect(result).toEqual({
      removedTransactionIds: [doomed],
      unlinkedTransferIds: [transferId],
      clearedTransferTransactionIds: [surviving],
    });
    expect(fixture.transferIds()).toEqual([]);
    expect(fixture.rowsOf()).toEqual([{ id: surviving, transferId: null }]);
  });

  it('is a safe no-op for an empty selection', () => {
    const fixture = setup();
    const kept = fixture.transaction();

    const result = fixture.db.transaction((tx) =>
      removeTransactionsWithTransferCleanup(tx, [], fixture.userId),
    );

    expect(result).toEqual({
      removedTransactionIds: [],
      unlinkedTransferIds: [],
      clearedTransferTransactionIds: [],
    });
    expect(fixture.rowsOf()).toEqual([{ id: kept, transferId: null }]);
  });
});

describe('doomedTransactions', () => {
  it("reads only the signed-in user's rows matching the filter", () => {
    const fixture = setup();
    const first = fixture.transaction();
    const second = fixture.transaction();
    const intruder = createTestUser(fixture.db, 'intruder@example.com');

    expect(doomedTransactions(fixture.db, fixture.userId, eq(transactions.amount, -10))).toEqual([
      { id: first, transferId: null },
    ]);
    expect(second).toBeGreaterThan(first);
    expect(doomedTransactions(fixture.db, intruder, eq(transactions.amount, -10))).toEqual([]);
  });
});
