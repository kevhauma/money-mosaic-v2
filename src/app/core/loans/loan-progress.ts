import type { Loan, Transaction } from '@/core/data-access';
import { parseIsoDate } from '@/shared/utils';
import {
  addMonths,
  computeAmortizationSchedule,
  monthlyRateOf,
  type AmortizationEntry,
} from './amortization';

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

/** The most-derived FR-LOAN figure (TICKET-LOAN-10) — actual pace against the original schedule. */
export type ScheduleComparison = {
  /** Positive = ahead of schedule, negative = behind, 0 = on schedule. */
  monthsAheadOfSchedule: number;
  /** A rough estimate (see this ticket's Notes) — never a cent-exact refinance calculation. */
  interestSavedEstimate: number;
  projectedPayoffDate: string;
};

/** Whole calendar months between two ISO dates — the same month-stepping `entryDate` (`amortization.ts`) advances by, run in reverse. */
const monthsBetween = (fromDate: string, toDate: string): number => {
  const from = parseIsoDate(fromDate);
  const to = parseIsoDate(toDate);
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) {
    months -= 1;
  }
  return Math.max(0, months);
};

/**
 * Compares the actual balance/pace (`computeLoanProgress`) against the original schedule
 * (`computeAmortizationSchedule`) at the same point in real time (TICKET-LOAN-10, FR-LOAN-10) — the
 * indicator every other FR-LOAN figure builds toward. `loan.loanType` plays no part in any of this
 * math; a mortgage, a car loan, and a personal loan are compared identically.
 *
 * No payments yet (`progress.lastPaymentDate === null`) reads as exactly on schedule with nothing
 * saved — there is no real pace to compare against, not "behind" or "ahead" by construction.
 */
export function computeScheduleComparison(
  loan: Loan,
  schedule: AmortizationEntry[],
  progress: LoanProgress,
): ScheduleComparison {
  const finalEntry = schedule.at(-1);
  if (!finalEntry) {
    return {
      monthsAheadOfSchedule: 0,
      interestSavedEstimate: 0,
      projectedPayoffDate: loan.startDate,
    };
  }
  if (progress.lastPaymentDate === null) {
    return {
      monthsAheadOfSchedule: 0,
      interestSavedEstimate: 0,
      projectedPayoffDate: finalEntry.date,
    };
  }

  const monthsElapsed = monthsBetween(loan.startDate, progress.lastPaymentDate);
  // The schedule's balance only ever decreases, so the first (earliest) month whose balance has
  // already dropped to or below what I actually owe is where the *schedule* would put me today —
  // earlier than `monthsElapsed` means I'm ahead of it, later means I'm behind.
  const matchingEntry =
    schedule.find((entry) => entry.remainingBalance <= progress.actualBalance) ?? finalEntry;
  const monthsAheadOfSchedule = matchingEntry.month - monthsElapsed;

  const scheduleTotalInterest = schedule.reduce((sum, entry) => sum + entry.interestPortion, 0);
  // "If I kept going from here": whatever's left of the original term, re-amortized on my actual
  // (lower or higher) balance at the same rate — a projection, not the schedule's own numbers.
  const remainingTermMonths = Math.max(1, loan.termMonths - monthsElapsed);
  const reamortizedInterest = computeAmortizationSchedule(
    progress.actualBalance,
    loan.interestRate,
    remainingTermMonths,
    progress.lastPaymentDate,
  ).reduce((sum, entry) => sum + entry.interestPortion, 0);
  const projectedTotalInterest = progress.totalInterestPaid + reamortizedInterest;

  return {
    monthsAheadOfSchedule,
    interestSavedEstimate: scheduleTotalInterest - projectedTotalInterest,
    projectedPayoffDate: addMonths(finalEntry.date, -monthsAheadOfSchedule),
  };
}
