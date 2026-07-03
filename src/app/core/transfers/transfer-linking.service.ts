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

      await this.transactionsRepository.update(fromTransaction.id!, { transferId });
      await this.transactionsRepository.update(toTransaction.id!, { transferId });

      return {
        transfer: { ...transfer, id: transferId },
        updatedTransactions: [
          { ...fromTransaction, transferId },
          { ...toTransaction, transferId },
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

  unlink = (transfer: Transfer): Promise<void> =>
    appDb.transaction('rw', [appDb.transfers, appDb.transactions], async () => {
      await this.transfersRepository.remove(transfer.id!);
      await this.transactionsRepository.update(transfer.fromTransactionId, {
        transferId: undefined,
      });
      await this.transactionsRepository.update(transfer.toTransactionId, {
        transferId: undefined,
      });
    });
}
