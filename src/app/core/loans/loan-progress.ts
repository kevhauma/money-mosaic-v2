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

/** One point of `computeActualBalanceSeries` (TICKET-LOAN-07) — the balance right after a real payment. */
export type ActualBalancePoint = { date: string; balance: number };

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Average days per month — the same approximation `daysElapsed` is measured against. */
const AVG_DAYS_PER_MONTH = 30.44;

type AccrualStep = {
  date: string;
  balance: number;
  principalPortion: number;
  interestPortion: number;
};

/**
 * The shared walk both `computeLoanProgress` and `computeActualBalanceSeries` (TICKET-LOAN-07) build
 * on — chronologically ordered payments, accruing interest against the running balance for the
 * *actual* elapsed period between payments (rather than assuming every period is exactly one
 * calendar month, as `computeAmortizationSchedule` does), so an early, late, skipped, or oversized
 * payment all show up as a real difference from the textbook schedule. One step per payment; an
 * empty `payments` list walks zero steps, leaving the caller to decide what "no payments yet" means.
 *
 * `payments` must already be filtered to `loan.categoryId` — this stays pure and only orders/accrues,
 * it never queries a store (TICKET-LOAN-05's Notes). `loan.loanType` plays no part in this math; a
 * mortgage, a car loan, and a personal loan are reconciled identically.
 */
function accrueLoanPayments(loan: Loan, payments: Transaction[]): AccrualStep[] {
  const monthlyRate = monthlyRateOf(loan.interestRate);
  const sorted = [...payments].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));

  const steps: AccrualStep[] = [];
  let balance = loan.principal;
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
    steps.push({
      date: payment.bookingDate,
      balance,
      principalPortion: appliedPrincipalPortion,
      interestPortion: interest,
    });
    previousDate = payment.bookingDate;
  }

  return steps;
}

export function computeLoanProgress(loan: Loan, payments: Transaction[]): LoanProgress {
  const steps = accrueLoanPayments(loan, payments);
  const totalPrincipalPaid = steps.reduce((sum, step) => sum + step.principalPortion, 0);
  const totalInterestPaid = steps.reduce((sum, step) => sum + step.interestPortion, 0);

  return {
    actualBalance: steps.at(-1)?.balance ?? loan.principal,
    totalPrincipalPaid,
    totalInterestPaid,
    percentPaidOff:
      loan.principal > 0 ? Math.min(1, Math.max(0, totalPrincipalPaid / loan.principal)) : 0,
    lastPaymentDate: steps.at(-1)?.date ?? null,
  };
}

/**
 * The actual balance reconstructed month-by-month — one point per real payment, chronologically
 * ordered, ending at the loan's current actual balance (TICKET-LOAN-07). Shares `accrueLoanPayments`
 * with `computeLoanProgress`, so the two can never drift out of sync on the interest-accrual math.
 *
 * A loan with no payments yet returns a single point at `loan.startDate`/`loan.principal` — the
 * chart's starting reference, not an empty series, so a brand-new loan has something to draw.
 */
export function computeActualBalanceSeries(
  loan: Loan,
  payments: Transaction[],
): ActualBalancePoint[] {
  const steps = accrueLoanPayments(loan, payments);
  if (steps.length === 0) {
    return [{ date: loan.startDate, balance: loan.principal }];
  }
  return steps.map((step) => ({ date: step.date, balance: step.balance }));
}
