import { Injectable, inject } from '@angular/core';
import { AccountsRepository, TransactionsRepository, type Transfer } from '@/core/data-access';
import { resolveTransferMatches } from './transfer-matching';
import { TransferLinkingService } from './transfer-linking.service';

@Injectable({ providedIn: 'root' })
export class TransferMatchingService {
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly accountsRepository = inject(AccountsRepository);
  private readonly transferLinkingService = inject(TransferLinkingService);

  /** Re-scans the whole dataset (not just newly imported rows) and auto-links every safe match (FR-TRF-2). */
  runAndPersist = async (
    windowDays: number,
    autoLinkMediumConfidence: boolean,
  ): Promise<Transfer[]> => {
    const [transactions, accounts] = await Promise.all([
      this.transactionsRepository.getAll(),
      this.accountsRepository.getAll(),
    ]);
    const { autoLink } = resolveTransferMatches(
      transactions,
      accounts,
      windowDays,
      autoLinkMediumConfidence,
    );

    const linked: Transfer[] = [];
    for (const candidate of autoLink) {
      const { transfer } = await this.transferLinkingService.linkAuto(
        candidate.from,
        candidate.to,
        candidate.method,
        candidate.confidence,
      );
      linked.push(transfer);
    }
    return linked;
  };
}
