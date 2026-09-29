import { Injectable, inject } from '@angular/core';
import { ApiClient, type Transaction, type Transfer } from '@/core/data-access';
import type { TransferCandidate } from './transfer-matching';

export type TransferLinkResult = {
  transfer: Transfer;
  updatedTransactions: [Transaction, Transaction];
};

/** What a link is, as one request body — the `Transfer` to create, minus its id. */
type TransferLinkBody = Omit<Transfer, 'id'>;

/**
 * Linking, unlinking and the auto-link pass, each **one endpoint in one transaction**
 * (TICKET-SRV-04).
 *
 * A link is a `Transfer` row *and* a `transferId` stamped on both legs *and* both legs' categories
 * cleared (TICKET-TRF-01, since a transfer is neither spending nor income). That is one fact in two
 * tables: written as separate requests, a dropped connection between them leaves a transaction
 * pointing at a transfer that does not exist, which every balance and transfer view then reads as
 * truth. So this service holds no write logic of its own any more — each method is the call, and the
 * response is the rows as they now stand.
 */
@Injectable({ providedIn: 'root' })
export class TransferLinkingService {
  private readonly api = inject(ApiClient);

  private readonly linkBody = (
    fromTransaction: Transaction,
    toTransaction: Transaction,
    method: Transfer['method'],
    confidence: Transfer['confidence'],
    linkedAt: string,
  ): TransferLinkBody => ({
    fromTransactionId: fromTransaction.id!,
    toTransactionId: toTransaction.id!,
    method,
    confidence,
    linkedAt,
  });

  linkManually = (
    fromTransaction: Transaction,
    toTransaction: Transaction,
  ): Promise<TransferLinkResult> =>
    this.api.post<TransferLinkResult>(
      '/transfers/link',
      this.linkBody(fromTransaction, toTransaction, 'manual', 'manual', new Date().toISOString()),
    );

  /** Links a pair found by the auto-matching engine (FR-TRF-2, FR-TRF-3). */
  linkAuto = (
    fromTransaction: Transaction,
    toTransaction: Transaction,
    method: Extract<Transfer['method'], 'auto-iban' | 'auto-amountdate'>,
    confidence: Extract<Transfer['confidence'], 'high' | 'medium'>,
  ): Promise<TransferLinkResult> =>
    this.api.post<TransferLinkResult>(
      '/transfers/link',
      this.linkBody(fromTransaction, toTransaction, method, confidence, new Date().toISOString()),
    );

  /**
   * A whole auto-match pass in one transaction (the property TICKET-PERF-04 gave this method): one
   * candidate's write failing aborts the pass — zero new transfer rows, zero stamped legs — rather
   * than leaving the dataset half-linked. Every link of a pass carries the same `linkedAt`, which is
   * why the instant is read once here rather than per candidate.
   */
  linkAutoBatch = (candidates: TransferCandidate[]): Promise<TransferLinkResult[]> => {
    const linkedAt = new Date().toISOString();
    return this.api.post<TransferLinkResult[]>(
      '/transfers/link/batch',
      candidates.map((candidate) =>
        this.linkBody(
          candidate.from,
          candidate.to,
          candidate.method,
          candidate.confidence,
          linkedAt,
        ),
      ),
    );
  };

  /**
   * Decision (TICKET-TRF-01): unlinking leaves the category **empty** rather than re-running the
   * rules engine. No pre-link category is persisted, so exact restoration is not possible, and
   * re-suggesting one would need a deliberate action of its own.
   *
   * Also clears any transaction's dangling `attributionOverride.reimbursementTransferId` that
   * pointed at this transfer (TICKET-TXN-03) — the reference would otherwise name nothing, silently
   * un-suppressing a leg that was never re-checked. `mode`/`jointAccountId` are kept; only the stale
   * reference is dropped, in the same transaction as the unlink.
   */
  unlink = (
    transfer: Transfer,
  ): Promise<{
    clearedAttributionOverrides: {
      id: number;
      attributionOverride: Transaction['attributionOverride'];
    }[];
  }> => this.api.post(`/transfers/${transfer.id!}/unlink`, {});
}
