import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GoalsRepository, type SavingsGoal } from '@/core/data-access';
import { GoalsStore } from './goals.store';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 1,
  name: 'Camera',
  targetAmount: 1200,
  archived: false,
  createdAt: '2026-08-01',
  ...overrides,
});

describe('GoalsStore: funding order', () => {
  const goalsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(9),
    update: vi.fn().mockResolvedValue(1),
    remove: vi.fn().mockResolvedValue(undefined),
    bulkUpdateSortOrder: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` clears calls but keeps implementations, so the previous test's row set would
    // otherwise still be what `hydrate()` reads.
    goalsRepository.getAll.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [{ provide: GoalsRepository, useValue: goalsRepository }],
    });
  });

  it('orders goals by sortOrder regardless of insertion order', async () => {
    goalsRepository.getAll.mockResolvedValue([
      goal({ id: 1, name: 'Camera', sortOrder: 2 }),
      goal({ id: 2, name: 'Holiday', sortOrder: 0 }),
      goal({ id: 3, name: 'Laptop', sortOrder: 1 }),
    ]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    expect(store.goals().map((entry) => entry.name)).toEqual(['Holiday', 'Laptop', 'Camera']);
  });

  it('sorts a goal without a sortOrder last, then by creation order', async () => {
    goalsRepository.getAll.mockResolvedValue([
      goal({ id: 2, name: 'No order yet' }),
      goal({ id: 1, name: 'Ordered', sortOrder: 5 }),
      goal({ id: 3, name: 'Also no order' }),
    ]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    expect(store.goals().map((entry) => entry.name)).toEqual([
      'Ordered',
      'No order yet',
      'Also no order',
    ]);
  });

  it('gives a newly added goal the next sortOrder rather than undefined, so it lands last', async () => {
    goalsRepository.getAll.mockResolvedValue([
      goal({ id: 1, sortOrder: 0 }),
      goal({ id: 2, sortOrder: 3 }),
    ]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    const added = await store.addGoal(goal({ id: undefined, name: 'Bike' }));

    expect(goalsRepository.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 4 }));
    expect(added.sortOrder).toBe(4);
    expect(store.goals().at(-1)?.name).toBe('Bike');
  });

  it('gives the very first goal sortOrder 0', async () => {
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    await store.addGoal(goal({ id: undefined, name: 'First' }));

    expect(goalsRepository.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0 }));
  });

  it('persists a reorder as one bulk write and reflects the new order in the signal', async () => {
    goalsRepository.getAll.mockResolvedValue([
      goal({ id: 1, name: 'Camera', sortOrder: 0 }),
      goal({ id: 2, name: 'Holiday', sortOrder: 1 }),
    ]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    await store.reorder(2, 'up');

    expect(goalsRepository.bulkUpdateSortOrder).toHaveBeenCalledWith([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ]);
    expect(store.goals().map((entry) => entry.name)).toEqual(['Holiday', 'Camera']);
  });

  it('does not write anything when the goal is already at the boundary', async () => {
    goalsRepository.getAll.mockResolvedValue([goal({ id: 1, sortOrder: 0 })]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    await store.reorder(1, 'up');

    expect(goalsRepository.bulkUpdateSortOrder).not.toHaveBeenCalled();
  });
});

describe('GoalsStore: CRUD and archiving', () => {
  const goalsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(9),
    update: vi.fn().mockResolvedValue(1),
    remove: vi.fn().mockResolvedValue(undefined),
    bulkUpdateSortOrder: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` clears calls but keeps implementations, so the previous test's row set would
    // otherwise still be what `hydrate()` reads.
    goalsRepository.getAll.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [{ provide: GoalsRepository, useValue: goalsRepository }],
    });
  });

  it('persists an edit through the repository', async () => {
    goalsRepository.getAll.mockResolvedValue([goal({ id: 1, targetAmount: 1200 })]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    await store.updateGoal(1, { targetAmount: 1500 });

    expect(goalsRepository.update).toHaveBeenCalledWith(1, { targetAmount: 1500 });
    expect(store.goals()[0].targetAmount).toBe(1500);
  });

  it('persists a delete through the repository', async () => {
    goalsRepository.getAll.mockResolvedValue([goal({ id: 1 })]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    await store.removeGoal(1);

    expect(goalsRepository.remove).toHaveBeenCalledWith(1);
    expect(store.goals()).toEqual([]);
  });

  it('splits active from archived goals (no UI for it until later, but the field is carried from the start)', async () => {
    goalsRepository.getAll.mockResolvedValue([
      goal({ id: 1, name: 'Camera', archived: false, sortOrder: 0 }),
      goal({ id: 2, name: 'Bought already', archived: true, sortOrder: 1 }),
    ]);
    const store = TestBed.inject(GoalsStore);
    await store.hydrate();

    expect(store.activeGoals().map((entry) => entry.name)).toEqual(['Camera']);
    expect(store.archivedGoals().map((entry) => entry.name)).toEqual(['Bought already']);

    await store.archiveGoal(1);

    expect(goalsRepository.update).toHaveBeenCalledWith(1, { archived: true });
    expect(store.activeGoals()).toEqual([]);
  });
});
