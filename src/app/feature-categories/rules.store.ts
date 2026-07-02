import { Injectable, computed, inject, signal } from '@angular/core';
import { RulesRepository, type Rule, type Transaction } from '@/core/data-access';
import { RulesEngineService } from '@/core/categorisation';
import { TransactionsStore } from '@/feature-transactions';

@Injectable({ providedIn: 'root' })
export class RulesStore {
  private readonly rulesRepository = inject(RulesRepository);
  private readonly rulesEngineService = inject(RulesEngineService);
  private readonly transactionsStore = inject(TransactionsStore);

  private readonly rulesSignal = signal<Rule[]>([]);
  readonly rules = this.rulesSignal.asReadonly();

  readonly rulesByPriority = computed(() =>
    [...this.rulesSignal()].sort((a, b) => a.priority - b.priority),
  );

  readonly lastRunCount = signal<number | null>(null);

  hydrate = async (): Promise<void> => {
    this.rulesSignal.set(await this.rulesRepository.getAll());
  };

  addRule = async (rule: Rule): Promise<void> => {
    const id = await this.rulesRepository.add(rule);
    this.rulesSignal.update((rules) => [...rules, { ...rule, id }]);
  };

  updateRule = async (id: number, changes: Partial<Rule>): Promise<void> => {
    await this.rulesRepository.update(id, changes);
    this.rulesSignal.update((rules) =>
      rules.map((rule) => (rule.id === id ? { ...rule, ...changes } : rule)),
    );
  };

  removeRule = async (id: number): Promise<void> => {
    await this.rulesRepository.remove(id);
    this.rulesSignal.update((rules) => rules.filter((rule) => rule.id !== id));
  };

  toggleEnabled = (rule: Rule): Promise<void> =>
    this.updateRule(rule.id!, { enabled: !rule.enabled });

  /** Moves a rule earlier/later in evaluation order by swapping priority with its neighbour (FR-CAT-2). */
  moveRule = async (rule: Rule, direction: 'up' | 'down'): Promise<void> => {
    const ordered = this.rulesByPriority();
    const index = ordered.findIndex((candidate) => candidate.id === rule.id);
    const neighbour = ordered[direction === 'up' ? index - 1 : index + 1];
    if (index === -1 || !neighbour) return;

    await Promise.all([
      this.updateRule(rule.id!, { priority: neighbour.priority }),
      this.updateRule(neighbour.id!, { priority: rule.priority }),
    ]);
  };

  /** Re-runs every enabled rule across the whole dataset on demand (FR-CAT-3). */
  runRules = async (): Promise<number> => {
    const updates = await this.rulesEngineService.runAndPersist(
      this.transactionsStore.transactions(),
    );
    this.transactionsStore.patchMany(
      updates.map((update) => ({ id: update.id, changes: { categoryId: update.categoryId } })),
    );
    this.lastRunCount.set(updates.length);
    return updates.length;
  };

  /** "Always categorise this merchant as X" — creates a rule from the transaction's counterparty, then backfills matching transactions (FR-CAT-4). */
  createRuleFromCounterparty = async (
    transaction: Transaction,
    categoryId: number,
  ): Promise<void> => {
    const counterpartyName = transaction.counterpartyName?.trim();
    if (!counterpartyName) return;

    const highestPriority = Math.max(0, ...this.rulesSignal().map((rule) => rule.priority));

    await this.addRule({
      name: `Always categorise "${counterpartyName}"`,
      priority: highestPriority + 10,
      enabled: true,
      continueOnMatch: false,
      conditions: [{ field: 'counterpartyName', operator: 'equals', value: counterpartyName }],
      action: { setCategoryId: categoryId },
    });

    await this.runRules();
  };
}
