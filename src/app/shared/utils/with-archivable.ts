import { computed } from '@angular/core';
import { signalStoreFeature, type, withComputed } from '@ngrx/signals';
import { type EntityProps, type EntityState } from '@ngrx/signals/entities';

type Archivable = { archived: boolean };

/**
 * Composable feature for entity stores whose entity has `archived: boolean`.
 * Requires `withEntities()` to already be applied on the host store.
 * Adds `activeEntities`/`archivedEntities` computed filters; each consuming store aliases
 * these to its own public names (`activeAccounts`, `archivedAccounts`, etc.) and persists
 * archive/unarchive through its own repository-backed update method.
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
  );
}
