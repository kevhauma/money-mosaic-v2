import type { SavingsGoal } from '@/core/data-access';
import { formatIsoDate, parseIsoDate } from '@/shared/utils';

export type RequiredSavingReason =
  | 'already-affordable' // spendable balance already covers it (and everything above it)
  | 'required' // a positive monthly amount reaches it by `targetDate`
  | 'due-now' // `targetDate` is this month or past — no whole months left to save
  | 'no-target-date'; // the goal has no wanted-by date; there is nothing to solve for

export type GoalRequiredSaving = {
  goalId: number;
  /** Identical to FUT-05's: the running sum of targets 1..n in the user's order. */
  cumulativeTarget: number;
  reason: RequiredSavingReason;
  /** Whole month-ends between today and `targetDate`; null when there is no date. */
  monthsAvailable: number | null;
  /** €/month needed to cover `cumulativeTarget` by `targetDate`; null unless 'required'. */
  requiredPerMonth: number | null;
  /** `requiredPerMonth − perMonth`; positive means short by that much. Null unless 'required'. */
  gapPerMonth: number | null;
  /** The whole amount still missing today; only set for 'due-now'. */
  shortfallNow: number | null;
};

export type RequiredSavingPlan = {
  goals: GoalRequiredSaving[];
  /** The binding constraint: the largest `requiredPerMonth` across dated goals. */
  planRequiredPerMonth: number | null;
  /** Which goal sets it — the one to move, or to move the date of. */
  bindingGoalId: number | null;
};

/** Backstop against a pathological `targetDate` (a goal wanted in the year 9999). */
const MAX_MONTHS = 1200;

/** The last day of the month `offset` calendar months after `today`'s month. FUT-05's grid. */
const monthEnd = (today: string, offset: number): string => {
  const date = parseIsoDate(today);
  return formatIsoDate(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset + 1, 0)),
  );
};

/**
 * Whole month-ends strictly after `today` and on or before `targetDate` — the months there is
 * actually still time to save in.
 *
 * A goal wanted by 15 March 2027, asked on 9 August 2026, has seven: the March month-end falls
 * after the date and does not count, because the money has to be there *by* the 15th.
 */
const monthsAvailableUntil = (today: string, targetDate: string): number => {
  let count = 0;
  for (let offset = 0; offset <= MAX_MONTHS; offset++) {
    const end = monthEnd(today, offset);
    if (end > targetDate) break;
    if (end > today) count++;
  }
  return count;
};

const NOTHING_TO_SOLVE = {
  monthsAvailable: null,
  requiredPerMonth: null,
  gapPerMonth: null,
  shortfallNow: null,
};

const resolveGoal = (
  goal: SavingsGoal,
  cumulativeTarget: number,
  options: { today: string; spendable: number; perMonth: number },
): GoalRequiredSaving => {
  const base = { goalId: goal.id!, cumulativeTarget };
  const shortfall = cumulativeTarget - options.spendable;

  // Checked before the date: money already in hand is the answer whatever the calendar says.
  if (shortfall <= 0) {
    return { ...base, reason: 'already-affordable', ...NOTHING_TO_SOLVE };
  }
  if (!goal.targetDate) {
    return { ...base, reason: 'no-target-date', ...NOTHING_TO_SOLVE };
  }

  const monthsAvailable = monthsAvailableUntil(options.today, goal.targetDate);
  // No whole month left to save in — so there is no rate to quote, only an amount still missing.
  // Answered rather than divided by: this is where a naive implementation returns Infinity.
  if (monthsAvailable === 0) {
    return {
      ...base,
      reason: 'due-now',
      monthsAvailable: 0,
      requiredPerMonth: null,
      gapPerMonth: null,
      shortfallNow: shortfall,
    };
  }

  const requiredPerMonth = shortfall / monthsAvailable;
  return {
    ...base,
    reason: 'required',
    monthsAvailable,
    requiredPerMonth,
    gapPerMonth: requiredPerMonth - options.perMonth,
    shortfallNow: null,
  };
};

/**
 * The goal demanding the largest monthly amount — the binding constraint, and the one to move (or
 * to move the date of). `null` when nothing is dated.
 */
const tightestOf = (resolved: GoalRequiredSaving[]): GoalRequiredSaving | null => {
  // Only the dated ones: the undated, the already-affordable and the due-now have no rate to be
  // the maximum of, and including them would make the plan rate answer a different question.
  const dated = resolved.filter((entry) => entry.reason === 'required');
  if (dated.length === 0) return null;

  return dated.reduce((tightest, entry) =>
    (entry.requiredPerMonth as number) > (tightest.requiredPerMonth as number) ? entry : tightest,
  );
};

/**
 * How much has to go aside each month to hit every goal's wanted-by date (FR-FUT-6,
 * TICKET-FUT-09) — FUT-05's question read in the opposite direction: fix the date, solve for the
 * rate.
 *
 * **The same plan, not a second one.** `cumulativeTarget` is the running sum in the user's funding
 * order, exactly as `computeGoalAffordability` computes it, over the same spendable balance
 * (net worth − safety net) and the same month-end grid — so reordering moves the required rates
 * exactly as it moves the ETAs, and the two modes can never disagree about what the order costs.
 *
 * **The plan rate is the maximum, never the sum.** Under sequential funding, one rate that clears
 * the tightest dated goal clears every looser one by construction. Summing the per-goal rates
 * double-counts the same euros and produces a number roughly *k* times too large for *k* goals.
 *
 * **The measured rate is the comparison, not an input.** A `perMonth` of zero or below does not
 * break this mode; it makes `gapPerMonth` equal the whole requirement, which is the honest reading.
 * So this mode still answers on histories too thin for FUT-05 to give a date.
 *
 * Clock-free: `today` is a parameter.
 */
export const computeRequiredSavingRate = (
  goals: SavingsGoal[],
  options: {
    today: string;
    startingBalance: number;
    safetyNetAmount: number;
    /** `SavingVelocity.perMonth` — for the gap, not for the maths. */
    perMonth: number;
  },
): RequiredSavingPlan => {
  const spendable = options.startingBalance - options.safetyNetAmount;

  let cumulativeTarget = 0;
  const resolved = goals.map((goal) => {
    cumulativeTarget += goal.targetAmount;
    return resolveGoal(goal, cumulativeTarget, { ...options, spendable });
  });

  const binding = tightestOf(resolved);
  if (!binding) return { goals: resolved, planRequiredPerMonth: null, bindingGoalId: null };

  return {
    goals: resolved,
    planRequiredPerMonth: binding.requiredPerMonth,
    bindingGoalId: binding.goalId,
  };
};
