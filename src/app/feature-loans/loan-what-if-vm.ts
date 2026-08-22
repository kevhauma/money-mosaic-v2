import type { WhatIfProjection } from '@/core/loans';
import { formatCurrency, formatMonthYear } from '@/shared/utils';

/**
 * Which of the three answers the What-if tab is giving (TICKET-LOAN-13). Kept as a discriminator
 * rather than a pre-built sentence so the template can wrap only the *monetary* parts in
 * `mm-privacy-blur` — a single interpolated string would blur the whole line or none of it.
 */
export type LoanWhatIfHeadlineKind = 'paid-off' | 'unchanged' | 'improved';

/** Every figure the What-if headline says, already formatted (the `loanScheduleStatusFor` shape). */
export type LoanWhatIfHeadline = {
  kind: LoanWhatIfHeadlineKind;
  /** The scenario's payoff month in words, e.g. `March 2039`. */
  payoffLabel: string;
  /** How much sooner, e.g. `2 years 4 months earlier` — `null` when nothing changes. */
  deltaLabel: string | null;
  /** Gross interest saved, e.g. `~€8,120` — `null` when nothing changes. Monetary: blur it. */
  interestSavedLabel: string | null;
  /** The estimated early-repayment fee, e.g. `~€1,020` — `null` when no lump sum is charged one (TICKET-LOAN-14). Monetary: blur it. */
  feeLabel: string | null;
  /** Gross minus the fee, e.g. `~€13,280` or `-~€900` — `null` when there is no fee, since net would just restate gross. Monetary: blur it. */
  netSavedLabel: string | null;
  /** The fee costs more than the scenario saves. Shown as a warning, never suppressed or clamped (TICKET-LOAN-14). */
  netIsNegative: boolean;
};

/**
 * A whole number of months as a person would say it — `7 months`, `1 year`, `2 years 4 months`.
 * Exact months rather than a rounded-to-years figure: on a loan, "1 year 11 months" and "2 years"
 * are a real difference in when the payments stop.
 */
export function describeMonthSpan(months: number): string {
  const plural = (count: number, unit: string): string =>
    `${count} ${unit}${count === 1 ? '' : 's'}`;

  if (months < 12) {
    return plural(months, 'month');
  }
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder === 0
    ? plural(years, 'year')
    : `${plural(years, 'year')} ${plural(remainder, 'month')}`;
}

/**
 * The What-if tab's plain-language answer (TICKET-LOAN-13, FR-LOAN-13), derived from LOAN-12's
 * projection alone — no re-implemented math, and no `loanType` anywhere, so a mortgage and a car
 * loan with the same numbers read identically.
 *
 * A baseline with nothing left to pay is the `paid-off` case: there is no hypothetical to pose, so
 * the tab says so rather than reporting a confident "0 months earlier". An empty scenario is
 * `unchanged` — deliberately a neutral statement of the current schedule, not an empty state, since
 * the user has just been shown a control and told nothing happened.
 *
 * Every saving carries a `~`: the projection is flat-monthly (LOAN-12's Notes), so the first month
 * can differ from a lender's own quote by a few euro.
 *
 * With a lump sum charged an early-repayment fee (TICKET-LOAN-14), the gross saving, the fee, and
 * the net are three separate labels — never one pre-netted number. A gross figure alone is exactly
 * the misleading reading this feature exists to prevent, and a net that comes out negative is
 * reported as negative rather than hidden or clamped.
 */
export function buildLoanWhatIfHeadline(projection: WhatIfProjection): LoanWhatIfHeadline {
  const payoffLabel = formatMonthYear(projection.scenario.payoffDate);

  const nothing = {
    deltaLabel: null,
    interestSavedLabel: null,
    feeLabel: null,
    netSavedLabel: null,
    netIsNegative: false,
  };

  if (projection.baseline.monthsRemaining === 0) {
    return { kind: 'paid-off', payoffLabel, ...nothing };
  }
  // A scenario with a fee but no interest saving still has something to say — repaying early cost
  // money and bought nothing — so `feesTotal` counts as a change, not "no change".
  if (projection.monthsSaved <= 0 && projection.interestSaved <= 0 && projection.feesTotal <= 0) {
    return { kind: 'unchanged', payoffLabel, ...nothing };
  }

  const charged = projection.feesTotal > 0;
  return {
    kind: 'improved',
    payoffLabel,
    deltaLabel:
      projection.monthsSaved > 0 ? `${describeMonthSpan(projection.monthsSaved)} earlier` : null,
    interestSavedLabel: `~${formatCurrency(projection.interestSaved, { whole: true })}`,
    // Only shown when a lump sum was actually charged: with no fee, a net line would restate gross.
    feeLabel: charged ? `~${formatCurrency(projection.feesTotal, { whole: true })}` : null,
    netSavedLabel: charged
      ? `~${formatCurrency(projection.netInterestSaved, { whole: true })}`
      : null,
    netIsNegative: projection.netInterestSaved < 0,
  };
}
