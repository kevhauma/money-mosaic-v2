import { compareBySortOrder, computeReorderUpdates } from './sortable';

describe('compareBySortOrder', () => {
  it('sorts ascending by sortOrder when both entities have one', () => {
    const list = [
      { id: 1, sortOrder: 2 },
      { id: 2, sortOrder: 1 },
      { id: 3, sortOrder: 3 },
    ];

    expect([...list].sort(compareBySortOrder).map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it('sorts entities without a sortOrder after every entity that has one', () => {
    const list = [{ id: 1, sortOrder: undefined }, { id: 2, sortOrder: 5 }, { id: 3 }];

    expect([...list].sort(compareBySortOrder).map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it('falls back to stable id order when neither entity has a sortOrder (unaffected legacy data)', () => {
    const list = [{ id: 3 }, { id: 1 }, { id: 2 }];

    expect([...list].sort(compareBySortOrder).map((item) => item.id)).toEqual([1, 2, 3]);
  });
});

describe('computeReorderUpdates', () => {
  it('swaps sortOrder with the previous neighbour on "up"', () => {
    const ordered = [
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 10 },
      { id: 3, sortOrder: 20 },
    ];

    const updates = computeReorderUpdates(ordered, 3, 'up');

    expect(updates).toEqual(
      expect.arrayContaining([
        { id: 3, sortOrder: 10 },
        { id: 2, sortOrder: 20 },
      ]),
    );
    expect(updates).toHaveLength(2);
  });

  it('swaps sortOrder with the next neighbour on "down"', () => {
    const ordered = [
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 10 },
      { id: 3, sortOrder: 20 },
    ];

    const updates = computeReorderUpdates(ordered, 1, 'down');

    expect(updates).toEqual(
      expect.arrayContaining([
        { id: 1, sortOrder: 10 },
        { id: 2, sortOrder: 0 },
      ]),
    );
    expect(updates).toHaveLength(2);
  });

  it('backfills every entity missing a sortOrder to its current position before swapping', () => {
    // Nothing has a sortOrder yet — mirrors the very first reorder on fresh data.
    const ordered = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const updates = computeReorderUpdates(ordered, 2, 'up');

    expect(updates).toEqual(
      expect.arrayContaining([
        { id: 1, sortOrder: 1 },
        { id: 2, sortOrder: 0 },
        { id: 3, sortOrder: 2 },
      ]),
    );
    expect(updates).toHaveLength(3);
  });

  it('returns no updates when moving the first entity up', () => {
    const ordered = [
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 1 },
    ];

    expect(computeReorderUpdates(ordered, 1, 'up')).toEqual([]);
  });

  it('returns no updates when moving the last entity down', () => {
    const ordered = [
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 1 },
    ];

    expect(computeReorderUpdates(ordered, 2, 'down')).toEqual([]);
  });

  it('returns no updates for an id not present in the list', () => {
    const ordered = [
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 1 },
    ];

    expect(computeReorderUpdates(ordered, 99, 'up')).toEqual([]);
  });
});
