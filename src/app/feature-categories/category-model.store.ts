import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { CategoryModelRepository, type CategoryModelArtifact } from '@/core/data-access';
import {
  DEFAULT_FEATURE_CONFIG,
  MIN_CATEGORIES,
  MIN_TRAINING_LABELS,
  MODEL_SCHEMA_VERSION,
  RULE_PROPOSAL_MIN_CONFIDENCE,
  RULE_PROPOSAL_MIN_SUPPORT,
  isWithinTrainingWindow,
  mineRuleProposals,
  taxonomySignature,
  type RuleProposal,
} from '@/core/ml';
import { TransactionsStore, CategoriesStore } from '@/core/state';
import { RulesStore } from './rules.store';
import { CategoryModelService } from './category-model.service';

export type CategoryModelStatus =
  'untrained' | 'not-enough-data' | 'training' | 'ready' | 'stale' | 'error';

type Suggestion = { categoryId: number; confidence: number };

/** Live per-epoch snapshot (ML-15) — `null` whenever `status !== 'training'`. */
export type TrainingProgress = {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number | null;
};

type CategoryModelState = {
  status: CategoryModelStatus;
  metrics: { accuracy: number; trainedSampleCount: number; epochsRun?: number } | null;
  lastTrainedAt: string | null;
  categoryIdByIndex: number[];
  suggestions: Map<number, Suggestion>;
  ruleProposals: RuleProposal[];
  trainingProgress: TrainingProgress | null;
  /** `null` = unrestricted (ML-17) — trains on the user's entire categorised history. */
  trainingWindowYears: number | null;
};

const initialState: CategoryModelState = {
  status: 'untrained',
  metrics: null,
  lastTrainedAt: null,
  categoryIdByIndex: [],
  suggestions: new Map(),
  ruleProposals: [],
  trainingProgress: null,
  trainingWindowYears: null,
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
    let hydration: Promise<void> | null = null;

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

    /**
     * Loads a persisted model on first injection (`withHooks` below, TICKET-PERF-07) and flips
     * `ready`/`stale` per the current taxonomy. Awaits `CategoriesStore`/`TransactionsStore`/
     * `RulesStore`'s own hydration first (idempotent) since `activeTaxonomySignature`/
     * `refreshSuggestions` below read their entities synchronously — each of those three now also
     * self-hydrates on its own first injection (TICKET-PERF-07), so this await is likely already
     * settled by the time it runs here, but stays as an explicit guard rather than assuming so.
     *
     * Guarded against `train()`: this now runs lazily on first injection rather than fully
     * resolving before any route renders (TICKET-PERF-07), so a user can click Train while this
     * is still mid-flight. `train()` moves `status` off `'untrained'` synchronously as its very
     * first action, before its own first `await` — so checking that here after each `await`
     * boundary reliably detects a concurrent/earlier `train()` and backs off rather than loading a
     * stale persisted model into the worker (or the `'untrained'`/`'ready'` status it implies) over
     * a fresher training result.
     */
    const stillUntrained = (): boolean => store.status() === 'untrained';

    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = (async () => {
          await Promise.all([
            categoriesStore.hydrate(),
            transactionsStore.hydrate(),
            rulesStore.hydrate(),
          ]);
          const settings = await repository.getSettings();
          patchState(store, { trainingWindowYears: settings.trainingWindowYears });
          if (!stillUntrained()) return;

          const artifact = await repository.get();
          if (!stillUntrained()) return;
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
          if (!stillUntrained()) return;

          patchState(store, {
            status,
            metrics: artifact.metrics,
            lastTrainedAt: artifact.trainedAt,
            categoryIdByIndex: artifact.categoryIdByIndex,
          });

          if (status === 'ready') await refreshSuggestions();
        })();
      }
      return hydration;
    };

    return {
      hydrate,

      /** User-initiated only (ML-10's Train/Retrain control) — no automatic retrain-on-N-labels. */
      train: async (): Promise<void> => {
        const activeCategoryIds = new Set(
          categoriesStore.activeCategories().map((category) => category.id!),
        );
        const trainingWindowYears = store.trainingWindowYears();
        const samples = transactionsStore
          .transactions()
          .filter(
            (transaction) =>
              transaction.categoryId != null &&
              activeCategoryIds.has(transaction.categoryId) &&
              isWithinTrainingWindow(transaction.bookingDate, trainingWindowYears),
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

        patchState(store, { status: 'training', trainingProgress: null });

        try {
          const response = await service.train(
            samples,
            DEFAULT_FEATURE_CONFIG,
            ({ epoch, totalEpochs, loss, accuracy }) => {
              patchState(store, { trainingProgress: { epoch, totalEpochs, loss, accuracy } });
            },
          );
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
            trainingProgress: null,
          });

          await refreshSuggestions();
        } catch {
          patchState(store, { status: 'error', trainingProgress: null });
        }
      },

      refreshSuggestions,

      /** Only affects the *next* Train/Retrain click (ML-17) — never auto-retrains on change. */
      setTrainingWindowYears: async (trainingWindowYears: number | null): Promise<void> => {
        patchState(store, { trainingWindowYears });
        await repository.setTrainingWindowYears(trainingWindowYears);
      },

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
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration (persisted-model load + ML worker init) the moment
      // anything first injects this store, instead of at app bootstrap (TICKET-PERF-07).
      void store.hydrate();
    },
  }),
);
