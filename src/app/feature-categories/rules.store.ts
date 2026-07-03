import { computed, inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { RulesRepository, type Rule, type Transaction } from '@/core/data-access';
import { RulesEngineService } from '@/core/categorisation';
import { TransactionsStore } from '@/feature-transactions';

const ruleConfig = entityConfig({
  entity: type<Rule>(),
  selectId: (rule) => rule.id!,
});

export const RulesStore = signalStore(
  { providedIn: 'root' },
  withEntities(ruleConfig),
  withState({ lastRunCount: null as number | null }),
  withComputed(({ entities }) => ({
    rules: entities,
    rulesByPriority: computed(() => [...entities()].sort((a, b) => a.priority - b.priority)),
  })),
  withMethods((store) => {
    const rulesRepository = inject(RulesRepository);

    return {
      hydrate: async (): Promise<void> => {
        patchState(store, setAllEntities(await rulesRepository.getAll(), ruleConfig));
      },

      addRule: async (rule: Rule): Promise<void> => {
        const id = await rulesRepository.add(rule);
        const added: Rule = { ...rule, id };
        patchState(store, addEntity(added, ruleConfig));
      },

      updateRule: async (id: number, changes: Partial<Rule>): Promise<void> => {
        await rulesRepository.update(id, changes);
        patchState(store, updateEntity({ id, changes }, ruleConfig));
      },

      removeRule: async (id: number): Promise<void> => {
        await rulesRepository.remove(id);
        patchState(store, removeEntity(id));
      },
    };
  }),
  withMethods((store) => {
    const rulesEngineService = inject(RulesEngineService);
    const transactionsStore = inject(TransactionsStore);

    return {
      toggleEnabled: (rule: Rule): Promise<void> =>
        store.updateRule(rule.id!, { enabled: !rule.enabled }),

      /** Moves a rule earlier/later in evaluation order by swapping priority with its neighbour (FR-CAT-2). */
      moveRule: async (rule: Rule, direction: 'up' | 'down'): Promise<void> => {
        const ordered = store.rulesByPriority();
        const index = ordered.findIndex((candidate) => candidate.id === rule.id);
        const neighbour = ordered[direction === 'up' ? index - 1 : index + 1];
        if (index === -1 || !neighbour) return;

        await Promise.all([
          store.updateRule(rule.id!, { priority: neighbour.priority }),
          store.updateRule(neighbour.id!, { priority: rule.priority }),
        ]);
      },

      /** Re-runs every enabled rule across the whole dataset on demand (FR-CAT-3). */
      runRules: async (): Promise<number> => {
        const updates = await rulesEngineService.runAndPersist(transactionsStore.transactions());
        transactionsStore.patchMany(
          updates.map((update) => ({ id: update.id, changes: { categoryId: update.categoryId } })),
        );
        patchState(store, { lastRunCount: updates.length });
        return updates.length;
      },
    };
  }),
  withMethods((store) => ({
    /** "Always categorise this merchant as X" — creates a rule from the transaction's counterparty, then backfills matching transactions (FR-CAT-4). */
    createRuleFromCounterparty: async (
      transaction: Transaction,
      categoryId: number,
    ): Promise<void> => {
      const counterpartyName = transaction.counterpartyName?.trim();
      if (!counterpartyName) return;

      const highestPriority = Math.max(0, ...store.rules().map((rule) => rule.priority));

      await store.addRule({
        name: `Always categorise "${counterpartyName}"`,
        priority: highestPriority + 10,
        enabled: true,
        continueOnMatch: false,
        conditions: [{ field: 'counterpartyName', operator: 'equals', value: counterpartyName }],
        action: { setCategoryId: categoryId },
      });

      await store.runRules();
    },
  })),
);
