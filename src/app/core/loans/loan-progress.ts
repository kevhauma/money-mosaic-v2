import type { Loan, Transaction } from '@/core/data-access';
import { parseIsoDate } from '@/shared/utils';
import { monthlyRateOf } from './amortization';

/** A loan's real payoff position, reconciled against its actual linked-category payments (TICKET-LOAN-05). */
export type LoanProgress = {
  actualBalance: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  /** `totalPrincipalPaid / loan.principal`, clamped `[0, 1]` — equivalently `1 - actualBalance / loan.principal`, since `totalPrincipalPaid` never overshoots what actually reduced the balance. */
  percentPaidOff: number;
  lastPaymentDate: string | null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Average days per month — the same approximation `daysElapsed` is measured against. */
const AVG_DAYS_PER_MONTH = 30.44;

/**
 * Walks a loan's linked-category transactions chronologically, accruing interest against the
 * running balance for the actual elapsed period between payments (rather than assuming every
 * period is exactly one calendar month, as `computeAmortizationSchedule` does) — so an early,
 * late, skipped, or oversized payment all show up as a real difference from the textbook schedule.
 *
 * `payments` must already be filtered to `loan.categoryId` — this function stays pure and only
 * orders/accrues, it never queries a store (TICKET-LOAN-05's Notes). `loan.loanType` plays no part
 * in this math; a mortgage, a car loan, and a personal loan are reconciled identically.
 */
export function computeLoanProgress(loan: Loan, payments: Transaction[]): LoanProgress {
  const monthlyRate = monthlyRateOf(loan.interestRate);
  const sorted = [...payments].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));

  let balance = loan.principal;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let lastPaymentDate: string | null = null;
  let previousDate = loan.startDate;

  for (const payment of sorted) {
    const daysElapsed =
      (parseIsoDate(payment.bookingDate).getTime() - parseIsoDate(previousDate).getTime()) /
      MS_PER_DAY;
    const interest = balance * monthlyRate * (daysElapsed / AVG_DAYS_PER_MONTH);
    // A payment smaller than the interest that accrued adds no principal reduction — the shortfall
    // is simply not modeled as negative amortization, per this ticket's algorithm.
    const rawPrincipalPortion = Math.max(0, Math.abs(payment.amount) - interest);
    // Clamped to what's actually left, so an overpayment (or payments summing past the principal)
    // can never drive the balance negative, and `totalPrincipalPaid` stays exactly
    // `loan.principal - actualBalance` — the invariant both `percentPaidOff` readings rely on.
    const appliedPrincipalPortion = Math.min(rawPrincipalPortion, balance);

    balance -= appliedPrincipalPortion;
    totalPrincipalPaid += appliedPrincipalPortion;
    totalInterestPaid += interest;
    lastPaymentDate = payment.bookingDate;
    previousDate = payment.bookingDate;
  }

  return {
    actualBalance: balance,
    totalPrincipalPaid,
    totalInterestPaid,
    percentPaidOff:
      loan.principal > 0 ? Math.min(1, Math.max(0, totalPrincipalPaid / loan.principal)) : 0,
    lastPaymentDate,
  };
}
