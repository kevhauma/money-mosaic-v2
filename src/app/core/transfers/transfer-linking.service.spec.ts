import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { withApiTesting } from '@/core/data-access/api-client.testing';
import type { Transaction, Transfer } from '@/core/data-access';
import { TransferLinkingService, type TransferLinkResult } from './transfer-linking.service';
import type { TransferCandidate } from './transfer-matching';

const transaction = (id: number, overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id,
    accountId: 1,
    bookingDate: '2026-07-01',
    amount: -100,
    categoryId: 9,
    categoryManual: true,
    ...overrides,
  }) as Transaction;

/** What the endpoint answers with: the created transfer and both legs as they now stand. */
const linkResult = (transferId: number): TransferLinkResult => ({
  transfer: { id: transferId, fromTransactionId: 10, toTransactionId: 11 } as Transfer,
  updatedTransactions: [
    { id: 10, transferId } as Transaction,
    { id: 11, transferId } as Transaction,
  ],
});

describe('TransferLinkingService', () => {
  withApiTesting();

  const service = (): TransferLinkingService => TestBed.inject(TransferLinkingService);
  const http = (): HttpTestingController => TestBed.inject(HttpTestingController);

  const answerLink = async <T>(
    call: Promise<T>,
    response: unknown,
  ): Promise<{ body: T; sent: Record<string, unknown> }> => {
    const request = http().expectOne('/api/transfers/link');

    expect(request.request.method).toBe('POST');
    const sent = request.request.body as Record<string, unknown>;
    request.flush(response as never);

    return { body: await call, sent };
  };

  /**
   * A link is a `Transfer` row, a `transferId` on both legs and both legs' categories cleared
   * (TICKET-TRF-01) — one fact in two tables, so it is one endpoint in one transaction. The category
   * clearing is therefore asserted on the *response*: what the legs look like afterwards is what the
   * server says they look like, and the stores mirror that rather than a client-side guess.
   */
  it('linkManually posts both legs as a manual link', async () => {
    const { sent, body } = await answerLink(
      service().linkManually(transaction(10), transaction(11)),
      linkResult(42),
    );

    expect(sent).toEqual(
      expect.objectContaining({
        fromTransactionId: 10,
        toTransactionId: 11,
        method: 'manual',
        confidence: 'manual',
      }),
    );
    expect(body.transfer.id).toBe(42);
  });

  it('linkManually returns both legs as the endpoint left them', async () => {
    const { body } = await answerLink(
      service().linkManually(transaction(10), transaction(11)),
      linkResult(42),
    );

    expect(body.updatedTransactions.map((leg) => leg.transferId)).toEqual([42, 42]);
    expect(body.updatedTransactions.every((leg) => leg.categoryId === undefined)).toBe(true);
  });

  it('linkAuto posts an auto-iban high-confidence link (FR-TRF-2)', async () => {
    const { sent } = await answerLink(
      service().linkAuto(transaction(10), transaction(11), 'auto-iban', 'high'),
      linkResult(42),
    );

    expect(sent).toEqual(expect.objectContaining({ method: 'auto-iban', confidence: 'high' }));
  });

  it('linkAuto posts an auto-amountdate medium-confidence link (FR-TRF-3)', async () => {
    const { sent } = await answerLink(
      service().linkAuto(transaction(10), transaction(11), 'auto-amountdate', 'medium'),
      linkResult(42),
    );

    expect(sent).toEqual(
      expect.objectContaining({ method: 'auto-amountdate', confidence: 'medium' }),
    );
  });

  it('stamps the link with the moment it was made', async () => {
    const { sent } = await answerLink(
      service().linkManually(transaction(10), transaction(11)),
      linkResult(42),
    );

    expect(Date.parse(sent['linkedAt'] as string)).not.toBeNaN();
  });

  const candidate = (from: number, to: number): TransferCandidate => ({
    from: transaction(from),
    to: transaction(to),
    method: 'auto-iban',
    confidence: 'high',
  });

  /**
   * A whole auto-match pass is one request and one transaction (TICKET-PERF-04): one candidate's
   * write failing aborts the pass rather than leaving the dataset half-linked. Two candidates in one
   * body is what makes that true — `expectOne` fails if the pass is issued as a request per link.
   */
  it('linkAutoBatch sends the whole pass as one request', async () => {
    const settled = service().linkAutoBatch([candidate(10, 11), candidate(12, 13)]);
    const request = http().expectOne('/api/transfers/link/batch');

    expect(request.request.method).toBe('POST');
    const sent = request.request.body as Record<string, unknown>[];
    expect(sent).toHaveLength(2);
    request.flush([linkResult(42), linkResult(43)]);

    expect((await settled).map((link) => link.transfer.id)).toEqual([42, 43]);
  });

  it('linkAutoBatch stamps every link of a pass with the same instant', async () => {
    const settled = service().linkAutoBatch([candidate(10, 11), candidate(12, 13)]);
    const request = http().expectOne('/api/transfers/link/batch');
    const sent = request.request.body as { linkedAt: string }[];

    expect(sent[0].linkedAt).toBe(sent[1].linkedAt);
    request.flush([linkResult(42), linkResult(43)]);
    await settled;
  });

  it('linkAutoBatch surfaces a refused pass as a rejection carrying the server message', async () => {
    const settled = service().linkAutoBatch([candidate(10, 11), candidate(12, 13)]);
    http()
      .expectOne('/api/transfers/link/batch')
      .flush({ error: 'Not found' }, { status: 404, statusText: 'Not Found' });

    await expect(settled).rejects.toThrow('Not found');
  });

  /**
   * Unlinking leaves the category **empty** rather than re-running the rules engine (TICKET-TRF-01):
   * no pre-link category is persisted, so exact restoration is not possible. It also clears any
   * dangling `attributionOverride.reimbursementTransferId` that named this transfer (TICKET-TXN-03),
   * in the same transaction — and reports which rows it touched, since the stores mirror them.
   */
  it('unlink posts to the transfer that is being undone and reports the cleared overrides', async () => {
    const settled = service().unlink({ id: 42 } as Transfer);
    const request = http().expectOne('/api/transfers/42/unlink');

    expect(request.request.method).toBe('POST');
    request.flush({
      clearedAttributionOverrides: [{ id: 20, attributionOverride: { mode: 'shared' } }],
    });

    expect(await settled).toEqual({
      clearedAttributionOverrides: [{ id: 20, attributionOverride: { mode: 'shared' } }],
    });
  });

  it('unlink reports nothing cleared when no transaction referenced the transfer', async () => {
    const settled = service().unlink({ id: 42 } as Transfer);
    http().expectOne('/api/transfers/42/unlink').flush({ clearedAttributionOverrides: [] });

    expect(await settled).toEqual({ clearedAttributionOverrides: [] });
  });
});
