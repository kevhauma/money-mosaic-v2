import type { Loan } from '@/core/data-access';
import {
  computeAmortizationSchedule,
  computeScheduleComparison,
  type LoanProgress,
} from '@/core/loans';
import type { BadgeColor } from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/utils';
import { loanScheduleStatusFor } from './loan-schedule-status';
import { LOAN_TYPE_OPTIONS } from './loan-types';

/** One loan's overview-card row (TICKET-LOAN-06/10) — every display fact already resolved, so the card is purely presentational. */
export type LoanCardVm = {
  loan: Loan;
  typeLabel: string;
  /** `0`-`100`, for the daisyUI `progress` bar's `value`. */
  percentPaidOff: number;
  balanceLabel: string;
  /** The schedule's final date shifted by the ahead/behind delta (TICKET-LOAN-10), `formatDate()`d. */
  projectedPayoffDateLabel: string;
  /** "8 months ahead of schedule" / "3 months behind schedule" / "On schedule". */
  scheduleStatusLabel: string;
  scheduleStatusColor: BadgeColor;
  /** "~€1,240 interest saved so far", or the inverse phrasing when behind. */
  interestLabel: string;
};

const typeLabelFor = (loanType: Loan['loanType']): string =>
  LOAN_TYPE_OPTIONS.find((option) => option.value === loanType)?.label ?? loanType;

export const loanCardVmFor = (loan: Loan, progress: LoanProgress): LoanCardVm => {
  const schedule = computeAmortizationSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    loan.startDate,
  );
  const comparison = computeScheduleComparison(loan, schedule, progress);
  const status = loanScheduleStatusFor(comparison);

  return {
    loan,
    typeLabel: typeLabelFor(loan.loanType),
    percentPaidOff: Math.round(progress.percentPaidOff * 100),
    balanceLabel: formatCurrency(progress.actualBalance),
    projectedPayoffDateLabel: formatDate(comparison.projectedPayoffDate),
    scheduleStatusLabel: status.label,
    scheduleStatusColor: status.color,
    interestLabel: status.interestLabel,
  };
};
