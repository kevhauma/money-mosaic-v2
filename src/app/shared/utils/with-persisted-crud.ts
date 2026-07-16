import { inject, type Type } from '@angular/core';
import { patchState, signalStoreFeature, type, withMethods } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  updateEntity,
  type EntityProps,
  type EntityState,
  type SelectEntityId,
} from '@ngrx/signals/entities';

/** The repository surface `withPersistedCrud` needs — every entity repository in `core/data-access` already matches this shape. */
export type PersistedCrudRepository<Entity> = {
  add: (entity: Entity) => Promise<number>;
  update: (id: number, changes: Partial<Entity>) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
};

/**
 * Composable feature (TICKET-NG-08, same custom-`signalStoreFeature` shape as `withArchivable`) for
 * the "persist through the repository, then patch entity state" triple that `RulesStore`,
 * `AccountsStore`, and siblings each hand-rolled. Requires `withEntities()` already applied.
 *
 * Adds generic `add`/`update`/`remove` methods; a store with a divergent operation (e.g.
 * `AccountsStore.removeAccount`'s cascade delete) simply doesn't use the matching generic method and
 * keeps its own hand-rolled one instead — adoption is per-method, not all-or-nothing. Each consuming
 * store aliases the generic names to its own public method names in a subsequent `withMethods` block,
 * mirroring how `withArchivable`'s `activeEntities`/`archivedEntities` get aliased to
 * `activeAccounts`/`archivedAccounts` etc.
 *
 * Takes the repository's injection token (not an instance) so it can `inject()` it inside the store's
 * own injection context, and always a repository — never a Dexie table — so persistence still goes
 * exclusively through the repository layer.
 */
export function withPersistedCrud<Entity extends { id?: number }>(
  repositoryToken: Type<PersistedCrudRepository<Entity>>,
  entityConfig: { selectId: SelectEntityId<Entity> },
) {
  return signalStoreFeature(
    type<{
      state: EntityState<Entity>;
      props: EntityProps<Entity>;
      methods: Record<string, never>;
    }>(),
    withMethods((store) => {
      const repository = inject(repositoryToken);

      return {
        add: async (entity: Entity): Promise<Entity> => {
          const id = await repository.add(entity);
          const added = { ...entity, id } as Entity;
          patchState(store, addEntity(added, entityConfig));
          return added;
        },

        update: async (id: number, changes: Partial<Entity>): Promise<void> => {
          await repository.update(id, changes);
          patchState(store, updateEntity({ id, changes }, entityConfig));
        },

        remove: async (id: number): Promise<void> => {
          await repository.remove(id);
          patchState(store, removeEntity(id));
        },
      };
    }),
  );
}
