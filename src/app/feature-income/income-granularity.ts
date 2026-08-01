import type { Granularity } from '@/shared/utils';

/**
 * The whole Income page buckets by calendar month — deliberately fixed rather than a per-chart
 * `mm-granularity-picker` (TICKET-INC-02 divergence, see that ticket's amended criterion). Income
 * is a monthly-cadence concept everywhere else in v1.6: FR-INC-05's growth rate is
 * period-over-period and year-over-year, FR-INC-04 smooths an annual lump sum *across months*, and
 * FR-INC-10's gross wage entries are literally keyed `yearMonth: 'YYYY-MM'`. A day- or
 * week-bucketed income series shows one spike per payday and nothing else, so the control offered
 * four settings that made the page harder to read and one that didn't.
 *
 * Lives in the feature root rather than on a component because `IncomeStore` and every panel share
 * it (TICKET-INC-05) — one granularity, or the panels can disagree about what a "period" is.
 */
export const INCOME_GRANULARITY: Granularity = 'month';
