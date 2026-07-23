import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { entityConfig, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { RulesRepository, type Rule, type Transaction } from '@/core/data-access';
import { RulesEngineService } from '@/core/categorisation';
import { CategoriesStore, TransactionsStore } from '@/core/state';
import { withPersistedCrud } from '@/shared/utils';
import {
  parseSharedRulesFile,
  toSharedRules,
  UNCATEGORISED_RULE_CATEGORY_NAME,
  type SharedRulesFile,
  type SkippedRuleEntry,
} from './rule-share';

export type ImportRulesResult = { added: number; skipped: SkippedRuleEntry[] };

const ruleConfig = entityConfig({
  entity: type<Rule>(),
  selectId: (rule) => rule.id!,
});

export const RulesStore = signalStore(
  { providedIn: 'root' },
  withEntities(ruleConfig),
  // Fully plain CRUD (TICKET-NG-08) — add/update/remove persist through RulesRepository and patch
  // entity state, no divergent orchestration, so this store adopts all three generic methods.
  withPersistedCrud(RulesRepository, ruleConfig),
  withState({ lastRunCount: null as number | null, hydrated: false }),
  withComputed(({ entities }) => ({
    rules: entities,
    rulesByPriority: computed(() => [...entities()].sort((a, b) => a.priority - b.priority)),
  })),
  withMethods((store) => {
    const rulesRepository = inject(RulesRepository);
    let hydration: Promise<void> | null = null;

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = rulesRepository.getAll().then((rules) => {
          patchState(store, setAllEntities(rules, ruleConfig), { hydrated: true });
        });
      }
      return hydration;
    };

    return {
      hydrate,

      // Aliased to the store's own public method names (same pattern as `withArchivable`'s
      // `activeEntities`/`archivedEntities` -> `activeAccounts`/`archivedAccounts`).
      addRule: (rule: Rule): Promise<Rule> => store.add(rule),
      updateRule: (id: number, changes: Partial<Rule>): Promise<void> => store.update(id, changes),
      removeRule: (id: number): Promise<void> => store.remove(id),
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

      /**
       * Re-runs every enabled rule across the whole dataset on demand (FR-CAT-3). Awaits
       * `TransactionsStore`'s own hydration first (idempotent) so this never runs against a
       * not-yet-hydrated entity map (TICKET-PERF-05).
       */
      runRules: async (): Promise<number> => {
        await transactionsStore.hydrate();
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

    /** "Make rule from filter" (TICKET-CAT-07) — same persist-then-backfill path as `createRuleFromCounterparty`. */
    createRuleFromConditions: async (rule: Omit<Rule, 'id'>): Promise<void> => {
      await store.addRule(rule);
      await store.runRules();
    },
  })),
  withMethods((store) => {
    const categoriesStore = inject(CategoriesStore);

    return {
      /** Exports all rules, or just `ruleIds` if given, with categories resolved to portable labels (TICKET-CAT-06). */
      exportRules: (ruleIds?: number[]): SharedRulesFile => {
        const categoriesById = categoriesStore.categoriesById();
        const rules = ruleIds
          ? store.rules().filter((rule) => ruleIds.includes(rule.id!))
          : store.rules();
        return toSharedRules(rules, categoriesById);
      },

      /**
       * Imports a shared-rules file (TICKET-CAT-06). Each entry's category label is matched
       * case-insensitively against the importing user's categories; an unmatched label falls back
       * to a seeded "Uncategorised" system category rather than auto-creating one from the file
       * (an untrusted file shouldn't be able to populate the category list with arbitrary names).
       * Imported rules are appended after the current highest priority so they never jump ahead of
       * existing ones, and a name collision with an existing rule adds a second rule rather than
       * overwriting it.
       */
      importRules: async (data: SharedRulesFile): Promise<ImportRulesResult> => {
        const { entries, skipped } = parseSharedRulesFile(data);
        await categoriesStore.hydrate();

        let nextPriority = Math.max(0, ...store.rules().map((rule) => rule.priority));
        let uncategorisedId: number | null = null;

        const resolveCategoryId = async (label: string): Promise<number> => {
          const match = categoriesStore
            .categories()
            .find((category) => category.name.toLowerCase() === label.toLowerCase());
          if (match) return match.id!;

          if (uncategorisedId == null) {
            const seeded = categoriesStore
              .categories()
              .find(
                (category) =>
                  category.isSystem && category.name === UNCATEGORISED_RULE_CATEGORY_NAME,
              );
            uncategorisedId = seeded
              ? seeded.id!
              : (
                  await categoriesStore.addCategory({
                    name: UNCATEGORISED_RULE_CATEGORY_NAME,
                    kind: 'neutral',
                    color: '#9CA3AF',
                    icon: 'tag',
                    archived: false,
                    isSystem: true,
                  })
                ).id!;
          }
          return uncategorisedId;
        };

        let added = 0;
        for (const entry of entries) {
          const categoryId = await resolveCategoryId(entry.action.setCategoryName);
          nextPriority += 10;
          await store.addRule({
            name: entry.name,
            priority: nextPriority,
            enabled: entry.enabled,
            continueOnMatch: entry.continueOnMatch,
            conditionMatch: entry.conditionMatch,
            conditions: entry.conditions,
            action: { setCategoryId: categoryId },
          });
          added += 1;
        }

        return { added, skipped };
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `rules()` synchronously can still `await store.hydrate()` as a guard.
      void store.hydrate();
    },
  }),
);
