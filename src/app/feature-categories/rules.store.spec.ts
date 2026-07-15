import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  RulesRepository,
  TransactionsRepository,
  type Rule,
  type Transaction,
} from '@/core/data-access';
import { RulesEngineService } from '@/core/categorisation';
import { TransactionsStore } from '@/core/state';
import { RulesStore } from './rules.store';

const rule = (overrides: Partial<Rule> = {}): Rule => ({
  id: 1,
  name: 'Test rule',
  priority: 10,
  enabled: true,
  continueOnMatch: false,
  conditions: [{ field: 'description', operator: 'contains', value: 'carrefour' }],
  action: { setCategoryId: 1 },
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

describe('RulesStore: moveRule swaps priority with its neighbour (TICKET-TEST-01)', () => {
  const rulesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };
  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: RulesRepository, useValue: rulesRepository },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('swaps priorities in both the repository and the store when moving up', async () => {
    rulesRepository.getAll.mockResolvedValue([
      rule({ id: 1, priority: 10 }),
      rule({ id: 2, priority: 20 }),
    ]);
    const store = TestBed.inject(RulesStore);
    await store.hydrate();

    await store.moveRule(store.rulesByPriority()[1], 'up');

    expect(rulesRepository.update).toHaveBeenCalledWith(2, { priority: 10 });
    expect(rulesRepository.update).toHaveBeenCalledWith(1, { priority: 20 });
    expect(store.rulesByPriority().map((r) => r.id)).toEqual([2, 1]);
  });

  it('swaps priorities in both the repository and the store when moving down', async () => {
    rulesRepository.getAll.mockResolvedValue([
      rule({ id: 1, priority: 10 }),
      rule({ id: 2, priority: 20 }),
    ]);
    const store = TestBed.inject(RulesStore);
    await store.hydrate();

    await store.moveRule(store.rulesByPriority()[0], 'down');

    expect(rulesRepository.update).toHaveBeenCalledWith(1, { priority: 20 });
    expect(rulesRepository.update).toHaveBeenCalledWith(2, { priority: 10 });
    expect(store.rulesByPriority().map((r) => r.id)).toEqual([2, 1]);
  });

  it('is a no-op moving the first row up', async () => {
    rulesRepository.getAll.mockResolvedValue([
      rule({ id: 1, priority: 10 }),
      rule({ id: 2, priority: 20 }),
    ]);
    const store = TestBed.inject(RulesStore);
    await store.hydrate();

    await store.moveRule(store.rulesByPriority()[0], 'up');

    expect(rulesRepository.update).not.toHaveBeenCalled();
    expect(store.rulesByPriority().map((r) => r.id)).toEqual([1, 2]);
  });

  it('is a no-op moving the last row down', async () => {
    rulesRepository.getAll.mockResolvedValue([
      rule({ id: 1, priority: 10 }),
      rule({ id: 2, priority: 20 }),
    ]);
    const store = TestBed.inject(RulesStore);
    await store.hydrate();

    await store.moveRule(store.rulesByPriority()[1], 'down');

    expect(rulesRepository.update).not.toHaveBeenCalled();
    expect(store.rulesByPriority().map((r) => r.id)).toEqual([1, 2]);
  });

  it('is a values-equal no-op when two rules share a priority — pinned as accepted behaviour, not a bug to fix here', async () => {
    rulesRepository.getAll.mockResolvedValue([
      rule({ id: 1, priority: 10 }),
      rule({ id: 2, priority: 10 }),
    ]);
    const store = TestBed.inject(RulesStore);
    await store.hydrate();

    await store.moveRule(store.rulesByPriority()[0], 'down');

    // Both updates fire, but each writes back the same priority value it already had —
    // the swap is a no-op in effect, not a reindex. See ticket notes: file a follow-up
    // rather than "fixing" this while pinning.
    expect(rulesRepository.update).toHaveBeenCalledWith(1, { priority: 10 });
    expect(rulesRepository.update).toHaveBeenCalledWith(2, { priority: 10 });
    expect(store.rulesByPriority().map((r) => [r.id, r.priority])).toEqual([
      [1, 10],
      [2, 10],
    ]);
  });
});

describe('RulesStore: createRuleFromCounterparty creates then backfills matching transactions (TICKET-TEST-01)', () => {
  const rulesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(99),
  };
  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };
  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: RulesRepository, useValue: rulesRepository },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('skips a blank counterparty', async () => {
    const store = TestBed.inject(RulesStore);
    await store.createRuleFromCounterparty(transaction({ counterpartyName: '   ' }), 7);

    expect(rulesRepository.add).not.toHaveBeenCalled();
    expect(rulesEngineService.runAndPersist).not.toHaveBeenCalled();
  });

  it('creates an equals rule on the trimmed counterparty at max priority + 10, then backfills matches while leaving manually-categorised rows alone', async () => {
    rulesRepository.getAll.mockResolvedValue([rule({ id: 1, priority: 30 })]);
    transactionsRepository.getAll.mockResolvedValue([
      transaction({ id: 10, categoryManual: false }),
      transaction({ id: 11, categoryManual: true }),
    ]);
    const store = TestBed.inject(RulesStore);
    await store.hydrate();
    // RulesStore's own construction above already injects TransactionsStore (DI cascade), whose
    // on-injection hydrate (TICKET-PERF-07) picks up the mocked rows immediately — runRules()
    // still awaits transactionsStore.hydrate() itself as a guard regardless (TICKET-PERF-05),
    // exercised below via createRuleFromCounterparty.
    const transactionsStore = TestBed.inject(TransactionsStore);
    // The engine fake represents "already applied the matching rule, skipping the manual row" —
    // RulesEngineService's own categoryManual-skip logic is covered by rules-engine.service tests,
    // not re-verified here.
    rulesEngineService.runAndPersist.mockResolvedValue([{ id: 10, categoryId: 7 }]);

    await store.createRuleFromCounterparty(transaction({ counterpartyName: '  Carrefour  ' }), 7);

    expect(rulesRepository.add).toHaveBeenCalledWith({
      name: 'Always categorise "Carrefour"',
      priority: 40,
      enabled: true,
      continueOnMatch: false,
      conditions: [{ field: 'counterpartyName', operator: 'equals', value: 'Carrefour' }],
      action: { setCategoryId: 7 },
    });
    expect(store.rules().some((r) => r.id === 99)).toBe(true);

    expect(rulesEngineService.runAndPersist).toHaveBeenCalled();
    const byId = new Map(transactionsStore.transactions().map((t) => [t.id, t]));
    expect(byId.get(10)).toMatchObject({ categoryId: 7 });
    expect(byId.get(11)).toMatchObject({ categoryManual: true });
    expect(byId.get(11)?.categoryId).toBeUndefined();
  });
});
