import type { Category } from '@/core/data-access';

export type CategoryKindContribution = {
  bucket: 'income' | 'expense';
  /** Signed contribution towards the bucket's total — positive adds, negative nets it down. */
  amount: number;
} | null;

/**
 * The single kind-driven, signed-netting rule shared by `computeCategoryBreakdown` and
 * `computePeriodStats` (TICKET-STAT-11): a transaction with a resolvable, non-`neutral` category
 * always contributes to the bucket matching its category's `kind` — an expense category nets a
 * spend (negative amount) upward and a refund/payback (positive amount) downward; an income
 * category nets symmetrically. Only an uncategorised (or `neutral`-kind) transaction has no
 * category-driven bucket: `neutral` is excluded entirely (returns null), and no-category falls
 * back to raw amount sign, same as today.
 */
export const categoryKindContribution = (
  amount: number,
  categoryKind: Category['kind'] | undefined,
): CategoryKindContribution => {
  if (categoryKind === 'neutral') return null;
  if (categoryKind === 'expense') return { bucket: 'expense', amount: -amount };
  if (categoryKind === 'income') return { bucket: 'income', amount };

  if (amount > 0) return { bucket: 'income', amount };
  if (amount < 0) return { bucket: 'expense', amount: -amount };
  return null;
};
