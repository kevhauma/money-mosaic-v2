import type { SavingsGoal } from '@/core/data-access';
import { formatIsoDate, parseIsoDate } from '@/shared/utils';

export type GoalAffordabilityReason =
  | 'already-affordable' // spendable balance already covers it (and everything above it)
  | 'projected' // reachable at this rate, on `affordableOn`
  | 'never-at-this-rate'; // velocity <= 0, or the horizon is exceeded

export type GoalAffordability = {
  goalId: number;
  /** Sum of this goal's target and every target above it — what the order actually costs. */
  cumulativeTarget: number;
  reason: GoalAffordabilityReason;
  /** Month-end date it becomes affordable; null unless `reason` is 'projected'. */
  affordableOn: string | null;
  /** Whole months from today; 0 for 'already-affordable', null for 'never-at-this-rate'. */
  monthsAway: number | null;
  /** Only when the goal has a `targetDate`: does `affordableOn` land on or before it? */
  onTrack: boolean | null;
};

/**
 * How far out a projection is allowed to look before it gives up and says "not at this rate".
 * 50 years — a backstop against an absurd date, not a product limit: nobody plans a purchase half
 * a century out, and a date past it is noise dressed up as an answer.
 */
const DEFAULT_HORIZON_MONTHS = 600;

/** The last day of the month `months` calendar months after `today`'s month. */
const monthEndAfter = (today: string, months: number): string => {
  const date = parseIsoDate(today);
  // Day 0 of the following month is the last day of the target one — and it steps by the calendar,
  // so a projection from 31 January lands on the 28th/29th of February rather than the 3rd of March.
  return formatIsoDate(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0)),
  );
};

/**
 * Which of the three answers this goal gets. `months` is `Infinity` when the rate is non-positive,
 * which lands on `never-at-this-rate` by the same comparison that catches an over-horizon target —
 * one rule rather than a special case.
 */
const resolveReason = (
  shortfall: number,
  months: number,
  horizonMonths: number,
): GoalAffordabilityReason => {
  if (shortfall <= 0) return 'already-affordable';
  return months <= horizonMonths ? 'projected' : 'never-at-this-rate';
};

/** Whole months from today: none needed when it's already covered, none knowable when it isn't reachable. */
const resolveMonthsAway = (reason: GoalAffordabilityReason, months: number): number | null => {
  if (reason === 'already-affordable') return 0;
  return reason === 'projected' ? months : null;
};

/**
 * `null` when there is nothing to compare — the goal has no wanted-by date, or no ETA at all.
 * A goal that is affordable today is on track against any date: the money is already there.
 */
const resolveOnTrack = (
  goal: SavingsGoal,
  reason: GoalAffordabilityReason,
  affordableOn: string | null,
): boolean | null => {
  if (!goal.targetDate) return null;
  if (reason === 'already-affordable') return true;
  return affordableOn ? affordableOn <= goal.targetDate : null;
};

/**
 * When each goal in the list becomes affordable (FR-FUT-4, TICKET-FUT-05) — the answer this whole
 * version exists for.
 *
 * **Funding is sequential, in the order given.** Goal *n*'s `cumulativeTarget` is the sum of targets
 * 1..*n*, so goal 2 only starts accumulating once goal 1 is paid for. That single decision is what
 * makes the ordering worth setting: dragging a goal up pushes every goal below it further out.
 *
 * **A straight line, on purpose.** No compounding, no inflation, no interest, and no known upcoming
 * bills. Each of those would make the number look more precise while making it harder to explain,
 * and none is measurable from imported bank CSVs alone.
 *
 * The three ways this refuses to be confidently wrong:
 * - money already in hand is reported as such (`already-affordable`, `monthsAway: 0`, no date)
 *   rather than dressed up as a savings plan;
 * - a non-positive rate is **answered** rather than divided by — every unaffordable goal comes back
 *   `never-at-this-rate`, so no `Infinity`, `NaN` or year-9999 date can reach a template;
 * - a target that is reachable only past `horizonMonths` gets the same honest verdict.
 *
 * Clock-free: `today` is a parameter, as in `detectRecurringPayments`/`projectRecurringOccurrences`.
 */
export const computeGoalAffordability = (
  goals: SavingsGoal[],
  options: {
    today: string;
    /** `AccountsStore.netWorth()` — the one figure the app has for "how much do I have". */
    startingBalance: number;
    safetyNetAmount: number;
    /** `SavingVelocity.perMonth`. May be zero or negative; both are real answers. */
    perMonth: number;
    horizonMonths?: number;
  },
): GoalAffordability[] => {
  const { today, startingBalance, safetyNetAmount, perMonth } = options;
  const horizonMonths = options.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const spendable = startingBalance - safetyNetAmount;

  let cumulativeTarget = 0;

  return goals.map((goal) => {
    cumulativeTarget += goal.targetAmount;
    const shortfall = cumulativeTarget - spendable;
    const months = perMonth > 0 ? Math.ceil(shortfall / perMonth) : Infinity;
    const reason = resolveReason(shortfall, months, horizonMonths);
    const affordableOn = reason === 'projected' ? monthEndAfter(today, months) : null;

    return {
      goalId: goal.id!,
      cumulativeTarget,
      reason,
      affordableOn,
      monthsAway: resolveMonthsAway(reason, months),
      onTrack: resolveOnTrack(goal, reason, affordableOn),
    };
  });
};
