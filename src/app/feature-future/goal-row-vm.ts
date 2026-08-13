import type { SavingsGoal } from '@/core/data-access';
import type { GoalAffordability, GoalAffordabilityReason } from '@/core/stats';
import type { BadgeColor } from '@/shared/ui';
import { formatCurrency, formatDate, formatMonthYear } from '@/shared/utils';

/**
 * One row of the goals list, resolved once in the component (TICKET-FUT-04/FUT-05) so the `@for`
 * reads plain fields rather than calling a formatter per row per change-detection pass — the
 * `CategoryRowVm` convention.
 *
 * `isFirst`/`isLast` drive the keyboard move buttons' disabled state; they are what makes the
 * funding order reachable without a pointer.
 */
export type GoalRowVm = {
  goal: SavingsGoal;
  /** `formatCurrency()`d target — masked by `mm-privacy-blur`, never blanked here. */
  amountLabel: string;
  /**
   * The secondary line: the `formatDate()`d "wanted by" and the note, already joined — `''` when
   * the goal has neither. Assembled in the class rather than by concatenating three bindings in
   * the template.
   */
  metaLabel: string;
  /**
   * The answer (TICKET-FUT-05): "You can buy this now", "≈ March 2027 · in 7 months", or
   * "Not at this rate". Never a raw number — `''` only while the page has nothing to say yet.
   */
  etaLabel: string;
  etaColor: BadgeColor;
  /** What the order costs up to and including this goal, `formatCurrency()`d. Masked like the target. */
  cumulativeLabel: string;
  /** "On track" / "Behind" against the goal's own wanted-by date, or `''` when there is no verdict. */
  trackLabel: string;
  trackColor: BadgeColor;
  isFirst: boolean;
  isLast: boolean;
};

/** How each verdict reads and how loudly, in one lookup rather than a chain of ternaries. */
const ETA_COLOR: Record<GoalAffordabilityReason, BadgeColor> = {
  'already-affordable': 'success',
  projected: 'info',
  'never-at-this-rate': 'warning',
};

/** The two verdicts whose phrasing carries no date. */
const FIXED_ETA_LABEL: Partial<Record<GoalAffordabilityReason, string>> = {
  'already-affordable': 'You can buy this now',
  'never-at-this-rate': 'Not at this rate',
};

/**
 * The ETA phrase for one goal. A month and a year, never a day: a straight-line forecast does not
 * know which Tuesday, and naming one would claim a precision it hasn't got.
 */
const etaLabelFor = (entry: GoalAffordability): string => {
  const fixed = FIXED_ETA_LABEL[entry.reason];
  if (fixed) return fixed;

  const months = entry.monthsAway ?? 0;
  const unit = months === 1 ? 'month' : 'months';
  return `≈ ${formatMonthYear(entry.affordableOn as string)} · in ${months} ${unit}`;
};

const trackFactsFor = (entry: GoalAffordability): Pick<GoalRowVm, 'trackLabel' | 'trackColor'> => {
  if (entry.onTrack == null) return { trackLabel: '', trackColor: 'error' };
  return entry.onTrack
    ? { trackLabel: 'On track', trackColor: 'success' }
    : { trackLabel: 'Behind', trackColor: 'error' };
};

/** Everything the row shows about *when*, blank until the forecast has an answer to give. */
const affordabilityFactsFor = (
  entry: GoalAffordability | undefined,
): Pick<GoalRowVm, 'etaLabel' | 'etaColor' | 'cumulativeLabel' | 'trackLabel' | 'trackColor'> => {
  if (!entry) {
    return {
      etaLabel: '',
      etaColor: 'neutral',
      cumulativeLabel: '',
      trackLabel: '',
      trackColor: 'error',
    };
  }

  return {
    etaLabel: etaLabelFor(entry),
    etaColor: ETA_COLOR[entry.reason],
    cumulativeLabel: `${formatCurrency(entry.cumulativeTarget)} with everything above it`,
    ...trackFactsFor(entry),
  };
};

const metaLabelFor = (goal: SavingsGoal): string =>
  [goal.targetDate && `Wanted by ${formatDate(goal.targetDate)}`, goal.note]
    .filter(Boolean)
    .join(' · ');

/** One row's full render state — the goal, its formatting, and FUT-05's answer for it. */
export const buildGoalRow = (
  goal: SavingsGoal,
  index: number,
  count: number,
  affordability: GoalAffordability | undefined,
): GoalRowVm => ({
  goal,
  amountLabel: formatCurrency(goal.targetAmount),
  metaLabel: metaLabelFor(goal),
  ...affordabilityFactsFor(affordability),
  isFirst: index === 0,
  isLast: index === count - 1,
});
