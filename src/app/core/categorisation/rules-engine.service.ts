import { Injectable, inject } from '@angular/core';
import {
  RulesRepository,
  TransactionsRepository,
  type Rule,
  type Transaction,
} from '@/core/data-access';
import { resolveCategoryForTransaction } from './rule-matching';

export type RuleApplyUpdate = { id: number; categoryId: number };

@Injectable({ providedIn: 'root' })
export class RulesEngineService {
  private readonly rulesRepository = inject(RulesRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);

  /** Never touches a transaction whose category was manually set (FR-TXN-2, FR-CAT-3). */
  applyToTransactions = (transactions: Transaction[], rules: Rule[]): RuleApplyUpdate[] => {
    const updates: RuleApplyUpdate[] = [];
    for (const transaction of transactions) {
      if (transaction.categoryManual) continue;
      const categoryId = resolveCategoryForTransaction(transaction, rules);
      if (categoryId != null && categoryId !== transaction.categoryId) {
        updates.push({ id: transaction.id!, categoryId });
      }
    }
    return updates;
  };

  runAndPersist = async (transactions: Transaction[]): Promise<RuleApplyUpdate[]> => {
    const rules = await this.rulesRepository.getAll();
    const updates = this.applyToTransactions(transactions, rules);
    await Promise.all(
      updates.map((update) =>
        this.transactionsRepository.update(update.id, { categoryId: update.categoryId }),
      ),
    );
    return updates;
  };
}
