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
 * `startDate` advanced by `month` calendar months, same day-of-month where the target month has
 * one — a day past a shorter month's end rolls forward (native `Date` day-overflow behaviour),
 * same as `net-worth-projection.ts`'s `pointDate` uses `Date.UTC` for its own month stepping.
 */
const entryDate = (startDate: string, month: number): string => {
  const start = parseIsoDate(startDate);
  return formatIsoDate(
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + month, start.getUTCDate())),
  );
};

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
  const payment =
    monthlyRate > 0
      ? (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths)
      : principal / termMonths;

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
      date: entryDate(startDate, month),
      payment: isFinalMonth ? interestPortion + principalPortion : payment,
      principalPortion,
      interestPortion,
      remainingBalance: newBalance,
    });

    remainingBalance = newBalance;
  }

  return entries;
}
