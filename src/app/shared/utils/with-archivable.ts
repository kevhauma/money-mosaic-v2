import { computed } from '@angular/core';
import { patchState, signalStoreFeature, type, withComputed, withMethods } from '@ngrx/signals';
import { type EntityId, type EntityProps, type EntityState } from '@ngrx/signals/entities';

type Archivable = { archived: boolean };

/**
 * Composable feature for entity stores whose entity has `archived: boolean`.
 * Requires `withEntities()` to already be applied on the host store.
 * Adds `activeEntities`/`archivedEntities` computed filters and a generic
 * `setArchived(id, archived)` method; each consuming store aliases these to
 * its own public names (`activeAccounts`, `archiveAccount`, etc.).
 *
 * Patches `entityMap` directly (rather than via the `updateEntity` helper) because
 * `updateEntity`'s generic constraint requires a non-optional `id: EntityId`, which none
 * of this app's domain types declare (Dexie assigns `id` on insert, so it's always optional
 * at the type level) — `EntityState`/`entityMap` are themselves the public, documented shape.
 */
export function withArchivable<Entity extends Archivable>() {
  return signalStoreFeature(
    type<{
      state: EntityState<Entity>;
      props: EntityProps<Entity>;
      methods: Record<string, never>;
    }>(),
    withComputed(({ entities }) => ({
      activeEntities: computed(() => entities().filter((entity) => !entity.archived)),
      archivedEntities: computed(() => entities().filter((entity) => entity.archived)),
    })),
    withMethods((store) => ({
      setArchived(id: EntityId, archived: boolean): void {
        patchState(store, (state) => {
          const entity = state.entityMap[id];
          return entity ? { entityMap: { ...state.entityMap, [id]: { ...entity, archived } } } : {};
        });
      },
    })),
  );
}
