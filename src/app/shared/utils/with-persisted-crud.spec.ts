import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import { entityConfig, withEntities } from '@ngrx/signals/entities';
import { withPersistedCrud, type PersistedCrudRepository } from './with-persisted-crud';

type Widget = { id?: number; name: string };

@Injectable()
class FakeWidgetsRepository implements PersistedCrudRepository<Widget> {
  add = vi.fn<PersistedCrudRepository<Widget>['add']>();
  update = vi.fn<PersistedCrudRepository<Widget>['update']>();
  remove = vi.fn<PersistedCrudRepository<Widget>['remove']>();
}

const widgetConfig = entityConfig({
  entity: type<Widget>(),
  selectId: (widget) => widget.id!,
});

const WidgetsStore = signalStore(
  { providedIn: 'root' },
  withEntities(widgetConfig),
  withPersistedCrud(FakeWidgetsRepository, widgetConfig),
  withComputed(({ entities }) => ({ widgets: entities })),
  withMethods((store) => ({
    // Mirrors how a real store aliases the generic names to its own domain method names.
    addWidget: (widget: Widget) => store.add(widget),
  })),
);

const setup = () => {
  TestBed.configureTestingModule({ providers: [FakeWidgetsRepository] });
  return {
    store: TestBed.inject(WidgetsStore),
    repository: TestBed.inject(FakeWidgetsRepository),
  };
};

describe('withPersistedCrud', () => {
  it('add persists through the repository, then patches entity state with the returned id', async () => {
    const ctx = setup();
    ctx.repository.add.mockResolvedValue(7);

    const added = await ctx.store.add({ name: 'Widget A' });

    expect(ctx.repository.add).toHaveBeenCalledWith({ name: 'Widget A' });
    expect(added).toEqual({ id: 7, name: 'Widget A' });
    expect(ctx.store.widgets()).toEqual([{ id: 7, name: 'Widget A' }]);
  });

  it('update persists through the repository, then patches the matching entity', async () => {
    const ctx = setup();
    ctx.repository.add.mockResolvedValue(1);
    ctx.repository.update.mockResolvedValue(undefined);
    await ctx.store.add({ name: 'Widget A' });

    await ctx.store.update(1, { name: 'Widget A (renamed)' });

    expect(ctx.repository.update).toHaveBeenCalledWith(1, { name: 'Widget A (renamed)' });
    expect(ctx.store.widgets()).toEqual([{ id: 1, name: 'Widget A (renamed)' }]);
  });

  it('remove persists through the repository, then removes the matching entity', async () => {
    const ctx = setup();
    ctx.repository.add.mockResolvedValue(1);
    ctx.repository.remove.mockResolvedValue(undefined);
    await ctx.store.add({ name: 'Widget A' });

    await ctx.store.remove(1);

    expect(ctx.repository.remove).toHaveBeenCalledWith(1);
    expect(ctx.store.widgets()).toEqual([]);
  });

  it('a repository failure on add rejects and never patches state', async () => {
    const ctx = setup();
    ctx.repository.add.mockRejectedValue(new Error('write failed'));

    await expect(ctx.store.add({ name: 'Widget A' })).rejects.toThrow('write failed');

    expect(ctx.store.widgets()).toEqual([]);
  });

  it('a repository failure on update rejects and leaves the entity untouched', async () => {
    const ctx = setup();
    ctx.repository.add.mockResolvedValue(1);
    await ctx.store.add({ name: 'Widget A' });
    ctx.repository.update.mockRejectedValue(new Error('write failed'));

    await expect(ctx.store.update(1, { name: 'renamed' })).rejects.toThrow('write failed');

    expect(ctx.store.widgets()).toEqual([{ id: 1, name: 'Widget A' }]);
  });

  it('a repository failure on remove rejects and leaves the entity in place', async () => {
    const ctx = setup();
    ctx.repository.add.mockResolvedValue(1);
    await ctx.store.add({ name: 'Widget A' });
    ctx.repository.remove.mockRejectedValue(new Error('write failed'));

    await expect(ctx.store.remove(1)).rejects.toThrow('write failed');

    expect(ctx.store.widgets()).toEqual([{ id: 1, name: 'Widget A' }]);
  });

  it('a consuming store can alias a generic method to its own domain-specific name', async () => {
    const ctx = setup();
    ctx.repository.add.mockResolvedValue(1);

    await ctx.store.addWidget({ name: 'Widget A' });

    expect(ctx.store.widgets()).toEqual([{ id: 1, name: 'Widget A' }]);
  });
});
