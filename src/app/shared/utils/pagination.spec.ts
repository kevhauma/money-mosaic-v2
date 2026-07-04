import { signal } from '@angular/core';
import { createPagination } from './pagination';

describe('createPagination', () => {
  const range = (length: number) => Array.from({ length }, (_, i) => i);

  it('reports total pages and clamps the first page range', () => {
    const items = signal(range(120));
    const { totalPages, pageRange, pagedItems } = createPagination({ items, pageSize: 50 });

    expect(totalPages()).toBe(3);
    expect(pageRange()).toEqual({ start: 1, end: 50, total: 120 });
    expect(pagedItems()).toEqual(range(50));
  });

  it('slices and reports the range for a later page', () => {
    const items = signal(range(120));
    const pagination = createPagination({ items, pageSize: 50 });

    pagination.setPage(3);

    expect(pagination.currentPage()).toBe(3);
    expect(pagination.pagedItems()).toEqual(range(120).slice(100));
    expect(pagination.pageRange()).toEqual({ start: 101, end: 120, total: 120 });
  });

  it('handles an empty list', () => {
    const items = signal<number[]>([]);
    const { totalPages, pageRange, pagedItems } = createPagination({ items, pageSize: 50 });

    expect(totalPages()).toBe(1);
    expect(pageRange()).toEqual({ start: 0, end: 0, total: 0 });
    expect(pagedItems()).toEqual([]);
  });

  it('clamps the current page when the list shrinks past it', () => {
    const items = signal(range(120));
    const pagination = createPagination({ items, pageSize: 50 });
    pagination.setPage(3);
    expect(pagination.currentPage()).toBe(3);

    items.set(range(40));

    expect(pagination.totalPages()).toBe(1);
    expect(pagination.currentPage()).toBe(1);
    expect(pagination.pagedItems()).toEqual(range(40));
  });

  it('resets to page 1 when the resetOn signal changes', () => {
    const items = signal(range(120));
    const resetOn = signal('filters-a');
    const pagination = createPagination({ items, pageSize: 50, resetOn });
    pagination.setPage(3);
    expect(pagination.currentPage()).toBe(3);

    resetOn.set('filters-b');

    expect(pagination.currentPage()).toBe(1);
  });
});
