import { Injectable, inject } from '@angular/core';
import {
  RulesRepository,
  TransactionsRepository,
  type Rule,
  type Transaction,
} from '@/core/data-access';
import { applyRules } from './rule-matching';

export type RuleApplyUpdate = { id: number; categoryId: number };

@Injectable({ providedIn: 'root' })
export class RulesEngineService {
  private readonly rulesRepository = inject(RulesRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);

  /**
   * Never touches a manually categorised row nor a transfer leg — see `applyRules` in
   * `shared/rule-matching.ts`, which the server's `run_rules` tool runs too (TICKET-MCP-03).
   */
  applyToTransactions = (transactions: Transaction[], rules: Rule[]): RuleApplyUpdate[] =>
    applyRules(transactions, rules).map(({ id, categoryId }) => ({ id, categoryId }));

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
