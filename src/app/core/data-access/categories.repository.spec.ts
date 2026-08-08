import { appDb, CategoriesRepository, type Category } from './index';

const rent = (overrides: Partial<Category> = {}): Category => ({
  name: 'Rent (CAT-10 spec)',
  kind: 'expense',
  color: '#7F77DD',
  icon: 'tag',
  archived: false,
  isSystem: false,
  ...overrides,
});

describe('CategoriesRepository: applicability window (TICKET-CAT-10)', () => {
  const repository = new CategoriesRepository();
  // Only ever removes what it added. Vitest runs `isolate: false`, so `appDb` is shared across every
  // spec file in the worker and a `categories.clear()` here would delete the seeded rows other
  // files rely on (the hazard `data-management.repository.spec.ts` snapshots around).
  const created: number[] = [];

  const add = async (category: Category): Promise<number> => {
    const id = await repository.add(category);
    created.push(id);
    return id;
  };

  afterEach(async () => {
    await appDb.categories.bulkDelete(created.splice(0));
  });

  it('persists both bounds on a plain add', async () => {
    const id = await add(rent({ activeFrom: '2020-01-01', activeUntil: '2023-06-30' }));

    expect(await appDb.categories.get(id)).toMatchObject({
      activeFrom: '2020-01-01',
      activeUntil: '2023-06-30',
    });
  });

  /**
   * The one behaviour the store spec's mock cannot prove. `Table.update` deletes a key whose value
   * is `undefined` rather than storing it, which is exactly what the form relies on when a user
   * clears a date — asserted against real (fake-)IndexedDB, since "clear the bound" is an
   * acceptance criterion and a silently-kept bound would keep filtering things out forever.
   */
  it('removes a bound set back to undefined, rather than storing undefined', async () => {
    const id = await add(rent({ activeFrom: '2020-01-01', activeUntil: '2023-06-30' }));

    await repository.update(id, { activeUntil: undefined });

    const stored = await appDb.categories.get(id);
    expect(stored?.activeUntil).toBeUndefined();
    expect(Object.hasOwn(stored ?? {}, 'activeUntil')).toBe(false);
    // The other bound is untouched — clearing one is not clearing the window.
    expect(stored?.activeFrom).toBe('2020-01-01');
  });

  it('adds a window to a category that never had one', async () => {
    const id = await add(rent());

    await repository.update(id, { activeUntil: '2023-06-30' });

    expect((await appDb.categories.get(id))?.activeUntil).toBe('2023-06-30');
  });
});
