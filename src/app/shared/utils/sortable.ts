import { computed, type Signal } from '@angular/core';

export type Sortable = { id?: number; sortOrder?: number };

/**
 * Ascending by `sortOrder`; entities without one sort after every entity that has one (stable
 * `id` order as the tie-break), so data seeded before `sortOrder` existed renders unchanged until
 * the user reorders it.
 */
export function compareBySortOrder(a: Sortable, b: Sortable): number {
  if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
  if (a.sortOrder != null) return -1;
  if (b.sortOrder != null) return 1;
  return (a.id ?? 0) - (b.id ?? 0);
}

/** Wraps an entities signal in a `sortOrder`-sorted computed, for a store's public list aliases. */
export function sortedBySortOrder<T extends Sortable>(items: Signal<readonly T[]>): Signal<T[]> {
  return computed(() => [...items()].sort(compareBySortOrder));
}

/**
 * Computes the `sortOrder` writes needed to move `id` one slot up/down within `ordered` (already
 * sorted via `compareBySortOrder`). Lazily backfills a concrete `sortOrder` (its current position)
 * onto every entity that doesn't have one yet — the first reorder anywhere in the list "locks in"
 * today's order for entities the fallback rule was silently placing, so a plain value swap between
 * neighbours is all subsequent moves need. Returns `[]` at either boundary or for an unknown id.
 */
export function computeReorderUpdates<T extends Sortable>(
  ordered: readonly T[],
  id: number,
  direction: 'up' | 'down',
): { id: number; sortOrder: number }[] {
  const index = ordered.findIndex((item) => item.id === id);
  const neighbourIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || neighbourIndex < 0 || neighbourIndex >= ordered.length) return [];

  const resolvedOrder = ordered.map((item, i) => item.sortOrder ?? i);

  const updates = new Map<number, number>();
  ordered.forEach((item, i) => {
    if (item.sortOrder == null) updates.set(item.id!, resolvedOrder[i]);
  });
  updates.set(ordered[index].id!, resolvedOrder[neighbourIndex]);
  updates.set(ordered[neighbourIndex].id!, resolvedOrder[index]);

  return [...updates.entries()].map(([updateId, sortOrder]) => ({ id: updateId, sortOrder }));
}
