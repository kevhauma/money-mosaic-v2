import { bucketKeyForDate, type Granularity } from './date-buckets';

export type ChartZoomWindow = { startValue: number; endValue: number };

/**
 * Maps a [from, to] date range onto index positions within an already-computed, gap-filled
 * `bucketKeys` list (TICKET-STAT-03 header wiring for full-history charts): the charts always
 * compute their series over the account's/accounts' entire history, independent of the topbar
 * range, so the topbar range can only scrub the chart's zoom window rather than shrinking the
 * underlying series data. Falls back to the nearest edge when `from`/`to` fall outside the
 * series' own span (e.g. the topbar range starts before the account existed).
 */
export const computeZoomWindow = (
  bucketKeys: string[],
  from: string,
  to: string,
  granularity: Granularity,
): ChartZoomWindow => {
  if (bucketKeys.length === 0) return { startValue: 0, endValue: 0 };

  const lastIndex = bucketKeys.length - 1;
  const fromIndex = bucketKeys.indexOf(bucketKeyForDate(from, granularity));
  const toIndex = bucketKeys.indexOf(bucketKeyForDate(to, granularity));

  return {
    startValue: fromIndex === -1 ? 0 : fromIndex,
    endValue: toIndex === -1 ? lastIndex : toIndex,
  };
};
