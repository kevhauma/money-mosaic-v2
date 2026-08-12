import { appDb, type SavingsGoal } from './app-db';
import { GoalsRepository } from './goals.repository';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  name: 'Camera',
  targetAmount: 1200,
  archived: false,
  createdAt: '2026-08-01',
  ...overrides,
});

describe('GoalsRepository', () => {
  const repository = new GoalsRepository();

  // Cleared on both sides: `appDb` is a module-level singleton and Vitest runs with `isolate:
  // false`, so a row left behind by an earlier spec file in this worker would leak into these.
  beforeEach(async () => {
    await appDb.savingsGoals.clear();
  });

  afterEach(async () => {
    await appDb.savingsGoals.clear();
  });

  it('starts empty and returns what was added', async () => {
    expect(await repository.getAll()).toEqual([]);

    const id = await repository.add(goal({ name: 'Camera' }));

    expect(await repository.getAll()).toEqual([expect.objectContaining({ id, name: 'Camera' })]);
  });

  it('updates a single field without touching the rest of the row', async () => {
    const id = await repository.add(goal({ name: 'Camera', targetAmount: 1200, note: 'used ok' }));

    await repository.update(id, { targetAmount: 1500 });

    expect(await appDb.savingsGoals.get(id)).toEqual(
      expect.objectContaining({ name: 'Camera', targetAmount: 1500, note: 'used ok' }),
    );
  });

  it('removes a goal', async () => {
    const id = await repository.add(goal());

    await repository.remove(id);

    expect(await repository.getAll()).toEqual([]);
  });

  it('writes a whole reorder in one bulk call', async () => {
    const first = await repository.add(goal({ name: 'Camera', sortOrder: 0 }));
    const second = await repository.add(goal({ name: 'Holiday', sortOrder: 1 }));

    await repository.bulkUpdateSortOrder([
      { id: first, sortOrder: 1 },
      { id: second, sortOrder: 0 },
    ]);

    expect((await appDb.savingsGoals.get(first))?.sortOrder).toBe(1);
    expect((await appDb.savingsGoals.get(second))?.sortOrder).toBe(0);
  });

  it('treats an empty reorder as a no-op', async () => {
    const id = await repository.add(goal({ sortOrder: 3 }));

    await repository.bulkUpdateSortOrder([]);

    expect((await appDb.savingsGoals.get(id))?.sortOrder).toBe(3);
  });
});
