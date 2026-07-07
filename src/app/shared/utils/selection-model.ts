import { computed, signal, type Signal } from '@angular/core';

export type SelectionModel<Id> = {
  selectedIds: Signal<ReadonlySet<Id>>;
  count: Signal<number>;
  toggle: (id: Id) => void;
  selectAll: (ids: readonly Id[]) => void;
  clear: () => void;
  allSelected: (ids: readonly Id[]) => boolean;
  someSelected: (ids: readonly Id[]) => boolean;
};

/**
 * Signal-based multi-selection bookkeeping, generic over the id type. Presentation-agnostic:
 * pair it with a checkbox column/header tristate, or drive it directly (mirrors `createPagination`).
 */
export function createSelectionModel<Id>(): SelectionModel<Id> {
  const selectedIds = signal<Set<Id>>(new Set());
  const count = computed(() => selectedIds().size);

  const toggle = (id: Id): void => {
    selectedIds.update((existing) => {
      const next = new Set(existing);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (ids: readonly Id[]): void => {
    selectedIds.set(new Set(ids));
  };

  const clear = (): void => {
    selectedIds.set(new Set());
  };

  const allSelected = (ids: readonly Id[]): boolean =>
    ids.length > 0 && ids.every((id) => selectedIds().has(id));

  const someSelected = (ids: readonly Id[]): boolean => count() > 0 && !allSelected(ids);

  return { selectedIds, count, toggle, selectAll, clear, allSelected, someSelected };
}
