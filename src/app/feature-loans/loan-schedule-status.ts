import type { ScheduleComparison } from '@/core/loans';
import type { BadgeColor } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

/**
 * The ahead/behind-schedule badge + interest-saved caption (TICKET-LOAN-10) — one shared builder so
 * `LoansOverviewComponent`'s cards and the loan detail header can never phrase the same figure two
 * different ways. Identical output for every `loanType`, since `computeScheduleComparison` never
 * branches on it either.
 */
export type LoanScheduleStatus = {
  label: string;
  color: BadgeColor;
  /** "~€1,240 interest saved so far", or the inverse phrasing when behind schedule. */
  interestLabel: string;
};

export const loanScheduleStatusFor = (comparison: ScheduleComparison): LoanScheduleStatus => {
  const months = comparison.monthsAheadOfSchedule;
  const plural = (count: number): string => `${count} month${count === 1 ? '' : 's'}`;

  const label =
    months > 0
      ? `${plural(months)} ahead of schedule`
      : months < 0
        ? `${plural(Math.abs(months))} behind schedule`
        : 'On schedule';
  const color: BadgeColor = months > 0 ? 'success' : months < 0 ? 'warning' : 'neutral';

  // Explicitly labelled "~" (an estimate, not a cent-exact refinance calculation, per this
  // ticket's Notes) — the inverse phrasing when behind schedule reads as extra cost, not savings.
  const interestLabel =
    comparison.interestSavedEstimate >= 0
      ? `~${formatCurrency(comparison.interestSavedEstimate)} interest saved so far`
      : `~${formatCurrency(Math.abs(comparison.interestSavedEstimate))} extra interest so far`;

  return { label, color, interestLabel };
};
