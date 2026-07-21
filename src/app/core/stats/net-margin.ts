/**
 * `net / income` as a share — how much of income is left (or overspent) after expenses, distinct
 * from `savingsRate` (which only counts money actually moved into savings accounts) (TICKET-STAT-21).
 * `null` when income is zero, mirroring `PeriodStats.savingsRate`'s zero-income guard.
 */
export const computeNetMargin = (net: number, income: number): number | null =>
  income === 0 ? null : net / income;
