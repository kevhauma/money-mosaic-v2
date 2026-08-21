import type { Loan } from '@/core/data-access';
import { computeAmortizationSchedule, type LoanProgress } from '@/core/loans';
import { formatCurrency, formatDate } from '@/shared/utils';
import { LOAN_TYPE_OPTIONS } from './loan-types';

/** One loan's overview-card row (TICKET-LOAN-06) — every display fact already resolved, so the card is purely presentational. */
export type LoanCardVm = {
  loan: Loan;
  typeLabel: string;
  /** `0`-`100`, for the daisyUI `progress` bar's `value`. */
  percentPaidOff: number;
  balanceLabel: string;
  /** LOAN-04's scheduled final payoff date, `formatDate()`d — LOAN-10 later adds the ahead/behind delta on top. */
  projectedPayoffDateLabel: string;
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
  const projectedPayoffDate = schedule.at(-1)?.date;

  return {
    loan,
    typeLabel: typeLabelFor(loan.loanType),
    percentPaidOff: Math.round(progress.percentPaidOff * 100),
    balanceLabel: formatCurrency(progress.actualBalance),
    projectedPayoffDateLabel: projectedPayoffDate ? formatDate(projectedPayoffDate) : '—',
  };
};
