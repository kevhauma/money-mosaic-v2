import type { Category } from '@/core/data-access';
import type { CategoryBreakdownEntry } from './category-breakdown';
import type {
  CategoryExpenseTransaction,
  CategoryExpenseTransactions,
} from './category-expense-transactions';

/**
 * One tile of the mosaic. A group tile carries category `children` and no `categoryId`; a category
 * tile carries `categoryId` (`null` = the explicit uncategorised bucket) and, once transactions are
 * supplied (TICKET-EXP-08), its payments as `children`; a payment tile carries neither.
 *
 * `id` is namespaced by kind — `group:<name>` / `category:<categoryId|none>` / `txn:<id>` — so a
 * group, a category and a payment that happen to share a display name stay three tiles, and the
 * option builder can key its label/tooltip lookups on something the display name can't collide on.
 */
export type MosaicNode = {
  id: string;
  name: string;
  value: number;
  /** Share of the range's whole expense total, 0..1 — a group's is the sum of its children's. */
  share: number;
  color: string;
  categoryId?: number | null;
  /**
   * Present on a payment tile (TICKET-EXP-08) — the booking date, ISO. A category's payments carry
   * the same counterparty over and over, so the date is the only thing that tells one FreshMarket
   * run from the next; it is what the tooltip identifies a tile by.
   */
  date?: string;
  children?: MosaicNode[];
};

/**
 * How many payments a category subdivides into before the rest are folded into one labelled
 * remainder tile. A drilled-in box of several hundred one-pixel slivers answers "many small or a
 * few big?" worse than forty tiles beside a tile that says how many more there are — and it bounds
 * what the `sr-only` table has to mirror on a decade-wide range.
 */
export const MAX_TRANSACTION_TILES = 40;

/** What the fold-up tile is called, given how many payments it stands for. */
const remainderName = (count: number): string =>
  count === 1 ? '1 smaller payment' : `${count} smaller payments`;

/** The uncategorised tile's label — spelled out rather than left blank, like every other composition view. */
const UNCATEGORISED_NAME = 'Uncategorised';

/** A `categoryId` with no category behind it any more (a deleted category still named by an entry). */
const UNKNOWN_NAME = 'Unknown';

/** `CHART_NO_COLOR_FALLBACK`'s value, duplicated here for the same reason `money-flow-graph.ts` duplicates it: `core/` never imports from `shared/echarts`. */
const NO_COLOR_FALLBACK = '#9ca3af';

const byValueDescending = (a: MosaicNode, b: MosaicNode): number => b.value - a.value;

const sumOf = (nodes: readonly MosaicNode[], field: 'value' | 'share'): number =>
  nodes.reduce((total, node) => total + node[field], 0);

/** The category an entry names, or `undefined` for the uncategorised bucket — and for a category that no longer exists. */
const categoryOf = (
  entry: CategoryBreakdownEntry,
  categoriesById: ReadonlyMap<number, Category>,
): Category | undefined =>
  entry.categoryId == null ? undefined : categoriesById.get(entry.categoryId);

/** What a tile is called: its category's name, the uncategorised label, or — for a deleted category still named by an entry — an explicit unknown. */
const nameFor = (entry: CategoryBreakdownEntry, category: Category | undefined): string => {
  if (entry.categoryId == null) return UNCATEGORISED_NAME;
  return category?.name ?? UNKNOWN_NAME;
};

/** The group a category belongs to, treating a blank one as none at all. */
const groupOf = (category: Category | undefined): string | undefined =>
  category?.group?.trim() || undefined;

/** A tile's colour: its category's, or the neutral fallback for uncategorised and for a category that never got one. */
const colorOf = (category: Category | undefined): string => category?.color || NO_COLOR_FALLBACK;

/** A category tile's namespaced id — built here alone, since the remainder tile hangs its own id off it. */
const categoryTileId = (entry: CategoryBreakdownEntry): string =>
  `category:${entry.categoryId ?? 'none'}`;

/** The payments recorded for a category, or none when the caller didn't ask for the third level at all. */
const paymentsOf = (
  transactionsByCategory: ReadonlyMap<number | null, CategoryExpenseTransactions>,
  categoryId: number | null,
): readonly CategoryExpenseTransactions['transactions'][number][] =>
  transactionsByCategory.get(categoryId)?.transactions ?? [];

/**
 * A category's payments as its child tiles (TICKET-EXP-08), capped and with the tail folded into one
 * labelled remainder whose value is exactly the sum of what it stands for.
 *
 * Shares are of the same denominator every other tile uses — the range's whole expense total — so a
 * payment's share can be read against a category's without converting anything. They are derived
 * from the *category's* share rather than recomputed from a total this function isn't given, which
 * also keeps them summing to the category's share exactly.
 *
 * Every tile takes the category's own colour: a drilled-in box should read as one category's worth
 * of payments, not as a new palette.
 *
 * A category with **fewer than two** payments returns `undefined` and stays a leaf. A single-payment
 * category has nothing to subdivide — drilling into it would redraw the same rectangle at the same
 * size under a new breadcrumb, and its figure-table row would gain a duplicate of itself.
 */
const paymentsFor = (
  entry: CategoryBreakdownEntry,
  color: string,
  payments: readonly CategoryExpenseTransaction[],
): MosaicNode[] | undefined => {
  if (payments.length < 2) return undefined;

  const paymentTotal = payments.reduce((sum, payment) => sum + payment.value, 0);
  const shareOf = (value: number): number =>
    paymentTotal === 0 ? 0 : (value / paymentTotal) * entry.share;

  const shown = payments.slice(0, MAX_TRANSACTION_TILES);
  const rest = payments.slice(MAX_TRANSACTION_TILES);
  const tiles = shown.map((payment): MosaicNode => ({
    id: `txn:${payment.transactionId}`,
    name: payment.name,
    value: payment.value,
    share: shareOf(payment.value),
    color,
    date: payment.date,
  }));

  if (rest.length === 0) return tiles;

  const restTotal = rest.reduce((sum, payment) => sum + payment.value, 0);
  return [
    ...tiles,
    {
      id: `${categoryTileId(entry)}:rest`,
      name: remainderName(rest.length),
      value: restTotal,
      share: shareOf(restTotal),
      color,
    },
  ];
};

const leafFor = (
  entry: CategoryBreakdownEntry,
  category: Category | undefined,
  payments: readonly CategoryExpenseTransaction[],
): MosaicNode => {
  const color = colorOf(category);
  const children = paymentsFor(entry, color, payments);
  return {
    id: categoryTileId(entry),
    name: nameFor(entry, category),
    value: entry.total,
    share: entry.share,
    color,
    categoryId: entry.categoryId,
    ...(children ? { children } : {}),
  };
};

const groupFor = (name: string, members: readonly MosaicNode[]): MosaicNode => {
  const children = [...members].sort(byValueDescending);
  return {
    id: `group:${name}`,
    name,
    value: sumOf(children, 'value'),
    share: sumOf(children, 'share'),
    color: children[0].color,
    children,
  };
};

/**
 * The range's expenses as a two-level, area-true tree (FR-EXP-4, TICKET-EXP-07): group tiles holding
 * their categories' tiles, categories with no `Category.group` as top-level tiles, and uncategorised
 * spending as its own labelled top-level tile — never folded into a group it has no way of belonging
 * to.
 *
 * **It consumes `computeCategoryBreakdown().expenseByCategory` rather than re-classifying**, which is
 * the whole correctness argument: `classifyForStats` is never reached from here, so the mosaic and
 * the Dashboard's pie cannot disagree about what an expense is or what it is worth. Summing the leaf
 * values reproduces the summed breakdown entries by construction — a fold only ever regroups them
 * (asserted in the spec).
 *
 * Entries clamped to zero by the refund pass (TICKET-STAT-11) are dropped: a zero-area tile is
 * invisible on a treemap but still labelled in the breadcrumb and the figure table, which reads as a
 * rendering fault rather than as "nothing was spent here".
 *
 * A group's colour is its heaviest member's, the `money-flow-graph` precedent — a group should read
 * as the category that dominates it rather than as an arbitrary palette slot. Pure and theme-free:
 * no DI, no store, no Dexie, no `shared/echarts` import.
 *
 * **A third level, when asked for** (TICKET-EXP-08): passing
 * `computeCategoryExpenseTransactions()`'s map hangs a category's individual payments under it, so a
 * category shows whether it is a few big rectangles or a hundred slivers. Omit it and every category
 * stays a leaf, exactly as before — the argument is additive, and the two-level behaviour is
 * asserted separately from the three-level one. **Its payments must arrive heaviest-first** (which
 * `computeCategoryExpenseTransactions` guarantees): the cap keeps the head of each list, and calls
 * the tail it folds up "smaller payments".
 */
export const computeSpendingMosaic = (
  expenseByCategory: readonly CategoryBreakdownEntry[],
  categoriesById: ReadonlyMap<number, Category>,
  transactionsByCategory: ReadonlyMap<number | null, CategoryExpenseTransactions> = new Map(),
): MosaicNode[] => {
  const ungrouped: MosaicNode[] = [];
  /** Group name → its members, in first-seen order; the group tiles themselves are built once the totals are known. */
  const byGroup = new Map<string, MosaicNode[]>();

  for (const entry of expenseByCategory.filter((one) => one.total > 0)) {
    const category = categoryOf(entry, categoriesById);
    const group = groupOf(category);
    const leaf = leafFor(entry, category, paymentsOf(transactionsByCategory, entry.categoryId));

    if (!group) ungrouped.push(leaf);
    else if (byGroup.has(group)) byGroup.get(group)!.push(leaf);
    else byGroup.set(group, [leaf]);
  }

  const groups = [...byGroup.entries()].map(([name, members]) => groupFor(name, members));

  return [...ungrouped, ...groups].sort(byValueDescending);
};
