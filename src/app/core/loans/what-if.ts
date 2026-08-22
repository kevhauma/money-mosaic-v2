import type { Loan } from '@/core/data-access';
import { addMonths, monthlyRateOf, scheduledMonthlyPayment } from './amortization';
import type { LoanProgress } from './loan-progress';

/** A one-off extra payment in a hypothetical scenario (TICKET-LOAN-12, consumed by LOAN-14's UI). */
export type WhatIfLumpSum = {
  /** ISO `yyyy-mm-dd`; applied in the projected month containing it. */
  date: string;
  amount: number;
};

/** The hypothetical the user is posing — never persisted, never a loan field (TICKET-LOAN-13's Notes). */
export type WhatIfScenario = {
  /** Extra principal per month on top of the scheduled payment, from the first projected month. `0` = none. */
  extraMonthlyPayment: number;
  /** One-off payments (LOAN-14). Empty by default. */
  lumpSums: WhatIfLumpSum[];
};

/**
 * How a lender prices repaying early (TICKET-LOAN-14, FR-LOAN-14). A **user-chosen input**, never
 * inferred from `loanType` and never claimed to be the user's actual contract:
 *
 * - `monthsOfInterest` — N months of interest on the repaid amount at the loan's own rate. The
 *   common European mortgage rule (in Belgium the *wederbeleggingsvergoeding*, capped at three).
 * - `percentOfAmount` — a flat percentage, which is how consumer and auto loans are usually capped
 *   (frequently 0.5-1%).
 * - `none` — no penalty at all.
 */
export type EarlyRepaymentFeeModel =
  | { kind: 'monthsOfInterest'; months: number }
  | { kind: 'percentOfAmount'; percent: number }
  | { kind: 'none' };

/**
 * The penalty a lender would charge on one early repayment, estimated (TICKET-LOAN-14).
 *
 * Deliberately **not** folded into the amortization walk: a fee is a cost paid *on top of* a lump
 * sum, not a payment that reduces the balance, so `runProjection` stays a pure "where does the
 * balance go" calculation and this stays separately testable. Reuses `monthlyRateOf` rather than
 * deriving the rate a second time.
 */
export function estimateEarlyRepaymentFee(
  loan: Loan,
  repaidAmount: number,
  model: EarlyRepaymentFeeModel,
): number {
  switch (model.kind) {
    case 'monthsOfInterest':
      return model.months * monthlyRateOf(loan.interestRate) * repaidAmount;
    case 'percentOfAmount':
      return (model.percent / 100) * repaidAmount;
    case 'none':
      return 0;
  }
}

/** Where one set of payment assumptions lands the loan. */
export type WhatIfOutcome = {
  payoffDate: string;
  monthsRemaining: number;
  totalInterest: number;
  balanceSeries: { date: string; balance: number }[];
};

/** A scenario measured against doing nothing (TICKET-LOAN-12, FR-LOAN-12). */
export type WhatIfProjection = {
  /** Keep paying exactly the scheduled amount from today — the do-nothing comparison. */
  baseline: WhatIfOutcome;
  scenario: WhatIfOutcome;
  monthsSaved: number;
  /** Gross: what the scenario saves before the lender's penalty is taken off. */
  interestSaved: number;
  /** The estimated early-repayment fee on every lump sum that was actually applied (TICKET-LOAN-14). */
  feesTotal: number;
  /** `interestSaved - feesTotal`. **Can be negative** — a fee bigger than the saving is exactly the case this figure exists to surface, so it is never clamped. */
  netInterestSaved: number;
};

/**
 * A hard stop on the forward walk. A loan whose payment covers its interest always terminates well
 * inside this, so hitting it means the inputs were degenerate (a payment smaller than the interest
 * it accrues) — the walk gives up rather than looping forever, per this ticket's "no infinite loop".
 */
const MAX_PROJECTION_MONTHS = 1200;

/** The `yyyy-mm` a date falls in — how a lump sum is matched to a projected month. */
const monthKeyOf = (isoDate: string): string => isoDate.slice(0, 7);

/**
 * A walk's outcome plus the lump sums it actually applied, each clamped to the balance that was
 * left to repay. Internal: only the fee estimate needs the second half, and `WhatIfOutcome` is what
 * LOAN-13's chart renders.
 */
type ProjectionRun = WhatIfOutcome & { appliedLumpSums: number[] };

/**
 * One forward amortization walk from a real, current balance (TICKET-LOAN-12).
 *
 * Deliberately flat-monthly rather than borrowing LOAN-05's day-based accrual: there are no real
 * payment dates in the future to accrue between, so a day-precise model here would invent precision
 * that does not exist. Every month charges `balance * monthlyRate` and pays whatever the scenario
 * says, with the final month clamped to exactly what is left — the balance can never go negative and
 * interest never accrues past payoff.
 */
function runProjection(
  startBalance: number,
  fromDate: string,
  monthlyRate: number,
  payment: number,
  scenario: WhatIfScenario,
): ProjectionRun {
  const balanceSeries = [{ date: fromDate, balance: Math.max(0, startBalance) }];
  if (startBalance <= 0) {
    return {
      payoffDate: fromDate,
      monthsRemaining: 0,
      totalInterest: 0,
      balanceSeries,
      appliedLumpSums: [],
    };
  }

  let balance = startBalance;
  let totalInterest = 0;
  let month = 0;
  const appliedLumpSums: number[] = [];

  while (balance > 0 && month < MAX_PROJECTION_MONTHS) {
    month++;
    const date = addMonths(fromDate, month);
    const interest = balance * monthlyRate;
    let lumpSum = 0;
    // A lump sum lands in the projected month whose `yyyy-mm` it shares. One dated before the first
    // projected month (or after the loan is already paid off) matches no month at all, so it is
    // simply never applied — no crash, no phantom saving, and LOAN-14 charges it no fee.
    for (const entry of scenario.lumpSums) {
      if (monthKeyOf(entry.date) === monthKeyOf(date)) {
        // Clamped to what is actually outstanding: a lump sum bigger than the balance only ever
        // repays the balance, and LOAN-14 must not charge a fee on money that was never repaid.
        appliedLumpSums.push(Math.min(entry.amount, balance));
        lumpSum += entry.amount;
      }
    }

    const available = payment + scenario.extraMonthlyPayment + lumpSum - interest;
    // Clamped: the month can never repay more principal than is actually outstanding, so an extra
    // payment (or a lump sum) bigger than the balance simply ends the loan that month.
    const principalPaid = Math.min(Math.max(0, available), balance);

    totalInterest += interest;
    balance -= principalPaid;
    if (balance < 1e-9) {
      balance = 0;
    }
    balanceSeries.push({ date, balance });
  }

  return {
    payoffDate: balanceSeries.at(-1)?.date ?? fromDate,
    monthsRemaining: month,
    totalInterest,
    balanceSeries,
    appliedLumpSums,
  };
}

/**
 * Projects a loan's remaining payoff forward from **where it actually is today**, under a
 * hypothetical scenario, against a do-nothing baseline (TICKET-LOAN-12, FR-LOAN-12).
 *
 * Starts at `progress.actualBalance` (LOAN-05's reconciled figure), not at origination, and amortizes
 * at the loan's own `scheduledMonthlyPayment` — so the baseline answers "if I just keep paying my
 * bill" and the scenario answers "if I pay more". `fromDate` is the caller's "today": this stays pure
 * and never reads the clock. `loan.loanType` is not a parameter and never branches any of this math,
 * consistent with every other `core/loans` function.
 *
 * An empty scenario returns a `scenario` outcome identical to `baseline` by construction — same walk,
 * same inputs — so `monthsSaved` and `interestSaved` are `0` without a special case.
 *
 * `feeModel` prices the lender's early-repayment penalty on each applied lump sum (TICKET-LOAN-14).
 * It defaults to `none`, so a caller that has no fee question to ask gets the gross figures and a
 * `netInterestSaved` equal to `interestSaved`, rather than a silently invented penalty.
 */
export function projectLoanWhatIf(
  loan: Loan,
  progress: LoanProgress,
  scenario: WhatIfScenario,
  fromDate: string,
  feeModel: EarlyRepaymentFeeModel = { kind: 'none' },
): WhatIfProjection {
  const monthlyRate = monthlyRateOf(loan.interestRate);
  const payment = scheduledMonthlyPayment(loan.principal, loan.interestRate, loan.termMonths);
  const emptyScenario: WhatIfScenario = { extraMonthlyPayment: 0, lumpSums: [] };

  const baseline = runProjection(
    progress.actualBalance,
    fromDate,
    monthlyRate,
    payment,
    emptyScenario,
  );
  const projected = runProjection(progress.actualBalance, fromDate, monthlyRate, payment, scenario);

  // One fee per lump sum that was actually applied, summed — a lump sum the walk ignored (dated
  // outside the projection) never appears here, because it was never repaid (TICKET-LOAN-14).
  const feesTotal = projected.appliedLumpSums.reduce(
    (total, amount) => total + estimateEarlyRepaymentFee(loan, amount, feeModel),
    0,
  );
  const interestSaved = baseline.totalInterest - projected.totalInterest;

  return {
    baseline,
    scenario: projected,
    monthsSaved: baseline.monthsRemaining - projected.monthsRemaining,
    interestSaved,
    feesTotal,
    netInterestSaved: interestSaved - feesTotal,
  };
}
