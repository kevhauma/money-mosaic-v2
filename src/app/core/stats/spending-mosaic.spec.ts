import type { Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown, type CategoryBreakdownEntry } from './category-breakdown';
import { computeSpendingMosaic, type MosaicNode } from './spending-mosaic';

const category = (id: number, overrides: Partial<Category> = {}): Category => ({
  id,
  name: `Category ${id}`,
  kind: 'expense',
  color: `#00000${id}`,
  icon: 'tag',
  archived: false,
  isSystem: false,
  ...overrides,
});

const groceries = category(1, { name: 'Groceries', group: 'Living', color: '#ff0000' });
const rent = category(2, { name: 'Rent', group: 'Living', color: '#00ff00' });
const cinema = category(3, { name: 'Cinema', color: '#0000ff' });

const categoriesById = new Map([groceries, rent, cinema].map((one) => [one.id!, one]));

const entry = (
  categoryId: number | null,
  total: number,
  share: number,
): CategoryBreakdownEntry => ({ categoryId, total, share, transactionCount: 1 });

const leafNames = (nodes: MosaicNode[]): string[] =>
  nodes.flatMap((node) => (node.children ? node.children.map((child) => child.name) : [node.name]));

describe('computeSpendingMosaic (TICKET-EXP-07)', () => {
  it('nests grouped categories under their group, heaviest tile first', () => {
    const mosaic = computeSpendingMosaic(
      [entry(2, 800, 0.5), entry(1, 400, 0.25), entry(3, 400, 0.25)],
      categoriesById,
    );

    // Living (800 + 400) outweighs Cinema (400), so the group tile leads.
    expect(mosaic.map((node) => [node.name, node.value])).toEqual([
      ['Living', 1200],
      ['Cinema', 400],
    ]);
    expect(mosaic[0].children?.map((child) => [child.name, child.value])).toEqual([
      ['Rent', 800],
      ['Groceries', 400],
    ]);
    // A group's share is its members' shares, and its colour its heaviest member's.
    expect(mosaic[0].share).toBeCloseTo(0.75);
    expect(mosaic[0].color).toBe(rent.color);
    expect(mosaic[0].categoryId).toBeUndefined();
  });

  it('keeps an ungrouped category at the top level, as its own leaf tile', () => {
    const mosaic = computeSpendingMosaic([entry(3, 400, 1)], categoriesById);

    expect(mosaic).toEqual([
      {
        id: 'category:3',
        name: 'Cinema',
        value: 400,
        share: 1,
        color: '#0000ff',
        categoryId: 3,
      },
    ]);
  });

  it('gives uncategorised spending its own labelled top-level tile, never folded into a group', () => {
    const mosaic = computeSpendingMosaic(
      [entry(1, 300, 0.5), entry(null, 300, 0.5)],
      categoriesById,
    );

    const uncategorised = mosaic.find((node) => node.categoryId === null);
    expect(uncategorised).toMatchObject({ id: 'category:none', name: 'Uncategorised', value: 300 });
    expect(mosaic.find((node) => node.name === 'Living')?.children).toHaveLength(1);
  });

  it('treats a blank group as no group, and a vanished category as an unknown leaf', () => {
    const blankGroup = category(4, { name: 'Blank', group: '   ' });
    const mosaic = computeSpendingMosaic(
      [entry(4, 100, 0.5), entry(99, 100, 0.5)],
      new Map([[blankGroup.id!, blankGroup]]),
    );

    expect(mosaic.every((node) => node.children === undefined)).toBe(true);
    expect(mosaic.map((node) => node.name).sort()).toEqual(['Blank', 'Unknown']);
  });

  it('returns nothing at all for an empty breakdown, and drops zero-value entries', () => {
    expect(computeSpendingMosaic([], categoriesById)).toEqual([]);
    // A category fully refunded inside the range is clamped to 0 by TICKET-STAT-11; a zero-area tile
    // would be invisible on the canvas but still labelled in the breadcrumb and the figure table.
    expect(computeSpendingMosaic([entry(1, 0, 0), entry(3, 50, 1)], categoriesById)).toHaveLength(
      1,
    );
  });

  it('never re-classifies: its leaves sum to exactly what the breakdown it was fed sums to', () => {
    const transaction = (overrides: Partial<Transaction>): Transaction => ({
      id: 1,
      accountId: 1,
      bookingDate: '2026-07-10',
      amount: -10,
      currency: 'EUR',
      rawDescription: 'Something',
      fingerprint: 'fp',
      createdAt: '2026-07-10T00:00:00.000Z',
      ...overrides,
    });

    const { expenseByCategory } = computeCategoryBreakdown(
      [
        transaction({ id: 1, amount: -120.55, categoryId: 1 }),
        transaction({ id: 2, amount: -80.4, categoryId: 2 }),
        transaction({ id: 3, amount: -19.99, categoryId: 3 }),
        transaction({ id: 4, amount: -5.5 }),
        transaction({ id: 5, amount: 15, categoryId: 1 }),
      ],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    const mosaic = computeSpendingMosaic(expenseByCategory, categoriesById);
    const leafTotal = (nodes: MosaicNode[]): number =>
      nodes.reduce((sum, node) => sum + (node.children ? leafTotal(node.children) : node.value), 0);

    expect(leafTotal(mosaic)).toBeCloseTo(
      expenseByCategory.reduce((sum, one) => sum + one.total, 0),
      10,
    );
    // And every entry is present exactly once — a fold regroups, it never drops or invents.
    expect(leafNames(mosaic).sort()).toEqual(
      ['Cinema', 'Groceries', 'Rent', 'Uncategorised'].sort(),
    );
    expect(mosaic.reduce((sum, node) => sum + node.value, 0)).toBeCloseTo(leafTotal(mosaic), 10);
  });
});

describe('computeSpendingMosaic with payments (TICKET-EXP-08)', () => {
  const payment = (transactionId: number, value: number, name = `Shop ${transactionId}`) => ({
    transactionId,
    name,
    value,
    date: '2026-07-10',
  });

  const withPayments = (
    entries: CategoryBreakdownEntry[],
    byCategory: Record<number, ReturnType<typeof payment>[]>,
    refunded = 0,
  ): MosaicNode[] =>
    computeSpendingMosaic(
      entries,
      categoriesById,
      new Map(
        Object.entries(byCategory).map(([id, transactions]) => [
          Number(id),
          { transactions, refunded },
        ]),
      ),
    );

  it('hangs a category payments under it, in its own colour', () => {
    const [tile] = withPayments([entry(3, 100, 1)], { 3: [payment(1, 70), payment(2, 30)] });

    expect(tile.name).toBe('Cinema');
    expect(tile.children?.map((child) => [child.id, child.name, child.value, child.color])).toEqual(
      [
        ['txn:1', 'Shop 1', 70, cinema.color],
        ['txn:2', 'Shop 2', 30, cinema.color],
      ],
    );
    // A payment's share is of all spending, like every other tile, and the payments' shares add up
    // to the category's own rather than to some other denominator.
    expect(tile.children!.reduce((sum, child) => sum + child.share, 0)).toBeCloseTo(tile.share, 10);
  });

  it('reaches payments inside a group, two levels down', () => {
    const [group] = withPayments([entry(1, 100, 1)], { 1: [payment(1, 60), payment(2, 40)] });

    expect(group.name).toBe('Living');
    expect(group.children?.[0].name).toBe('Groceries');
    expect(group.children?.[0].children?.map((child) => child.id)).toEqual(['txn:1', 'txn:2']);
  });

  it('folds everything past the cap into one labelled remainder worth exactly their sum', () => {
    const many = Array.from({ length: 45 }, (_, index) => payment(index + 1, 45 - index));
    const total = many.reduce((sum, one) => sum + one.value, 0);
    const [tile] = withPayments([entry(3, total, 1)], { 3: many });

    expect(tile.children).toHaveLength(41);
    const remainder = tile.children!.at(-1)!;
    expect(remainder.name).toBe('5 smaller payments');
    expect(remainder.id).toBe('category:3:rest');
    expect(remainder.value).toBe(many.slice(40).reduce((sum, one) => sum + one.value, 0));
    // Nothing is lost to the fold: the tiles still add up to what the category holds.
    expect(tile.children!.reduce((sum, child) => sum + child.value, 0)).toBeCloseTo(total, 10);
  });

  it('names a single folded payment in the singular', () => {
    const many = Array.from({ length: 41 }, (_, index) => payment(index + 1, 41 - index));
    const [tile] = withPayments([entry(3, 861, 1)], { 3: many });

    expect(tile.children!.at(-1)!.name).toBe('1 smaller payment');
  });

  it('leaves a category with nothing to subdivide a leaf, rather than an enterable dead end', () => {
    expect(withPayments([entry(3, 100, 1)], { 3: [] })[0].children).toBeUndefined();
    // One payment is the same rectangle again under a new breadcrumb — not a subdivision.
    expect(withPayments([entry(3, 100, 1)], { 3: [payment(1, 100)] })[0].children).toBeUndefined();
  });

  it('produces exactly today two-level output when no payments are passed at all', () => {
    const entries = [entry(1, 400, 0.5), entry(3, 400, 0.5)];

    expect(computeSpendingMosaic(entries, categoriesById, new Map())).toEqual(
      computeSpendingMosaic(entries, categoriesById),
    );
  });
});
