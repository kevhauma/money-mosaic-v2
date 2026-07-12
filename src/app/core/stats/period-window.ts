import { shiftRangeByCalendarUnit, type CalendarUnit, type RangePreset } from './date-buckets';

export type ComparisonWindowRange = { preset: RangePreset | 'custom'; from: string; to: string };

export type ComparisonWindowPeriod = { from: string; to: string; isSelected: boolean };

/** Width of the comparison window (selected period + this many more) — a named constant, not a hard-coded `5`/`4`, so a future ticket can make it configurable without touching the anchor-rule logic below. */
export const DEFAULT_COMPARISON_PERIOD_COUNT = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const parseIsoDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);
const formatIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** Calendar-aligned presets (FR-STAT-8) shift by whole calendar units so periods land on real boundaries; every other preset — including `custom` — shifts by the exact day-count of the selected range as a rolling window. */
const CALENDAR_UNIT_BY_PRESET: Partial<Record<RangePreset, CalendarUnit>> = {
  'this-week': 'week',
  'this-month': 'month',
  'last-month': 'month',
  'this-quarter': 'quarter',
  'last-quarter': 'quarter',
  'this-year': 'year',
  'last-year': 'year',
};

const shiftRangeByDayCount = (
  from: string,
  to: string,
  periodLengthDays: number,
  count: number,
): { from: string; to: string } => {
  const shiftMs = count * periodLengthDays * MS_PER_DAY;
  return {
    from: formatIsoDate(new Date(parseIsoDate(from).getTime() - shiftMs)),
    to: formatIsoDate(new Date(parseIsoDate(to).getTime() - shiftMs)),
  };
};

/**
 * Computes the ordered comparison window for TICKET-STAT-04: the selected range plus
 * `periodCount - 1` more periods of the same length (oldest first, selected period flagged).
 * Returns `null` for `all-time` — there's no "previous all-time" to compare against.
 *
 * Anchor rule: the selected period is shifted forward one whole period at a time until it reaches
 * one that covers "today" (`stepsForward`). If that took at most `periodCount - 1` steps, the
 * window's most recent period is the one reached — i.e. the window always stretches up to "now"
 * when the selection is recent (selecting "this month" → trailing-only; selecting "last month" →
 * 1 period forward + 3 back). Otherwise (the selection is further than `periodCount - 1` periods
 * in the past) the window is a plain trailing one ending at the selected period itself. Because
 * every period in the window is produced by shifting the same anchor by whole periods, the
 * selected period always reappears byte-for-byte at its rightful position.
 */
export const computeComparisonWindow = (
  range: ComparisonWindowRange,
  todayIso: string,
  periodCount = DEFAULT_COMPARISON_PERIOD_COUNT,
): ComparisonWindowPeriod[] | null => {
  if (range.preset === 'all-time') return null;

  const unit = range.preset === 'custom' ? undefined : CALENDAR_UNIT_BY_PRESET[range.preset];
  const periodLengthDays =
    Math.round(
      (parseIsoDate(range.to).getTime() - parseIsoDate(range.from).getTime()) / MS_PER_DAY,
    ) + 1;

  const shiftBack = (
    period: { from: string; to: string },
    count: number,
  ): { from: string; to: string } =>
    unit
      ? shiftRangeByCalendarUnit(period.from, period.to, unit, count)
      : shiftRangeByDayCount(period.from, period.to, periodLengthDays, count);

  let candidate: { from: string; to: string } = { from: range.from, to: range.to };
  let stepsForward = 0;
  while (candidate.to < todayIso) {
    candidate = shiftBack(candidate, -1);
    stepsForward++;
  }

  const mostRecent =
    stepsForward <= periodCount - 1 ? candidate : { from: range.from, to: range.to };

  const window: ComparisonWindowPeriod[] = [];
  for (let i = periodCount - 1; i >= 0; i--) {
    const period = shiftBack(mostRecent, i);
    window.push({
      from: period.from,
      to: period.to,
      isSelected: period.from === range.from && period.to === range.to,
    });
  }

  return window;
};
