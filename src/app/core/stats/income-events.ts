import type { SalaryMetadata } from '@/core/data-access';
import type { IncomeGap } from './income-gap-detection';
import type { IncomeStepChange } from './income-step-change-detection';
import type { WageChange } from './wage-change-detection';

/**
 * What kind of moment an event marks. Extensible by design — a career start (FR-INC-12) or a stream
 * *resuming* are natural additions, and this union plus `KIND_ORDER` below are the only places they
 * would need adding.
 */
export type IncomeEventKind = 'raise' | 'pay-cut' | 'bonus' | 'stream-stopped' | 'wage-change';

export type IncomeEvent =
  | ({ kind: 'raise' | 'pay-cut'; bucketKey: string } & Omit<IncomeStepChange, 'direction'>)
  | ({ kind: 'stream-stopped'; bucketKey: string } & IncomeGap)
  | { kind: 'bonus'; bucketKey: string; amount: number }
  | ({ kind: 'wage-change' } & WageChange);

/**
 * Tie-break for two events in the same month, so the list is deterministic rather than dependent on
 * which detector happened to run first. Ordered by how much the event changes the income story.
 */
const KIND_ORDER: Record<IncomeEventKind, number> = {
  raise: 0,
  'pay-cut': 1,
  'stream-stopped': 2,
  bonus: 3,
  // Last within a month: a sustained step change and a month-on-month move are often the same
  // event seen two ways, and the structural reading is the one to lead with.
  'wage-change': 4,
};

const KIND_BY_DIRECTION: Record<IncomeStepChange['direction'], 'raise' | 'pay-cut'> = {
  increase: 'raise',
  decrease: 'pay-cut',
};

/**
 * Every notable moment in the user's income history as one chronological list (FR-INC-14,
 * TICKET-INC-17) — the raises and pay cuts FR-INC-8 detects, the streams FR-INC-9 finds have gone
 * quiet, the months the user recorded a bonus against their salary (FR-INC-10), which until now only
 * ever existed as an adjustment inside the take-home ratio rather than as a moment, and every
 * month-on-month move in take-home or gross pay past `detectWageChanges`' threshold.
 *
 * Takes the already-detected inputs rather than the series, so each source keeps the series
 * discipline its own requirement demands — step changes off the *smoothed* trend, gaps off the *raw*
 * one (display smoothing must not paint over a genuine silence), wage changes off the plain-salary
 * gross/net basis — and this module stays a pure merge with no opinion about detection.
 *
 * Sorted newest-first: this is history to scroll back through, not a queue to work off.
 */
export const collectIncomeEvents = (
  stepChanges: IncomeStepChange[],
  gaps: IncomeGap[],
  salaryMetadata: Iterable<SalaryMetadata>,
  wageChanges: WageChange[] = [],
): IncomeEvent[] => {
  const events: IncomeEvent[] = [
    ...stepChanges.map(({ direction, ...change }): IncomeEvent => ({
      ...change,
      kind: KIND_BY_DIRECTION[direction],
      bucketKey: change.changedAtBucketKey,
    })),
    ...gaps.map((gap): IncomeEvent => ({
      ...gap,
      kind: 'stream-stopped',
      bucketKey: gap.lastSeenBucketKey,
    })),
    ...wageChanges.map((change): IncomeEvent => ({ ...change, kind: 'wage-change' })),
  ];

  for (const entry of salaryMetadata) {
    // A row with a gross wage but no bonus is not an event — the user recorded a fact, not a moment.
    if (entry.bonus) {
      events.push({ kind: 'bonus', bucketKey: entry.yearMonth, amount: entry.bonus });
    }
  }

  return events.sort(
    (a, b) => b.bucketKey.localeCompare(a.bucketKey) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
};

export type IncomeEventYear = {
  /** `YYYY`. */
  year: string;
  events: IncomeEvent[];
};

/**
 * The events split into year sections, both levels newest-first — the same ordering the
 * salary-details table established for this page. A year with no events is simply absent; an empty
 * heading says nothing the missing one doesn't.
 */
export const groupIncomeEventsByYear = (events: IncomeEvent[]): IncomeEventYear[] => {
  const byYear = new Map<string, IncomeEvent[]>();
  for (const event of events) {
    const year = event.bucketKey.slice(0, 4);
    const existing = byYear.get(year);
    if (existing) existing.push(event);
    else byYear.set(year, [event]);
  }

  return [...byYear.entries()]
    .map(([year, yearEvents]) => ({ year, events: yearEvents }))
    .sort((a, b) => b.year.localeCompare(a.year));
};
