import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  CategoriesRepository,
  CategoryModelRepository,
  RulesRepository,
  TransactionsRepository,
  type Category,
  type CategoryModelArtifact,
  type Transaction,
} from '@/core/data-access';
import { RulesEngineService } from '@/core/categorisation';
import { MIN_CATEGORIES, MIN_TRAINING_LABELS, taxonomySignature } from '@/core/ml';
import { TransactionsStore } from '@/feature-transactions';
import { CategoriesStore } from './categories.store';
import { RulesStore } from './rules.store';
import { CategoryModelService } from './category-model.service';
import { CategoryModelStore } from './category-model.store';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#ffffff',
  icon: 'cart',
  archived: false,
  isSystem: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: -12,
  currency: 'EUR',
  rawDescription: 'Coffee',
  fingerprint: `fp-${overrides.id ?? 1}`,
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const artifact = (overrides: Partial<CategoryModelArtifact> = {}): CategoryModelArtifact => ({
  id: 1,
  modelTopology: new ArrayBuffer(0),
  weightSpecs: new ArrayBuffer(0),
  weightData: new ArrayBuffer(0),
  categoryIdByIndex: [1, 2],
  featureConfig: { dim: 8192, charNgramMin: 3, charNgramMax: 4 },
  taxonomySignature: '',
  metrics: { accuracy: 0.9, trainedSampleCount: 30 },
  trainedAt: '2026-06-01T00:00:00.000Z',
  schemaVersion: 1,
  ...overrides,
});

// 25+ labeled transactions split across two active categories — clears both the label-count and
// category-count cold-start floors (MIN_TRAINING_LABELS / MIN_CATEGORIES).
const labeledTransactions = (): Transaction[] =>
  Array.from({ length: MIN_TRAINING_LABELS }, (_, i) =>
    transaction({ id: i + 1, categoryId: (i % 2) + 1, fingerprint: `fp-${i + 1}` }),
  );

describe('CategoryModelStore', () => {
  const categoryModelRepository = { get: vi.fn(), save: vi.fn(), clear: vi.fn() };
  const categoryModelService = { init: vi.fn(), train: vi.fn(), predict: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn(), update: vi.fn(), bulkUpdate: vi.fn() };
  const rulesRepository = { getAll: vi.fn(), add: vi.fn() };
  const rulesEngineService = { runAndPersist: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    categoryModelRepository.get.mockResolvedValue(undefined);
    categoryModelService.init.mockResolvedValue(undefined);
    categoryModelService.predict.mockResolvedValue([]);
    categoriesRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([]);
    transactionsRepository.bulkUpdate.mockResolvedValue(0);
    rulesRepository.getAll.mockResolvedValue([]);
    rulesRepository.add.mockResolvedValue(99);
    rulesEngineService.runAndPersist.mockResolvedValue([]);

    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryModelRepository, useValue: categoryModelRepository },
        { provide: CategoryModelService, useValue: categoryModelService },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: RulesRepository, useValue: rulesRepository },
        { provide: RulesEngineService, useValue: rulesEngineService },
      ],
    });
  });

  /** Hydrates the collaborator stores this store composes with, ahead of injecting it. */
  const hydrateCollaborators = async (): Promise<void> => {
    await TestBed.inject(CategoriesStore).hydrate();
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(RulesStore).hydrate();
  };

  describe('hydrate', () => {
    it('sets untrained when no artifact is persisted, and never touches the worker', async () => {
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.hydrate();

      expect(store.status()).toBe('untrained');
      expect(categoryModelService.init).not.toHaveBeenCalled();
      expect(categoryModelService.predict).not.toHaveBeenCalled();
    });

    it('sets ready and refreshes suggestions when the persisted signature matches the active categories', async () => {
      categoriesRepository.getAll.mockResolvedValue([category({ id: 1, name: 'Groceries' })]);
      transactionsRepository.getAll.mockResolvedValue([transaction({ id: 5 })]);
      const signature = taxonomySignature([{ id: 1, name: 'Groceries' }]);
      categoryModelRepository.get.mockResolvedValue(artifact({ taxonomySignature: signature }));
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.hydrate();

      expect(store.status()).toBe('ready');
      expect(categoryModelService.init).toHaveBeenCalledTimes(1);
      expect(categoryModelService.predict).toHaveBeenCalledTimes(1);
    });

    it('skips the predict round-trip and clears suggestions/proposals when there are zero uncategorised transactions — the worker throws on a zero-row batch', async () => {
      categoriesRepository.getAll.mockResolvedValue([category({ id: 1, name: 'Groceries' })]);
      const signature = taxonomySignature([{ id: 1, name: 'Groceries' }]);
      categoryModelRepository.get.mockResolvedValue(artifact({ taxonomySignature: signature }));
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.hydrate();

      expect(store.status()).toBe('ready');
      expect(categoryModelService.predict).not.toHaveBeenCalled();
      expect(store.suggestions().size).toBe(0);
      expect(store.ruleProposals()).toEqual([]);
    });

    it('sets stale and still initialises the worker, but does not refresh suggestions, when the signature no longer matches', async () => {
      categoriesRepository.getAll.mockResolvedValue([category({ id: 1, name: 'Renamed' })]);
      categoryModelRepository.get.mockResolvedValue(
        artifact({ taxonomySignature: 'stale-signature' }),
      );
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.hydrate();

      expect(store.status()).toBe('stale');
      expect(categoryModelService.init).toHaveBeenCalledTimes(1);
      expect(categoryModelService.predict).not.toHaveBeenCalled();
    });
  });

  describe('train', () => {
    it('sets not-enough-data without invoking service.train when labeled samples are below MIN_TRAINING_LABELS', async () => {
      categoriesRepository.getAll.mockResolvedValue([
        category({ id: 1 }),
        category({ id: 2, name: 'Rent' }),
      ]);
      transactionsRepository.getAll.mockResolvedValue([transaction({ id: 1, categoryId: 1 })]);
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.train();

      expect(store.status()).toBe('not-enough-data');
      expect(categoryModelService.train).not.toHaveBeenCalled();
    });

    it('sets not-enough-data without invoking service.train when active categories are below MIN_CATEGORIES', async () => {
      expect(MIN_CATEGORIES).toBeGreaterThan(1);
      categoriesRepository.getAll.mockResolvedValue([category({ id: 1 })]);
      transactionsRepository.getAll.mockResolvedValue(labeledTransactions());
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.train();

      expect(store.status()).toBe('not-enough-data');
      expect(categoryModelService.train).not.toHaveBeenCalled();
    });

    it('persists artifacts, transitions training -> ready, and triggers refreshSuggestions on success', async () => {
      categoriesRepository.getAll.mockResolvedValue([
        category({ id: 1 }),
        category({ id: 2, name: 'Rent' }),
      ]);
      // Plus one genuinely uncategorised transaction, so the post-train refreshSuggestions()
      // round-trip actually has a candidate to predict on (an all-labeled set is a legitimate
      // zero-candidate case, covered separately by the guard test above).
      transactionsRepository.getAll.mockResolvedValue([
        ...labeledTransactions(),
        transaction({ id: MIN_TRAINING_LABELS + 1, fingerprint: 'fp-uncategorised' }),
      ]);
      categoryModelService.train.mockResolvedValue({
        type: 'TRAIN_OK',
        artifacts: {
          modelTopology: new ArrayBuffer(0),
          weightSpecs: new ArrayBuffer(0),
          weightData: new ArrayBuffer(0),
          categoryIdByIndex: [1, 2],
        },
        metrics: { accuracy: 0.92, trainedSampleCount: MIN_TRAINING_LABELS },
      });
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.train();

      expect(categoryModelService.train).toHaveBeenCalledTimes(1);
      expect(categoryModelRepository.save).toHaveBeenCalledTimes(1);
      expect(store.status()).toBe('ready');
      expect(store.metrics()).toEqual({ accuracy: 0.92, trainedSampleCount: MIN_TRAINING_LABELS });
      expect(categoryModelService.predict).toHaveBeenCalledTimes(1);
    });

    it('transitions to error, not stuck at training, when the worker rejects', async () => {
      categoriesRepository.getAll.mockResolvedValue([
        category({ id: 1 }),
        category({ id: 2, name: 'Rent' }),
      ]);
      transactionsRepository.getAll.mockResolvedValue(labeledTransactions());
      categoryModelService.train.mockRejectedValue(new Error('training failed'));
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.train();

      expect(store.status()).toBe('error');
      expect(categoryModelRepository.save).not.toHaveBeenCalled();
    });

    it('trainingProgress updates live on every progress callback and resets to null once training finishes (ML-15)', async () => {
      categoriesRepository.getAll.mockResolvedValue([
        category({ id: 1 }),
        category({ id: 2, name: 'Rent' }),
      ]);
      transactionsRepository.getAll.mockResolvedValue(labeledTransactions());
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      const progressSnapshots: unknown[] = [];
      categoryModelService.train.mockImplementation(
        async (
          _samples: unknown,
          _config: unknown,
          onProgress?: (progress: {
            epoch: number;
            totalEpochs: number;
            loss: number;
            accuracy: number | null;
          }) => void,
        ) => {
          onProgress?.({ epoch: 1, totalEpochs: 120, loss: 0.9, accuracy: 0.4 });
          progressSnapshots.push(store.trainingProgress());
          onProgress?.({ epoch: 2, totalEpochs: 120, loss: 0.7, accuracy: 0.55 });
          progressSnapshots.push(store.trainingProgress());
          return {
            type: 'TRAIN_OK',
            artifacts: {
              modelTopology: new ArrayBuffer(0),
              weightSpecs: new ArrayBuffer(0),
              weightData: new ArrayBuffer(0),
              categoryIdByIndex: [1, 2],
            },
            metrics: { accuracy: 0.92, trainedSampleCount: MIN_TRAINING_LABELS, epochsRun: 2 },
          };
        },
      );

      expect(store.trainingProgress()).toBeNull();

      await store.train();

      expect(progressSnapshots).toEqual([
        { epoch: 1, totalEpochs: 120, loss: 0.9, accuracy: 0.4 },
        { epoch: 2, totalEpochs: 120, loss: 0.7, accuracy: 0.55 },
      ]);
      expect(store.trainingProgress()).toBeNull();
      expect(store.status()).toBe('ready');
    });

    it('trainingProgress resets to null when the worker rejects, even after progress arrived (ML-15)', async () => {
      categoriesRepository.getAll.mockResolvedValue([
        category({ id: 1 }),
        category({ id: 2, name: 'Rent' }),
      ]);
      transactionsRepository.getAll.mockResolvedValue(labeledTransactions());
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      categoryModelService.train.mockImplementation(
        async (
          _samples: unknown,
          _config: unknown,
          onProgress?: (progress: {
            epoch: number;
            totalEpochs: number;
            loss: number;
            accuracy: number | null;
          }) => void,
        ) => {
          onProgress?.({ epoch: 1, totalEpochs: 120, loss: 1.1, accuracy: null });
          throw new Error('training failed');
        },
      );

      await store.train();

      expect(store.status()).toBe('error');
      expect(store.trainingProgress()).toBeNull();
    });
  });

  describe('refreshSuggestions', () => {
    it('is a no-op and never calls service.predict when status is not ready', async () => {
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);

      await store.refreshSuggestions();

      expect(store.status()).toBe('untrained');
      expect(categoryModelService.predict).not.toHaveBeenCalled();
    });
  });

  describe('acceptSuggestion / dismissSuggestion', () => {
    const readySignature = taxonomySignature([{ id: 1, name: 'Groceries' }]);

    const setupReadyStoreWithSuggestion = async () => {
      categoriesRepository.getAll.mockResolvedValue([category({ id: 1, name: 'Groceries' })]);
      transactionsRepository.getAll.mockResolvedValue([
        transaction({ id: 5, rawDescription: 'Netflix', counterpartyName: 'Netflix' }),
      ]);
      categoryModelRepository.get.mockResolvedValue(
        artifact({ taxonomySignature: readySignature }),
      );
      categoryModelService.predict.mockResolvedValue([{ id: 5, categoryId: 1, confidence: 0.77 }]);
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);
      await store.hydrate();
      return store;
    };

    it('maps a prediction to a suggestion keyed by transaction id', async () => {
      const store = await setupReadyStoreWithSuggestion();
      expect(store.suggestions().get(5)).toEqual({ categoryId: 1, confidence: 0.77 });
    });

    it('acceptSuggestion delegates to TransactionsStore.bulkAssignCategory with exactly the one id, and never touches appDb/repositories directly', async () => {
      const store = await setupReadyStoreWithSuggestion();
      const transactionsStore = TestBed.inject(TransactionsStore);
      const bulkAssignCategorySpy = vi.spyOn(transactionsStore, 'bulkAssignCategory');
      vi.clearAllMocks();
      transactionsRepository.bulkUpdate.mockResolvedValue(1);

      await store.acceptSuggestion(5);

      expect(bulkAssignCategorySpy).toHaveBeenCalledExactlyOnceWith([5], 1);
      expect(transactionsRepository.bulkUpdate).toHaveBeenCalledWith([
        { id: 5, changes: { categoryId: 1, categoryManual: true } },
      ]);
      expect(categoryModelRepository.get).not.toHaveBeenCalled();
      expect(categoryModelRepository.save).not.toHaveBeenCalled();
      expect(categoryModelRepository.clear).not.toHaveBeenCalled();
      expect(store.suggestions().has(5)).toBe(false);
    });

    it('dismissSuggestion removes the suggestion locally without any repository or worker call', async () => {
      const store = await setupReadyStoreWithSuggestion();
      vi.clearAllMocks();

      store.dismissSuggestion(5);

      expect(store.suggestions().has(5)).toBe(false);
      expect(transactionsRepository.bulkUpdate).not.toHaveBeenCalled();
      expect(categoryModelService.predict).not.toHaveBeenCalled();
      expect(categoryModelRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('acceptProposal / dismissProposal', () => {
    const readySignature = taxonomySignature([{ id: 1, name: 'Groceries' }]);

    const setupReadyStoreWithProposal = async () => {
      categoriesRepository.getAll.mockResolvedValue([category({ id: 1, name: 'Groceries' })]);
      // 4 uncategorised Netflix transactions, all confidently predicted into category 1 —
      // clears mineRuleProposals' support/confidence thresholds with no covering enabled rule.
      const netflixTransactions = Array.from({ length: 4 }, (_, i) =>
        transaction({
          id: i + 1,
          rawDescription: 'Netflix',
          counterpartyName: 'Netflix',
          fingerprint: `fp-${i + 1}`,
        }),
      );
      transactionsRepository.getAll.mockResolvedValue(netflixTransactions);
      categoryModelRepository.get.mockResolvedValue(
        artifact({ taxonomySignature: readySignature }),
      );
      categoryModelService.predict.mockResolvedValue(
        netflixTransactions.map((t) => ({ id: t.id, categoryId: 1, confidence: 0.9 })),
      );
      await hydrateCollaborators();
      const store = TestBed.inject(CategoryModelStore);
      await store.hydrate();
      return store;
    };

    it('mines a rule proposal from the confident, consistent Netflix cluster', async () => {
      const store = await setupReadyStoreWithProposal();
      expect(store.ruleProposals()).toEqual([
        expect.objectContaining({ counterpartyName: 'Netflix', categoryId: 1, support: 4 }),
      ]);
    });

    it('acceptProposal delegates to RulesStore.createRuleFromCounterparty with the sample transaction and category, never building a Rule itself', async () => {
      const store = await setupReadyStoreWithProposal();
      const rulesStore = TestBed.inject(RulesStore);
      const createRuleSpy = vi.spyOn(rulesStore, 'createRuleFromCounterparty');
      const [proposal] = store.ruleProposals();
      vi.clearAllMocks();
      rulesRepository.add.mockResolvedValue(99);
      rulesEngineService.runAndPersist.mockResolvedValue([]);

      await store.acceptProposal(proposal);

      expect(createRuleSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ id: proposal.sampleTransactionId, counterpartyName: 'Netflix' }),
        proposal.categoryId,
      );
      expect(rulesRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          conditions: [{ field: 'counterpartyName', operator: 'equals', value: 'Netflix' }],
          action: { setCategoryId: proposal.categoryId },
        }),
      );
      expect(store.ruleProposals()).toHaveLength(0);
    });

    it('dismissProposal removes the proposal locally without any repository or worker call', async () => {
      const store = await setupReadyStoreWithProposal();
      const [proposal] = store.ruleProposals();
      vi.clearAllMocks();

      store.dismissProposal(proposal);

      expect(store.ruleProposals()).toHaveLength(0);
      expect(rulesRepository.add).not.toHaveBeenCalled();
      expect(categoryModelService.predict).not.toHaveBeenCalled();
    });
  });

  describe('no automatic category assignment', () => {
    it('never calls TransactionsStore.bulkAssignCategory during hydrate or train — only in direct response to acceptSuggestion', async () => {
      categoriesRepository.getAll.mockResolvedValue([
        category({ id: 1 }),
        category({ id: 2, name: 'Rent' }),
      ]);
      transactionsRepository.getAll.mockResolvedValue(labeledTransactions());
      categoryModelRepository.get.mockResolvedValue(
        artifact({ taxonomySignature: taxonomySignature([{ id: 1, name: 'Groceries' }]) }),
      );
      categoryModelService.train.mockResolvedValue({
        type: 'TRAIN_OK',
        artifacts: {
          modelTopology: new ArrayBuffer(0),
          weightSpecs: new ArrayBuffer(0),
          weightData: new ArrayBuffer(0),
          categoryIdByIndex: [1, 2],
        },
        metrics: { accuracy: 0.92, trainedSampleCount: MIN_TRAINING_LABELS },
      });
      await hydrateCollaborators();
      const transactionsStore = TestBed.inject(TransactionsStore);
      const bulkAssignCategorySpy = vi.spyOn(transactionsStore, 'bulkAssignCategory');
      const store = TestBed.inject(CategoryModelStore);

      await store.hydrate();
      await store.train();
      await store.refreshSuggestions();

      expect(bulkAssignCategorySpy).not.toHaveBeenCalled();
    });
  });
});
