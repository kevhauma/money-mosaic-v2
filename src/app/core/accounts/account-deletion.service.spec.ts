import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { withApiTesting } from '@/core/data-access/api-client.testing';
import { AccountDeletionService, type ClearTransactionsResult } from './account-deletion.service';

const EMPTY: ClearTransactionsResult = {
  removedTransactionIds: [],
  unlinkedTransferIds: [],
  clearedTransferTransactionIds: [],
};

describe('AccountDeletionService', () => {
  withApiTesting();

  const service = (): AccountDeletionService => TestBed.inject(AccountDeletionService);

  const answerWith = async (
    call: Promise<ClearTransactionsResult>,
    expected: { method: string; url: string },
    report: ClearTransactionsResult,
  ): Promise<ClearTransactionsResult> => {
    const request = TestBed.inject(HttpTestingController).expectOne(expected.url);

    expect(request.request.method).toBe(expected.method);
    request.flush(report);

    return call;
  };

  /**
   * The account row survives a clear (TICKET-ACC-01): the user re-imports a corrected export onto a
   * clean slate while keeping the account's settings and mapping profiles. That is why it is its own
   * endpoint rather than a delete — and `expectOne` is what proves the delete was not called too.
   */
  it("clears the account's transactions through the endpoint that keeps the account row", async () => {
    const result = await answerWith(
      service().clearTransactions(3),
      { method: 'POST', url: '/api/accounts/3/transactions/delete' },
      { ...EMPTY, removedTransactionIds: [10, 11] },
    );

    expect(result.removedTransactionIds).toEqual([10, 11]);
  });

  /**
   * A removed transaction may have been auto-linked to one in a *different* account (FR-TRF-2 links
   * across the whole dataset), so the surviving side is un-linked rather than left with a dangling
   * `transferId`. The cascade is the endpoint's, in one transaction; what this service owes its
   * callers is the report, because `AccountsStore` mirrors all three lists into their stores.
   */
  it('forwards the cascade report verbatim, for the stores to mirror', async () => {
    const report: ClearTransactionsResult = {
      removedTransactionIds: [10],
      unlinkedTransferIds: [5],
      clearedTransferTransactionIds: [20],
    };

    expect(
      await answerWith(
        service().clearTransactions(3),
        { method: 'POST', url: '/api/accounts/3/transactions/delete' },
        report,
      ),
    ).toEqual(report);
  });

  it('is a safe no-op when the account has no transactions', async () => {
    expect(
      await answerWith(
        service().clearTransactions(3),
        { method: 'POST', url: '/api/accounts/3/transactions/delete' },
        EMPTY,
      ),
    ).toEqual(EMPTY);
  });

  /**
   * Delete is "clear + remove the account row", one endpoint running the same cascade so the two
   * cannot drift. It answers **200 with that report** rather than a bare 204, which is the only way
   * `AccountsStore.removeAccount` can learn what went with the account.
   */
  it('deleteAccount removes the account and reports the same cascade', async () => {
    const report: ClearTransactionsResult = {
      removedTransactionIds: [10],
      unlinkedTransferIds: [5],
      clearedTransferTransactionIds: [20],
    };

    expect(
      await answerWith(
        service().deleteAccount(3),
        { method: 'DELETE', url: '/api/accounts/3' },
        report,
      ),
    ).toEqual(report);
  });
});
