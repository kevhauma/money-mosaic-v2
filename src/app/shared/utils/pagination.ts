import { computed, linkedSignal, signal, type Signal } from '@angular/core';

export type PageRange = { start: number; end: number; total: number };

export type Pagination<T> = {
  currentPage: Signal<number>;
  totalPages: Signal<number>;
  pagedItems: Signal<T[]>;
  pageRange: Signal<PageRange>;
  setPage: (page: number) => void;
};

/**
 * Signal-based paging over a reactive list — clamps, slices, and reports the 1-based row range.
 * Presentation-agnostic: pair it with `mm-paginator` or drive it directly.
 */
export function createPagination<T>(config: {
  items: Signal<readonly T[]>;
  pageSize: number;
  /** When provided, the page resets to 1 whenever this signal changes (e.g. filters). */
  resetOn?: Signal<unknown>;
}): Pagination<T> {
  const { items, pageSize, resetOn } = config;

  const totalPages = computed(() => Math.max(1, Math.ceil(items().length / pageSize)));

  const requestedPage = resetOn
    ? linkedSignal({ source: resetOn, computation: () => 1 })
    : signal(1);

  // Clamp so a shrinking result set can't strand us past the last page.
  const currentPage = computed(() => Math.min(requestedPage(), totalPages()));

  const pagedItems = computed(() => {
    const start = (currentPage() - 1) * pageSize;
    return items().slice(start, start + pageSize);
  });

  const pageRange = computed<PageRange>(() => {
    const total = items().length;
    if (total === 0) return { start: 0, end: 0, total };
    const start = (currentPage() - 1) * pageSize + 1;
    return { start, end: Math.min(start + pageSize - 1, total), total };
  });

  return {
    currentPage,
    totalPages,
    pagedItems,
    pageRange,
    setPage: (page) => requestedPage.set(page),
  };
}
