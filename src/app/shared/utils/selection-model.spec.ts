import { createSelectionModel } from './selection-model';

describe('createSelectionModel', () => {
  it('starts empty', () => {
    const selection = createSelectionModel<number>();

    expect(selection.count()).toBe(0);
    expect(selection.selectedIds().size).toBe(0);
  });

  it('toggles an id on, then off', () => {
    const selection = createSelectionModel<number>();

    selection.toggle(1);
    expect(selection.selectedIds().has(1)).toBe(true);
    expect(selection.count()).toBe(1);

    selection.toggle(1);
    expect(selection.selectedIds().has(1)).toBe(false);
    expect(selection.count()).toBe(0);
  });

  it('selectAll replaces the selection with exactly the given ids', () => {
    const selection = createSelectionModel<number>();
    selection.toggle(99);

    selection.selectAll([1, 2, 3]);

    expect([...selection.selectedIds()].sort()).toEqual([1, 2, 3]);
    expect(selection.count()).toBe(3);
  });

  it('clear empties the selection', () => {
    const selection = createSelectionModel<number>();
    selection.selectAll([1, 2, 3]);

    selection.clear();

    expect(selection.count()).toBe(0);
  });

  it('allSelected is false for an empty candidate list', () => {
    const selection = createSelectionModel<number>();
    selection.selectAll([1, 2]);

    expect(selection.allSelected([])).toBe(false);
  });

  it('allSelected is true only when every candidate id is selected', () => {
    const selection = createSelectionModel<number>();
    selection.selectAll([1, 2]);

    expect(selection.allSelected([1, 2, 3])).toBe(false);

    selection.selectAll([1, 2, 3]);
    expect(selection.allSelected([1, 2, 3])).toBe(true);
  });

  it('someSelected is the indeterminate case: at least one selected, but not all candidates', () => {
    const selection = createSelectionModel<number>();

    expect(selection.someSelected([1, 2, 3])).toBe(false);

    selection.toggle(1);
    expect(selection.someSelected([1, 2, 3])).toBe(true);

    selection.selectAll([1, 2, 3]);
    expect(selection.someSelected([1, 2, 3])).toBe(false);
  });
});
