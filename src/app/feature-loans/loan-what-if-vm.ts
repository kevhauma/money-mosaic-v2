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
 */
export function buildLoanWhatIfHeadline(projection: WhatIfProjection): LoanWhatIfHeadline {
  const payoffLabel = formatMonthYear(projection.scenario.payoffDate);

  if (projection.baseline.monthsRemaining === 0) {
    return { kind: 'paid-off', payoffLabel, deltaLabel: null, interestSavedLabel: null };
  }
  if (projection.monthsSaved <= 0 && projection.interestSaved <= 0) {
    return { kind: 'unchanged', payoffLabel, deltaLabel: null, interestSavedLabel: null };
  }

  return {
    kind: 'improved',
    payoffLabel,
    deltaLabel:
      projection.monthsSaved > 0 ? `${describeMonthSpan(projection.monthsSaved)} earlier` : null,
    interestSavedLabel: `~${formatCurrency(projection.interestSaved, { whole: true })}`,
  };
}
