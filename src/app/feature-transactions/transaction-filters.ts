import type { RuleCondition, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';

/**
 * Which sign of transaction the amount axis keeps (TICKET-TXN-10). `'all'` is the default and the
 * "off" position the control lacked until then — with `'expense'` as the default, the direction had
 * to be checked *inside* the min/max branch (otherwise a fresh page load would hide all income),
 * which is exactly why picking "Income" with empty amount fields used to filter nothing.
 */
export type AmountDirection = 'all' | 'income' | 'expense';

/** The direction a filter set starts on, and the value that means "this axis isn't filtering". */
export const DEFAULT_AMOUNT_DIRECTION: AmountDirection = 'all';

/** The three-way control's buttons, in render order — `'all'` first, since it is where the filter starts. */
export const AMOUNT_DIRECTION_OPTIONS: readonly { value: AmountDirection; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
];

/** The full set of filter axes the overview table's search/filter bar exposes. */
export type TransactionFilters = {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  text: string;
  amountMin: string;
  amountMax: string;
  amountDirection: AmountDirection;
};

/** Parses the magnitude-only `amountMin`/`amountMax` strings, shared by `matchesTransactionFilters` and `filtersToRuleConditions`. */
function parseAmountMagnitudes(filters: TransactionFilters): [number | null, number | null] {
  const amountMin = filters.amountMin !== '' ? Math.abs(Number(filters.amountMin)) : null;
  const amountMax = filters.amountMax !== '' ? Math.abs(Number(filters.amountMax)) : null;
  return [amountMin, amountMax];
}

/**
 * The direction axis on its own (TICKET-TXN-10) — **independent of the min/max bounds**, which is
 * the bug fix: this used to run only inside `if (amountMin !== null || amountMax !== null)`, so
 * "Income" with empty amount fields left every expense in the table.
 */
const matchesAmountDirection = (amount: number, direction: AmountDirection): boolean => {
  if (direction === 'income') return amount >= 0;
  if (direction === 'expense') return amount < 0;
  return true;
};

/**
 * The magnitude bounds, which are sign-agnostic: under `'all'` a `min`/`max` filters both signs by
 * size, so €500 in and €500 out both survive a "at least 100" bound.
 */
const matchesAmountMagnitude = (amount: number, filters: TransactionFilters): boolean => {
  const [amountMin, amountMax] = parseAmountMagnitudes(filters);
  const magnitude = Math.abs(amount);
  return (
    (amountMin === null || magnitude >= amountMin) && (amountMax === null || magnitude <= amountMax)
  );
};

/**
 * Pure predicate for whether a transaction survives every active filter axis — extracted from the
 * overview's `filteredTransactions` computed (previously the app's only critical-complexity finding,
 * cyclomatic 34 / cognitive 45) so it's testable without standing up the component/store world.
 */
// Reason for the suppression below: a one-`if`-per-axis dispatcher, and TICKET-TXN-10 *lowered* it —
// measured cyclomatic 26 / cognitive 28 before this ticket, 20 / 18 after, by lifting the amount
// axis into `matchesAmountDirection`/`matchesAmountMagnitude`. It trips the CRAP gate only because
// fallow has no coverage data and estimates 0%; every axis here has its own spec in
// `transaction-filters.spec.ts`. Splitting the remaining six axes into six more one-line predicates
// to reach CRAP < 30 would scatter the one place the filter contract is readable end to end.
// fallow-ignore-next-line complexity
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

  if (!matchesAmountDirection(transaction.amount, filters.amountDirection)) return false;
  if (!matchesAmountMagnitude(transaction.amount, filters)) return false;

  return true;
}

/**
 * Re-signs a magnitude-only amount bound into the raw signed `amount` the rules engine matches
 * against (`RuleCondition`'s `amount` field always compares raw `transaction.amount`, see
 * `rule-matching.ts`). For 'expense' the larger the magnitude, the more negative the amount, so
 * min/max swap which bound they become; 'income' magnitudes map onto amount directly
 * (TICKET-TXN-08 Notes — this ticket landed first, so TICKET-CAT-07's conversion re-signs here).
 *
 * **`'all'` yields no bounds at all** (TICKET-TXN-10). A magnitude bound with no direction means
 * `|amount| >= min`, i.e. `amount <= -min` **or** `amount >= min` — and `RuleCondition` has no `or`,
 * so no single condition can say it. Emitting either signed branch would silently convert the
 * filter into something narrower than what the user was looking at, so the amount axis is dropped
 * instead and named by `excludedFilterAxisLabels` below.
 */
const negated = (bound: number | null): number | null => (bound === null ? null : -bound);

function toSignedAmountBounds(
  amountMin: number | null,
  amountMax: number | null,
  direction: AmountDirection,
): [number | null, number | null] {
  if (direction === 'all') return [null, null];
  if (direction === 'income') return [amountMin, amountMax];
  return [negated(amountMax), negated(amountMin)];
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

/**
 * True for a magnitude bound with no direction (TICKET-TXN-10) — an either-sign match, which a rule
 * condition can't express, so `filtersToRuleConditions` drops it and the user is told rather than
 * left to notice.
 */
const hasUnconvertibleAmountBound = (filters: TransactionFilters): boolean =>
  filters.amountDirection === 'all' && (filters.amountMin !== '' || filters.amountMax !== '');

const hasDateRange = (filters: TransactionFilters): boolean =>
  filters.dateFrom !== '' || filters.dateTo !== '';

/** Human-readable labels for the active filter axes `filtersToRuleConditions` can't convert (TICKET-CAT-07). */
export function excludedFilterAxisLabels(filters: TransactionFilters): string[] {
  const labels: string[] = [];
  if (hasDateRange(filters)) labels.push('Date range');
  if (filters.categoryId) labels.push('Category');
  if (hasUnconvertibleAmountBound(filters)) labels.push('Amount');
  return labels;
}

/** The rule-form modal's inline note (TICKET-CAT-07) naming any excluded axes; `null` when nothing was excluded. */
export function describeExcludedFilterAxes(labels: string[]): string | null {
  if (labels.length === 0) return null;
  const plural = labels.length > 1;
  return `${labels.join(' and ')} filter${plural ? 's' : ''} ${plural ? "aren't" : "isn't"} included — rules can't match on ${plural ? 'those' : 'that'} yet.`;
}
