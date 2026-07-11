import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { CategoryModelRepository, type CategoryModelArtifact } from '@/core/data-access';
import {
  DEFAULT_FEATURE_CONFIG,
  MIN_CATEGORIES,
  MIN_TRAINING_LABELS,
  MODEL_SCHEMA_VERSION,
  RULE_PROPOSAL_MIN_CONFIDENCE,
  RULE_PROPOSAL_MIN_SUPPORT,
  mineRuleProposals,
  taxonomySignature,
  type RuleProposal,
} from '@/core/ml';
import { TransactionsStore } from '@/feature-transactions';
import { CategoriesStore } from './categories.store';
import { RulesStore } from './rules.store';
import { CategoryModelService } from './category-model.service';

export type CategoryModelStatus =
  'untrained' | 'not-enough-data' | 'training' | 'ready' | 'stale' | 'error';

type Suggestion = { categoryId: number; confidence: number };

type CategoryModelState = {
  status: CategoryModelStatus;
  metrics: { accuracy: number; trainedSampleCount: number } | null;
  lastTrainedAt: string | null;
  categoryIdByIndex: number[];
  suggestions: Map<number, Suggestion>;
  ruleProposals: RuleProposal[];
};

const initialState: CategoryModelState = {
  status: 'untrained',
  metrics: null,
  lastTrainedAt: null,
  categoryIdByIndex: [],
  suggestions: new Map(),
  ruleProposals: [],
};

/**
 * Root store tying the auto-categoriser together (FR-ML-7): status machine, suggestions, and rule
 * proposals. Never writes to `appDb` and never sets a category itself — `acceptSuggestion`/
 * `acceptProposal` always delegate to `TransactionsStore.bulkAssignCategory`/
 * `RulesStore.createRuleFromCounterparty`, the same paths already audited for FR-CAT rules.
 */
export const CategoryModelStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const service = inject(CategoryModelService);
    const repository = inject(CategoryModelRepository);
    const transactionsStore = inject(TransactionsStore);
    const categoriesStore = inject(CategoriesStore);
    const rulesStore = inject(RulesStore);

    const activeTaxonomySignature = (): string =>
      taxonomySignature(
        categoriesStore
          .activeCategories()
          .map((category) => ({ id: category.id!, name: category.name })),
      );

    const refreshSuggestions = async (): Promise<void> => {
      if (store.status() !== 'ready') return;

      const candidates = transactionsStore.uncategorisedTransactions();
      if (candidates.length === 0) {
        // The worker's tfjs backend throws on a zero-row batch ("Pass at least one tensor to
        // concat") — skip the round-trip entirely rather than surface that as an app error.
        patchState(store, { suggestions: new Map(), ruleProposals: [] });
        return;
      }

      const predictions = await service.predict(
        candidates.map((transaction) => ({
          id: transaction.id!,
          rawDescription: transaction.rawDescription,
          counterpartyName: transaction.counterpartyName,
          amount: transaction.amount,
        })),
      );

      const suggestions = new Map<number, Suggestion>(
        predictions.map((prediction) => [
          prediction.id,
          { categoryId: prediction.categoryId, confidence: prediction.confidence },
        ]),
      );

      const transactionsById = new Map(
        candidates.map((transaction) => [transaction.id!, transaction]),
      );
      const ruleProposals = mineRuleProposals(
        predictions.map((prediction) => ({
          transactionId: prediction.id,
          categoryId: prediction.categoryId,
          confidence: prediction.confidence,
        })),
        transactionsById,
        rulesStore.rules().filter((rule) => rule.enabled),
        { minSupport: RULE_PROPOSAL_MIN_SUPPORT, minConfidence: RULE_PROPOSAL_MIN_CONFIDENCE },
      );

      patchState(store, { suggestions, ruleProposals });
    };

    return {
      /** Loads a persisted model on app start (`app.config.ts`) and flips `ready`/`stale` per the current taxonomy. */
      hydrate: async (): Promise<void> => {
        const artifact = await repository.get();
        if (!artifact) {
          patchState(store, { status: 'untrained' });
          return;
        }

        const status: CategoryModelStatus =
          artifact.taxonomySignature === activeTaxonomySignature() ? 'ready' : 'stale';

        await service.init(
          {
            modelTopology: artifact.modelTopology,
            weightSpecs: artifact.weightSpecs,
            weightData: artifact.weightData,
            categoryIdByIndex: artifact.categoryIdByIndex,
          },
          artifact.featureConfig,
        );

        patchState(store, {
          status,
          metrics: artifact.metrics,
          lastTrainedAt: artifact.trainedAt,
          categoryIdByIndex: artifact.categoryIdByIndex,
        });

        if (status === 'ready') await refreshSuggestions();
      },

      /** User-initiated only (ML-10's Train/Retrain control) — no automatic retrain-on-N-labels. */
      train: async (): Promise<void> => {
        const activeCategoryIds = new Set(
          categoriesStore.activeCategories().map((category) => category.id!),
        );
        const samples = transactionsStore
          .transactions()
          .filter(
            (transaction) =>
              transaction.categoryId != null && activeCategoryIds.has(transaction.categoryId),
          )
          .map((transaction) => ({
            rawDescription: transaction.rawDescription,
            counterpartyName: transaction.counterpartyName,
            amount: transaction.amount,
            categoryId: transaction.categoryId!,
          }));

        if (samples.length < MIN_TRAINING_LABELS || activeCategoryIds.size < MIN_CATEGORIES) {
          patchState(store, { status: 'not-enough-data' });
          return;
        }

        patchState(store, { status: 'training' });

        try {
          const response = await service.train(samples, DEFAULT_FEATURE_CONFIG);
          const trainedAt = new Date().toISOString();

          const artifact: CategoryModelArtifact = {
            id: 1,
            modelTopology: response.artifacts.modelTopology,
            weightSpecs: response.artifacts.weightSpecs,
            weightData: response.artifacts.weightData,
            categoryIdByIndex: response.artifacts.categoryIdByIndex,
            featureConfig: DEFAULT_FEATURE_CONFIG,
            taxonomySignature: activeTaxonomySignature(),
            metrics: response.metrics,
            trainedAt,
            schemaVersion: MODEL_SCHEMA_VERSION,
          };
          await repository.save(artifact);

          patchState(store, {
            status: 'ready',
            metrics: response.metrics,
            lastTrainedAt: trainedAt,
            categoryIdByIndex: response.artifacts.categoryIdByIndex,
          });

          await refreshSuggestions();
        } catch {
          patchState(store, { status: 'error' });
        }
      },

      refreshSuggestions,

      acceptSuggestion: async (transactionId: number): Promise<void> => {
        const suggestion = store.suggestions().get(transactionId);
        if (!suggestion) return;

        await transactionsStore.bulkAssignCategory([transactionId], suggestion.categoryId);

        const suggestions = new Map(store.suggestions());
        suggestions.delete(transactionId);
        patchState(store, { suggestions });
      },

      acceptProposal: async (proposal: RuleProposal): Promise<void> => {
        const sampleTransaction = transactionsStore
          .transactions()
          .find((transaction) => transaction.id === proposal.sampleTransactionId);
        if (!sampleTransaction) return;

        await rulesStore.createRuleFromCounterparty(sampleTransaction, proposal.categoryId);

        patchState(store, {
          ruleProposals: store.ruleProposals().filter((candidate) => candidate !== proposal),
        });
      },

      dismissSuggestion: (transactionId: number): void => {
        const suggestions = new Map(store.suggestions());
        suggestions.delete(transactionId);
        patchState(store, { suggestions });
      },

      dismissProposal: (proposal: RuleProposal): void => {
        patchState(store, {
          ruleProposals: store.ruleProposals().filter((candidate) => candidate !== proposal),
        });
      },
    };
  }),
);
