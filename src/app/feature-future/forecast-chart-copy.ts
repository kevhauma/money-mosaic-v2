import type { ForecastMode } from '@/core/data-access';

/**
 * Everything the projection chart *says* (TICKET-FUT-07/FUT-09), kept out of the component so the
 * wording is testable without a TestBed and the component keeps no branching of its own.
 *
 * The caption is not decoration: it is the one sentence that stops a smooth line implying a
 * precision the data cannot support, and it has to account for any goal the picture leaves out.
 */
const STRAIGHT_LINE: Record<ForecastMode, string> = {
  'when-affordable':
    'A straight line from today at your measured rate — no compounding, interest, inflation or upcoming bills.',
  'required-rate':
    'A straight line from today at the rate this plan needs, against what you actually save — no compounding, interest, inflation or upcoming bills.',
};

const OMITTED_REASON: Record<ForecastMode, (count: number) => string> = {
  'when-affordable': (count) => `your rate never reaches ${count === 1 ? 'it' : 'them'}`,
  // Covers both undrawn cases at once — a goal with no wanted-by date, and one wanted too soon to
  // save for — since neither has a monthly figure the line could be drawn from.
  'required-rate': (count) =>
    `there's no monthly figure to plot for ${count === 1 ? 'it' : 'them'}`,
};

export const projectionCaption = (mode: ForecastMode, omittedGoalCount: number): string => {
  const base = STRAIGHT_LINE[mode];
  if (omittedGoalCount === 0) return base;

  const goalWord = omittedGoalCount === 1 ? 'goal is' : 'goals are';
  return `${base} ${omittedGoalCount} ${goalWord} not drawn: ${OMITTED_REASON[mode](omittedGoalCount)}.`;
};

const NO_GOALS =
  'Add a goal above and this chart shows what your balance looks like as each one gets bought.';

const NOTHING_TO_DRAW: Record<ForecastMode, string> = {
  'when-affordable':
    'Not enough complete months of history yet to project a balance — import more history, or shorten the window.',
  'required-rate': 'Give a goal a wanted-by date and this chart draws what reaching it would take.',
};

/** Why there is no chart — which is never "nothing", always a specific missing thing. */
export const projectionEmptyMessage = (mode: ForecastMode, goalCount: number): string =>
  goalCount === 0 ? NO_GOALS : NOTHING_TO_DRAW[mode];

export const projectionAriaLabel: Record<ForecastMode, string> = {
  'when-affordable': "Projected net worth by month, with each goal's purchase subtracted",
  'required-rate':
    'Projected net worth by month at the rate this plan needs, against the rate you actually save',
};
