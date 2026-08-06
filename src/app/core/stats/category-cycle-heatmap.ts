import type { Account, Category, Transaction } from '@/core/data-access';
import {
  bucketKeysInRange,
  cycleColumnIndex,
  cycleColumnKeys,
  type CycleKey,
} from '@/shared/utils';
import { computeCategoryBreakdown } from './category-breakdown';
import { classifyForStats } from './classify-for-stats';

export type HeatmapRow = {
  /** `null` = the "Other" fold (every category outside the top N, plus uncategorised spend). */
  categoryId: number | null;
  name: string;
  color: string;
  /** Sum of this row's cells, so the row total can never disagree with what the row draws. */
  total: number;
};

export type HeatmapCell = {
  rowIndex: number;
  columnIndex: number;
  amount: number;
};

export type CategoryCycleHeatmap = {
  /**
   * The cycle's columns as stable, locale-independent keys, always in full. Display labels are the
   * caller's business (`cycleColumnLabels`) — an aggregation over every transaction has no reason
   * to re-run because the locale setting changed.
   */
  columnKeys: string[];
  rows: HeatmapRow[];
  /** One cell per (row, column) pair — a complete grid, so an empty position reads as €0, not as a hole. */
  cells: HeatmapCell[];
  maxAmount: number;
  /**
   * How many of the cycle's columns the *range* can reach at all (TICKET-STAT-30) — a three-month
   * range touches 3 of 12 months however much was spent. Lets the panel say so instead of leaving
   * nine structurally-empty columns to read as nine quiet months.
   */
  coveredColumnCount: number;
};

const OTHER_ROW_NAME = 'Other';
const DEFAULT_TOP_CATEGORY_COUNT = 4;

/** `CHART_NO_COLOR_FALLBACK`'s value, duplicated here for the same reason `category-composition-trend.ts` duplicates it: `core/` never imports from `shared/echarts`. */
const NO_COLOR_FALLBACK = '#9ca3af';

/**
 * How many of a cycle's columns the range's own calendar days can land in (TICKET-STAT-30) — the
 * denominator for "this range only covers 3 of 12 months".
 */
const countCoveredColumns = (from: string, to: string, cycle: CycleKey): number => {
  const covered = new Set<number>();
  for (const day of bucketKeysInRange(from, to, 'day')) {
    covered.add(cycleColumnIndex(day, cycle));
  }
  return covered.size;
};

type CellTotals = {
  /** Keyed `"<rowIndex>:<columnIndex>"`, holding the *signed* running total before clamping. */
  byCell: Map<string, number>;
  otherRowUsed: boolean;
};

/**
 * Accumulates every expense into its (row, column) cell. `rowIndexByCategoryId` decides which
 * categories get their own row; everything else — including uncategorised spend — lands on
 * `otherRowIndex`.
 */
const accumulateCellTotals = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  from: string,
  to: string,
  cycle: CycleKey,
  ownSavingsIbans: ReadonlySet<string>,
  accountsById: ReadonlyMap<number, Account>,
  rowIndexByCategoryId: ReadonlyMap<number, number>,
  otherRowIndex: number,
): CellTotals => {
  const byCell = new Map<string, number>();
  let otherRowUsed = false;

  for (const transaction of transactions) {
    const result = classifyForStats(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
    );
    if (result.kind !== 'expense') continue;

    const ownRowIndex =
      result.categoryId != null ? rowIndexByCategoryId.get(result.categoryId) : undefined;
    const rowIndex = ownRowIndex ?? otherRowIndex;
    if (rowIndex === otherRowIndex) otherRowUsed = true;

    const cellKey = `${rowIndex}:${cycleColumnIndex(transaction.bookingDate, cycle)}`;
    byCell.set(cellKey, (byCell.get(cellKey) ?? 0) + result.amount);
  }

  return { byCell, otherRowUsed };
};

/**
 * Fills the complete `rowCount × columnCount` grid from the accumulated totals, clamping each cell
 * like `computeCategoryBreakdown`'s entries: a cell where refunds outweigh spend is "nothing spent
 * then", not a negative that would invert the colour scale.
 */
const buildGrid = (
  byCell: ReadonlyMap<string, number>,
  rowCount: number,
  columnCount: number,
): { cells: HeatmapCell[]; rowTotals: number[]; maxAmount: number } => {
  const cells: HeatmapCell[] = [];
  const rowTotals = new Array<number>(rowCount).fill(0);
  let maxAmount = 0;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const amount = Math.max(0, byCell.get(`${rowIndex}:${columnIndex}`) ?? 0);
      cells.push({ rowIndex, columnIndex, amount });
      rowTotals[rowIndex] += amount;
      if (amount > maxAmount) maxAmount = amount;
    }
  }

  return { cells, rowTotals, maxAmount };
};

/** One row per top category, plus the "Other" fold when anything landed in it. */
const buildRows = (
  topCategoryIds: readonly number[],
  categoriesById: Map<number, Category>,
  rowTotals: readonly number[],
  otherRowUsed: boolean,
): HeatmapRow[] => {
  const rows: HeatmapRow[] = topCategoryIds.map((categoryId, index) => {
    const category = categoriesById.get(categoryId);
    return {
      categoryId,
      name: category?.name ?? 'Unknown',
      color: category?.color ?? NO_COLOR_FALLBACK,
      total: rowTotals[index],
    };
  });

  if (otherRowUsed) {
    rows.push({
      categoryId: null,
      name: OTHER_ROW_NAME,
      color: NO_COLOR_FALLBACK,
      total: rowTotals[topCategoryIds.length],
    });
  }

  return rows;
};

/**
 * Expense per category per position in a repeating calendar cycle (FR-STAT-15, TICKET-STAT-29) —
 * "which category burns money on which day of the week", which no chronological aggregate can
 * answer because every Monday sits in a different bucket there.
 *
 * Rows are the top `topN` **real** categories by range total, ranked by `computeCategoryBreakdown`
 * (the app's established ranking, netted and clamped per TICKET-STAT-11), plus one "Other" row
 * folding every remaining category *and* uncategorised spend — uncategorised never takes a row of
 * its own, since "no category" isn't a spending pattern. A row's `total` is the sum of its own
 * clamped cells rather than the breakdown's figure, so the row can't state a number its cells
 * don't add up to.
 *
 * Every per-transaction exclusion/routing decision is delegated to `classifyForStats` (CR3-2.1) —
 * only `expense`-classified amounts accumulate, so a heatmap cell and a Dashboard stat card can't
 * drift apart on what counts as spending.
 */
export const computeCategoryCycleHeatmap = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  from: string,
  to: string,
  cycle: CycleKey = 'day-of-week',
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
  topN: number = DEFAULT_TOP_CATEGORY_COUNT,
): CategoryCycleHeatmap => {
  const columnKeys = cycleColumnKeys(cycle);

  const { expenseByCategory } = computeCategoryBreakdown(
    transactions,
    categoriesById,
    from,
    to,
    ownSavingsIbans,
    accountsById,
  );

  const topCategoryIds = expenseByCategory
    .filter((entry) => entry.categoryId != null && entry.total > 0)
    .slice(0, topN)
    .map((entry) => entry.categoryId as number);

  const rowIndexByCategoryId = new Map(topCategoryIds.map((id, index) => [id, index]));
  // Only claimed once something actually lands in it — a fold with nothing to fold is not a row.
  const otherRowIndex = topCategoryIds.length;

  const { byCell, otherRowUsed } = accumulateCellTotals(
    transactions,
    categoriesById,
    from,
    to,
    cycle,
    ownSavingsIbans,
    accountsById,
    rowIndexByCategoryId,
    otherRowIndex,
  );

  const coveredColumnCount = countCoveredColumns(from, to, cycle);

  const rowCount = otherRowIndex + (otherRowUsed ? 1 : 0);
  if (rowCount === 0) {
    return { columnKeys, rows: [], cells: [], maxAmount: 0, coveredColumnCount };
  }

  const { cells, rowTotals, maxAmount } = buildGrid(byCell, rowCount, columnKeys.length);

  return {
    columnKeys,
    rows: buildRows(topCategoryIds, categoriesById, rowTotals, otherRowUsed),
    cells,
    maxAmount,
    coveredColumnCount,
  };
};
