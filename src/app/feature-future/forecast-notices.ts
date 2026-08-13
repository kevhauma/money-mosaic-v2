import type { SavingsGoal } from '@/core/data-access';
import type { GoalAffordability, RequiredSavingPlan, SavingVelocity } from '@/core/stats';
import type { AlertStatus } from '@/shared/ui';
import { formatCurrency, formatMonthYear } from '@/shared/utils';

/**
 * The one-line verdict above the goals list: where the plan lands, or — just as often — why it
 * doesn't land anywhere yet.
 *
 * The `'warning'` states are the ones where the app genuinely cannot answer the question, and they
 * are the reason this is a module rather than three ternaries in a template: a forecast is the one
 * thing in this app that can be confidently wrong, so each of them says what is missing and what
 * would fix it (TICKET-FUT-05). The status is resolved here too, so the template binds a field
 * rather than deriving a colour.
 */
export type ForecastNotice = { text: string; status: AlertStatus };

const NONE: ForecastNotice = { text: '', status: 'info' };

const goalWord = (count: number): string => (count === 1 ? 'goal' : 'goals');

/**
 * The states where there is no answer to give yet — `null` when the forecast can proceed. Each one
 * names what is missing *and* what would fix it, rather than leaving a blank where a date should be.
 */
const blockingNotice = (velocity: SavingVelocity): ForecastNotice | null => {
  if (!velocity.hasEnoughHistory) {
    return {
      text: 'Not enough complete months of history yet to measure what you save — import more history, or shorten the window.',
      status: 'warning',
    };
  }

  if (velocity.perMonth <= 0) {
    return {
      text: 'Over this window you spent more than you earned, so nothing here has a date yet. Change the window or what counts as saving, and this updates.',
      status: 'warning',
    };
  }

  return null;
};

/**
 * How many goals the rate never reaches — counted rather than hidden, because a summary that
 * quietly reported only the goals that *do* have a date would be the flattering kind of wrong.
 */
const unreachableNotice = (
  goalCount: number,
  affordability: GoalAffordability[],
): ForecastNotice | null => {
  const unreachable = affordability.filter((entry) => entry.reason === 'never-at-this-rate').length;
  if (unreachable === 0) return null;

  const verb = unreachable === 1 ? 'is' : 'are';
  return {
    text: `${unreachable} of your ${goalCount} ${goalWord(goalCount)} ${verb} out of reach at this rate.`,
    status: 'warning',
  };
};

/** Where the plan finishes, once there is a rate to walk it forward at. */
const landingNotice = (goalCount: number, affordability: GoalAffordability[]): ForecastNotice => {
  const unreachable = unreachableNotice(goalCount, affordability);
  if (unreachable) return unreachable;

  const last = affordability.at(-1);
  if (!last?.affordableOn) {
    return {
      text: `You can afford all ${goalCount} ${goalWord(goalCount)} right now.`,
      status: 'info',
    };
  }

  return {
    text: `All ${goalCount} ${goalWord(goalCount)} covered by ≈ ${formatMonthYear(last.affordableOn)}.`,
    status: 'info',
  };
};

/**
 * What the whole plan demands, in required-rate mode (TICKET-FUT-09) — one rate, not a sum, and the
 * goal that sets it, because that is the one to move or to move the date of.
 */
const comparisonPhrase = (gap: number, perMonth: number): string => {
  const averaged = `the ${formatCurrency(perMonth)} you've averaged`;
  return gap > 0
    ? `${formatCurrency(gap)}/month more than ${averaged}`
    : `${formatCurrency(-gap)}/month less than ${averaged}`;
};

/** "Camera is the one setting the pace." — or nothing, when the goal has gone. */
const pacePhrase = (name: string | undefined): string =>
  name ? ` ${name} is the one setting the pace.` : '';

const NO_DATES: ForecastNotice = {
  text: 'None of your goals has a wanted-by date yet — add one and this works out what it would take each month.',
  status: 'warning',
};

const requiredNotice = (
  plan: RequiredSavingPlan,
  velocity: SavingVelocity,
  goalsById: Map<number, SavingsGoal>,
): ForecastNotice => {
  const required = plan.planRequiredPerMonth;
  if (required == null) return NO_DATES;

  const gap = required - velocity.perMonth;
  const pace = pacePhrase(goalsById.get(plan.bindingGoalId as number)?.name);

  return {
    text: `To hit every date, save ≈ ${formatCurrency(required)}/month — ${comparisonPhrase(gap, velocity.perMonth)}.${pace}`,
    status: gap > 0 ? 'warning' : 'info',
  };
};

export type ForecastNoticeInput = {
  dataReady: boolean;
  goalCount: number;
  velocity: SavingVelocity;
  affordability: GoalAffordability[];
  requiredMode?: boolean;
  requiredPlan?: RequiredSavingPlan;
  goalsById?: Map<number, SavingsGoal>;
};

const LOADING: ForecastNotice = { text: 'Working out where this plan lands…', status: 'info' };

/**
 * `null` when the page is not being read in required-rate mode. That mode still answers on a
 * history too thin for the other one — the measured rate is its *comparison*, not its input — so it
 * skips the blocking states entirely.
 */
const requiredModeNotice = (input: ForecastNoticeInput): ForecastNotice | null =>
  input.requiredMode && input.requiredPlan
    ? requiredNotice(input.requiredPlan, input.velocity, input.goalsById ?? new Map())
    : null;

const measuredModeNotice = (input: ForecastNoticeInput): ForecastNotice =>
  blockingNotice(input.velocity) ?? landingNotice(input.goalCount, input.affordability);

export const forecastNotice = (input: ForecastNoticeInput): ForecastNotice => {
  // No goals: the empty state below already says what to do, and a second sentence saying nothing
  // is happening would just be noise.
  if (input.goalCount === 0) return NONE;
  if (!input.dataReady) return LOADING;

  return requiredModeNotice(input) ?? measuredModeNotice(input);
};
