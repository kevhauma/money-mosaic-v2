import type { Granularity } from './date-buckets';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const spanDays = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / MS_PER_DAY,
  );

/**
 * Auto-picks a bucket granularity from a [from, to] span so full-history charts stay legible
 * whether the account is a month old or a decade old (TICKET-STAT-02). Thresholds:
 *   <= 120 days (~4 months)  -> day
 *   <= 550 days (~18 months) -> week
 *   <= 1826 days (~5 years)  -> month
 *   longer                   -> quarter
 */
export const pickGranularityForSpan = (from: string, to: string): Granularity => {
  const days = spanDays(from, to);

  if (days <= 120) return 'day';
  if (days <= 550) return 'week';
  if (days <= 1826) return 'month';
  return 'quarter';
};
