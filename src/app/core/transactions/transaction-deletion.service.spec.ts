import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { withApiTesting } from '@/core/data-access/api-client.testing';
import type { Transaction } from '@/core/data-access';
import { TransactionDeletionService } from './transaction-deletion.service';

const transaction = (id: number, overrides: Partial<Transaction> = {}): Transaction =>
  ({ id, accountId: 1, bookingDate: '2026-07-01', ...overrides }) as Transaction;

const EMPTY = {
  removedTransactionIds: [],
  unlinkedTransferIds: [],
  clearedTransferTransactionIds: [],
};

describe('TransactionDeletionService: removeMany', () => {
  withApiTesting();

  const service = (): TransactionDeletionService => TestBed.inject(TransactionDeletionService);

  /** Answers `POST /api/transactions/delete`, handing back the ids it was asked to remove. */
  const removeAgainstApi = async (
    transactions: Transaction[],
    report: typeof EMPTY | Record<string, number[]>,
  ): Promise<{ ids: number[]; result: unknown }> => {
    const settled = service().removeMany(transactions);
    const request = TestBed.inject(HttpTestingController).expectOne('/api/transactions/delete');

    expect(request.request.method).toBe('POST');
    const { ids } = request.request.body as { ids: number[] };
    request.flush(report);

    return { ids, result: await settled };
  };

  /**
   * Not `DELETE /api/transactions/bulk`, which removes rows and leaves every transfer that linked
   * them pointing at nothing. This endpoint does both in one transaction (TICKET-SRV-04), which is
   * why deleting transactions is one request rather than this service orchestrating three.
   */
  it('sends exactly the selected ids to the cleanup endpoint', async () => {
    const { ids } = await removeAgainstApi([transaction(10), transaction(11)], {
      ...EMPTY,
      removedTransactionIds: [10, 11],
    });

    expect(ids).toEqual([10, 11]);
  });

  it('forwards the cleanup report verbatim, for the stores to mirror', async () => {
    const report = {
      removedTransactionIds: [10],
      unlinkedTransferIds: [5],
      clearedTransferTransactionIds: [20],
    };

    const { result } = await removeAgainstApi([transaction(10, { transferId: 5 })], report);

    expect(result).toEqual(report);
  });

  it('is a safe no-op for an empty selection', async () => {
    const { ids, result } = await removeAgainstApi([], EMPTY);

    expect(ids).toEqual([]);
    expect(result).toEqual(EMPTY);
  });
});
