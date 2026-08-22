import { formatIsoDate, parseIsoDate } from '@/shared/utils';

/** One scheduled month of a loan's theoretical, textbook amortization (TICKET-LOAN-04). */
export type AmortizationEntry = {
  /** 1-indexed. */
  month: number;
  /** ISO `yyyy-mm-dd`, `startDate` advanced by `month` calendar months. */
  date: string;
  payment: number;
  principalPortion: number;
  interestPortion: number;
  /** Clamped to exactly `0` on the final month, absorbing any floating-point drift. */
  remainingBalance: number;
};

/**
 * The monthly rate a loan's stated annual percentage compounds at — shared with `loan-progress.ts`
 * (TICKET-LOAN-05) so the two stay in lockstep; both derive it from `Loan.interestRate` the same way.
 */
export const monthlyRateOf = (annualInterestRatePercent: number): number =>
  annualInterestRatePercent / 100 / 12;

/**
 * `date` advanced (or, with a negative `months`, moved back) by whole calendar months, same
 * day-of-month where the target month has one — a day past a shorter month's end rolls forward
 * (native `Date` day-overflow behaviour), same as `net-worth-projection.ts`'s `pointDate` uses
 * `Date.UTC` for its own month stepping. Every forward walk in `core/loans` steps months through
 * this one helper (TICKET-LOAN-12), so a schedule, a payoff projection, and a what-if series can
 * never disagree about which day a month lands on.
 */
export const addMonths = (date: string, months: number): string => {
  const parsed = parseIsoDate(date);
  return formatIsoDate(
    new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + months, parsed.getUTCDate())),
  );
};

/**
 * The fixed monthly payment a loan's stated terms imply — the standard annuity formula, with the
 * zero-rate case falling back to plain linear repayment so a 0% loan never divides by zero.
 *
 * Exported (TICKET-LOAN-12) because the what-if engine projects forward at the *same* payment this
 * schedule is built from: one formula, two callers, no drift — the same reason `monthlyRateOf` is
 * shared rather than re-derived.
 */
export function scheduledMonthlyPayment(
  principal: number,
  annualInterestRatePercent: number,
  termMonths: number,
): number {
  const monthlyRate = monthlyRateOf(annualInterestRatePercent);
  return monthlyRate > 0
    ? (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths)
    : principal / termMonths;
}

/**
 * The theoretical monthly payment schedule for a loan's stated terms (TICKET-LOAN-04, FR-LOAN-4) —
 * principal, interest, and remaining balance per month, using the standard fixed-rate loan formula.
 * No transaction data, and deliberately **no `loanType` parameter**: a mortgage, a car loan, and a
 * personal loan are amortized identically, so `loanType` never branches this math.
 */
export function computeAmortizationSchedule(
  principal: number,
  annualInterestRatePercent: number,
  termMonths: number,
  startDate: string,
): AmortizationEntry[] {
  const monthlyRate = monthlyRateOf(annualInterestRatePercent);
  const payment = scheduledMonthlyPayment(principal, annualInterestRatePercent, termMonths);

  const entries: AmortizationEntry[] = [];
  let remainingBalance = principal;

  for (let month = 1; month <= termMonths; month++) {
    const interestPortion = remainingBalance * monthlyRate;
    const isFinalMonth = month === termMonths;
    // The final month absorbs whatever principal is actually left, rather than trusting the fixed
    // `payment` formula's rounding to land exactly on 0 — the schedule must always end at 0, not
    // "very close to 0".
    const principalPortion = isFinalMonth ? remainingBalance : payment - interestPortion;
    const newBalance = isFinalMonth ? 0 : remainingBalance - principalPortion;

    entries.push({
      month,
      date: addMonths(startDate, month),
      payment: isFinalMonth ? interestPortion + principalPortion : payment,
      principalPortion,
      interestPortion,
      remainingBalance: newBalance,
    });

    remainingBalance = newBalance;
  }

  return entries;
}
