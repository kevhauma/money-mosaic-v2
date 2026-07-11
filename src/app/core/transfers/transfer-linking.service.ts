import { Injectable, inject } from '@angular/core';
import {
  appDb,
  TransactionsRepository,
  TransfersRepository,
  type Transaction,
  type Transfer,
} from '@/core/data-access';

export type TransferLinkResult = {
  transfer: Transfer;
  updatedTransactions: [Transaction, Transaction];
};

@Injectable({ providedIn: 'root' })
export class TransferLinkingService {
  private readonly transfersRepository = inject(TransfersRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);

  private readonly performLink = (
    fromTransaction: Transaction,
    toTransaction: Transaction,
    method: Transfer['method'],
    confidence: Transfer['confidence'],
  ): Promise<TransferLinkResult> =>
    appDb.transaction('rw', [appDb.transfers, appDb.transactions], async () => {
      const transfer: Transfer = {
        fromTransactionId: fromTransaction.id!,
        toTransactionId: toTransaction.id!,
        method,
        confidence,
        linkedAt: new Date().toISOString(),
      };
      const transferId = await this.transfersRepository.add(transfer);

      // A transfer can never carry a spending/income category (TICKET-TRF-01) — clear it here,
      // atomically with the transferId write, so a rule-assigned or manual category never survives a link.
      const clearedCategory = { transferId, categoryId: undefined, categoryManual: undefined };
      await this.transactionsRepository.update(fromTransaction.id!, clearedCategory);
      await this.transactionsRepository.update(toTransaction.id!, clearedCategory);

      return {
        transfer: { ...transfer, id: transferId },
        updatedTransactions: [
          { ...fromTransaction, ...clearedCategory },
          { ...toTransaction, ...clearedCategory },
        ],
      };
    });

  linkManually = (
    fromTransaction: Transaction,
    toTransaction: Transaction,
  ): Promise<TransferLinkResult> =>
    this.performLink(fromTransaction, toTransaction, 'manual', 'manual');

  /** Links a pair found by the auto-matching engine (FR-TRF-2, FR-TRF-3). */
  linkAuto = (
    fromTransaction: Transaction,
    toTransaction: Transaction,
    method: Extract<Transfer['method'], 'auto-iban' | 'auto-amountdate'>,
    confidence: Extract<Transfer['confidence'], 'high' | 'medium'>,
  ): Promise<TransferLinkResult> =>
    this.performLink(fromTransaction, toTransaction, method, confidence);

  /**
   * Decision (TICKET-TRF-01): unlinking leaves the category empty rather than re-running the rules
   * engine. No pre-link category is persisted, so exact restoration isn't possible; re-suggesting one
   * via the rules engine would need a separate deliberate action (e.g. "re-run rules" or manual edit).
   *
   * Also clears any transaction's dangling `attributionOverride.reimbursementTransferId` that
   * pointed at this transfer (TICKET-TXN-03) — the reference would otherwise point at nothing,
   * silently un-suppressing a leg that was never re-checked. `mode`/`jointAccountId` are kept; only
   * the stale transfer reference is dropped, atomically with the unlink itself.
   */
  unlink = (
    transfer: Transfer,
  ): Promise<{
    clearedAttributionOverrides: {
      id: number;
      attributionOverride: Transaction['attributionOverride'];
    }[];
  }> =>
    appDb.transaction('rw', [appDb.transfers, appDb.transactions], async () => {
      await this.transfersRepository.remove(transfer.id!);
      await this.transactionsRepository.update(transfer.fromTransactionId, {
        transferId: undefined,
      });
      await this.transactionsRepository.update(transfer.toTransactionId, {
        transferId: undefined,
      });

      const danglingReferences = await this.transactionsRepository.getByReimbursementTransferId(
        transfer.id!,
      );
      const clearedAttributionOverrides: {
        id: number;
        attributionOverride: Transaction['attributionOverride'];
      }[] = [];
      for (const t of danglingReferences) {
        const attributionOverride = {
          ...t.attributionOverride!,
          reimbursementTransferId: undefined,
        };
        await this.transactionsRepository.update(t.id!, { attributionOverride });
        clearedAttributionOverrides.push({ id: t.id!, attributionOverride });
      }

      return { clearedAttributionOverrides };
    });
}
