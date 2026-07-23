import type { RuleCondition, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';

/** The full set of filter axes the overview table's search/filter bar exposes. */
export type TransactionFilters = {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  text: string;
  amountMin: string;
  amountMax: string;
  amountDirection: 'expense' | 'income';
};

/** Parses the magnitude-only `amountMin`/`amountMax` strings, shared by `matchesTransactionFilters` and `filtersToRuleConditions`. */
function parseAmountMagnitudes(filters: TransactionFilters): [number | null, number | null] {
  const amountMin = filters.amountMin !== '' ? Math.abs(Number(filters.amountMin)) : null;
  const amountMax = filters.amountMax !== '' ? Math.abs(Number(filters.amountMax)) : null;
  return [amountMin, amountMax];
}

/**
 * Pure predicate for whether a transaction survives every active filter axis — extracted from the
 * overview's `filteredTransactions` computed (previously the app's only critical-complexity finding,
 * cyclomatic 34 / cognitive 45) so it's testable without standing up the component/store world.
 */
export function matchesTransactionFilters(
  transaction: Transaction,
  filters: TransactionFilters,
  ownSavingsIbans: ReadonlySet<string>,
): boolean {
  const accountId = filters.accountId ? Number(filters.accountId) : null;
  if (accountId !== null && transaction.accountId !== accountId) return false;

  if (filters.dateFrom && transaction.bookingDate < filters.dateFrom) return false;
  if (filters.dateTo && transaction.bookingDate > filters.dateTo) return false;

  if (
    filters.categoryId === 'uncategorised' &&
    (transaction.categoryId != null ||
      transaction.transferId != null ||
      isSavingsMovement(transaction, ownSavingsIbans))
  ) {
    return false;
  }
  if (
    filters.categoryId &&
    filters.categoryId !== 'uncategorised' &&
    transaction.categoryId !== Number(filters.categoryId)
  ) {
    return false;
  }

  if (filters.text) {
    const haystack =
      `${transaction.rawDescription} ${transaction.counterpartyName ?? ''}`.toLowerCase();
    if (!haystack.includes(filters.text)) return false;
  }

  const [amountMin, amountMax] = parseAmountMagnitudes(filters);

  if (amountMin !== null || amountMax !== null) {
    const isExpense = filters.amountDirection !== 'income';
    if (isExpense ? transaction.amount >= 0 : transaction.amount < 0) return false;

    const magnitude = Math.abs(transaction.amount);
    if (amountMin !== null && magnitude < amountMin) return false;
    if (amountMax !== null && magnitude > amountMax) return false;
  }

  return true;
}

/**
 * Re-signs a magnitude-only amount bound into the raw signed `amount` the rules engine matches
 * against (`RuleCondition`'s `amount` field always compares raw `transaction.amount`, see
 * `rule-matching.ts`). For 'expense' the larger the magnitude, the more negative the amount, so
 * min/max swap which bound they become; 'income' magnitudes map onto amount directly
 * (TICKET-TXN-08 Notes — this ticket landed first, so TICKET-CAT-07's conversion re-signs here).
 */
function toSignedAmountBounds(
  amountMin: number | null,
  amountMax: number | null,
  direction: TransactionFilters['amountDirection'],
): [number | null, number | null] {
  if (direction === 'income') return [amountMin, amountMax];
  return [amountMax !== null ? -amountMax : null, amountMin !== null ? -amountMin : null];
}

/**
 * Converts the current filter set into a starting `RuleCondition[]` for "make rule from filter"
 * (TICKET-CAT-07) — only `text`, `accountId`, and the amount bounds have a matching
 * `RuleCondition.field`; `dateFrom`/`dateTo`/`categoryId` have no equivalent and are simply
 * omitted (see `excludedFilterAxisLabels` for surfacing that omission to the user).
 */
export function filtersToRuleConditions(filters: TransactionFilters): RuleCondition[] {
  const conditions: RuleCondition[] = [];

  if (filters.text) {
    conditions.push({ field: 'description', operator: 'contains', value: filters.text });
  }

  if (filters.accountId) {
    conditions.push({ field: 'accountId', operator: 'equals', value: Number(filters.accountId) });
  }

  const [amountMin, amountMax] = parseAmountMagnitudes(filters);
  const [low, high] = toSignedAmountBounds(amountMin, amountMax, filters.amountDirection);

  if (low !== null && high !== null) {
    conditions.push({ field: 'amount', operator: 'between', value: [low, high] });
  } else if (low !== null) {
    conditions.push({ field: 'amount', operator: '>', value: low });
  } else if (high !== null) {
    conditions.push({ field: 'amount', operator: '<', value: high });
  }

  return conditions;
}

/** Human-readable labels for the active filter axes `filtersToRuleConditions` can't convert (TICKET-CAT-07). */
export function excludedFilterAxisLabels(filters: TransactionFilters): string[] {
  const labels: string[] = [];
  if (filters.dateFrom || filters.dateTo) labels.push('Date range');
  if (filters.categoryId) labels.push('Category');
  return labels;
}

/** The rule-form modal's inline note (TICKET-CAT-07) naming any excluded axes; `null` when nothing was excluded. */
export function describeExcludedFilterAxes(labels: string[]): string | null {
  if (labels.length === 0) return null;
  const plural = labels.length > 1;
  return `${labels.join(' and ')} filter${plural ? 's' : ''} ${plural ? "aren't" : "isn't"} included — rules can't match on ${plural ? 'those' : 'that'} yet.`;
}
