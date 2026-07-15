import { Injectable, inject } from '@angular/core';
import {
  RulesRepository,
  TransactionsRepository,
  type Rule,
  type Transaction,
} from '@/core/data-access';
import { prepareRules, resolveCategoryForPreparedRules } from './rule-matching';

export type RuleApplyUpdate = { id: number; categoryId: number };

@Injectable({ providedIn: 'root' })
export class RulesEngineService {
  private readonly rulesRepository = inject(RulesRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);

  /**
   * Never touches a transaction whose category was manually set (FR-TXN-2, FR-CAT-3), nor one linked
   * as a transfer — a transfer's category is always cleared on link and must stay that way (TICKET-TRF-01).
   * Rules are prepared (filtered, sorted, regexes compiled) once for the whole pass rather than once
   * per transaction (TICKET-PERF-02).
   */
  applyToTransactions = (transactions: Transaction[], rules: Rule[]): RuleApplyUpdate[] => {
    const preparedRules = prepareRules(rules);
    const updates: RuleApplyUpdate[] = [];
    for (const transaction of transactions) {
      if (transaction.categoryManual || transaction.transferId != null) continue;
      const categoryId = resolveCategoryForPreparedRules(transaction, preparedRules);
      if (categoryId != null && categoryId !== transaction.categoryId) {
        updates.push({ id: transaction.id!, categoryId });
      }
    }
    return updates;
  };

  runAndPersist = async (transactions: Transaction[]): Promise<RuleApplyUpdate[]> => {
    const rules = await this.rulesRepository.getAll();
    const updates = this.applyToTransactions(transactions, rules);
    if (updates.length > 0) {
      await this.transactionsRepository.bulkUpdate(
        updates.map((update) => ({ id: update.id, changes: { categoryId: update.categoryId } })),
      );
    }
    return updates;
  };
}
