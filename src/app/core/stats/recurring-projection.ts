import { formatIsoDate, MS_PER_DAY, parseIsoDate } from '@/shared/utils';
import type { RecurringCadence, RecurringPaymentSeries } from './recurring-payments';

/**
 * One expected hit of a recurring series on a specific date. Deliberately an *event* shape —
 * dated, amounted and series-keyed — rather than something calendar-shaped: a later cash-flow
 * forecast consumes exactly this, and would have to unpick a grid.
 */
export type ProjectedOccurrence = {
  seriesKey: string;
  label: string;
  categoryId: number | null;
  date: string;
  /** The series' `typicalAmount` — a projection has no actual amount to report, only an expectation. */
  amount: number;
};

/**
 * Steps a projection is allowed to take away from a series' anchor date, in either direction. Only
 * a backstop against a pathological window (a weekly series against a decade-wide span would
 * otherwise enumerate 500+ dates per series); every real caller asks for one month.
 */
const MAX_STEPS = 2000;

/** Last day of the given month, so a step never overflows into the next one. */
const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const MONTHS_PER_STEP: Partial<Record<RecurringCadence, number>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * The anchor date shifted by `steps` whole cadence periods, **by the calendar rather than by a
 * day-count**: a bill on the 28th stays on the 28th instead of drifting a day or two per month the
 * way a fixed 30.44-day step would. A step that would overflow a shorter month lands on its last
 * day — the 31st projected into February is the 28th, not the 3rd of March.
 */
const stepBy = (anchorIso: string, cadence: RecurringCadence, steps: number): string => {
  const anchor = parseIsoDate(anchorIso);
  if (cadence === 'weekly') {
    return formatIsoDate(new Date(anchor.getTime() + steps * 7 * MS_PER_DAY));
  }

  const monthsPerStep = MONTHS_PER_STEP[cadence] ?? 1;
  const targetMonth = anchor.getUTCMonth() + steps * monthsPerStep;
  const year = anchor.getUTCFullYear() + Math.floor(targetMonth / 12);
  const monthIndex = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(anchor.getUTCDate(), daysInMonth(year, monthIndex));

  return formatIsoDate(new Date(Date.UTC(year, monthIndex, day)));
};

/** Every date this series is expected on inside `[fromIso, toIso]`, walking out from its anchor in both directions. */
const datesInWindow = (
  series: RecurringPaymentSeries,
  fromIso: string,
  toIso: string,
): string[] => {
  // Back up first: a window can start before `nextExpectedDate` — the current month's past days
  // are exactly where "what was expected, and did it arrive" gets asked (TICKET-REC-04).
  let step = 0;
  while (
    step > -MAX_STEPS &&
    stepBy(series.nextExpectedDate, series.cadence, step - 1) >= fromIso
  ) {
    step--;
  }

  const dates: string[] = [];
  for (; step <= MAX_STEPS; step++) {
    const date = stepBy(series.nextExpectedDate, series.cadence, step);
    if (date > toIso) break;
    if (date >= fromIso) dates.push(date);
  }

  return dates;
};

/**
 * The expected hits of every detected series inside `[fromIso, toIso]` (FR-REC-3, TICKET-REC-03) —
 * FR-REC-1's series projected forward from each one's `nextExpectedDate` by its own cadence, so a
 * weekly series lands about four times in a month and a yearly one usually not at all.
 *
 * **Projected, never promised.** The app knows rhythms, not bill contracts: an entry means "expected
 * around this date", and the jitter that `detectRecurringPayments` tolerates on the way in means a
 * real payment can land a day or two either side of the date given here. Callers should say
 * "expected" and never "due".
 *
 * Pure and window-bounded, with no clock of its own — the caller decides which month it is asking
 * about, which is what lets the same function serve a calendar, a list and (later) a forecast.
 * Results come back date-ordered, ties broken by label so the order is stable across derivations.
 */
export const projectRecurringOccurrences = (
  series: readonly RecurringPaymentSeries[],
  fromIso: string,
  toIso: string,
): ProjectedOccurrence[] => {
  if (fromIso > toIso) return [];

  const projected: ProjectedOccurrence[] = [];
  for (const entry of series) {
    for (const date of datesInWindow(entry, fromIso, toIso)) {
      projected.push({
        seriesKey: entry.key,
        label: entry.label,
        categoryId: entry.categoryId,
        date,
        amount: entry.typicalAmount,
      });
    }
  }

  return projected.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
};
