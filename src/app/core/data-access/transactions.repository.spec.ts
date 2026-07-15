import { appDb, type Transaction } from './app-db';
import { TransactionsRepository } from './transactions.repository';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -10,
  currency: 'EUR',
  rawDescription: 'Test',
  fingerprint: `fp-${Math.random()}`,
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

describe('TransactionsRepository', () => {
  const repository = new TransactionsRepository();

  afterEach(async () => {
    await appDb.transactions.clear();
  });

  describe('getByImportBatch', () => {
    it('returns exactly the batch rows via the importBatchId index', async () => {
      await appDb.transactions.bulkAdd([
        transaction({ importBatchId: 1 }),
        transaction({ importBatchId: 1 }),
        transaction({ importBatchId: 2 }),
        transaction({}),
      ]);

      const rows = await repository.getByImportBatch(1);

      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.importBatchId === 1)).toBe(true);
    });

    it('returns an empty array for a batch with no rows', async () => {
      await appDb.transactions.bulkAdd([transaction({ importBatchId: 1 })]);

      expect(await repository.getByImportBatch(999)).toEqual([]);
    });
  });

  describe('getByReimbursementTransferId', () => {
    it('returns the overriding transaction via the dotted-keypath index', async () => {
      await appDb.transactions.bulkAdd([
        transaction({
          attributionOverride: { mode: 'shared', reimbursementTransferId: 42 },
        }),
        transaction({ attributionOverride: { mode: 'personal' } }),
        transaction({}),
      ]);

      const rows = await repository.getByReimbursementTransferId(42);

      expect(rows).toHaveLength(1);
      expect(rows[0].attributionOverride?.reimbursementTransferId).toBe(42);
    });

    it('returns an empty array when no transaction reimburses that transfer', async () => {
      await appDb.transactions.bulkAdd([transaction({})]);

      expect(await repository.getByReimbursementTransferId(1)).toEqual([]);
    });
  });
});
