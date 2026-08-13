import type { SavingsGoal } from '@/core/data-access';
import type {
  GoalAffordability,
  GoalAffordabilityReason,
  GoalRequiredSaving,
  RequiredSavingReason,
} from '@/core/stats';
import type { BadgeColor } from '@/shared/ui';
import { formatCurrency, formatDate, formatMonthYear } from '@/shared/utils';

/** No answer to give yet — the row still lists the goal, just without a verdict on it. */
const BLANK_FACTS = {
  etaLabel: '',
  etaColor: 'neutral' as BadgeColor,
  cumulativeLabel: '',
  trackLabel: '',
  trackColor: 'error' as BadgeColor,
};

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
  if (!entry) return BLANK_FACTS;

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

const REQUIRED_COLOR: Record<RequiredSavingReason, BadgeColor> = {
  'already-affordable': 'success',
  required: 'info',
  'due-now': 'error',
  'no-target-date': 'neutral',
};

/** The gap phrase — the thing the user is actually deciding on, in either direction. */
const gapLabelFor = (entry: GoalRequiredSaving): string => {
  const gap = entry.gapPerMonth ?? 0;
  if (gap <= 0) return `${formatCurrency(-gap)}/month less than you save — you're ahead of this`;
  return `${formatCurrency(gap)}/month more than you've been saving`;
};

/** The two required-mode verdicts whose phrasing carries no figure. */
const FIXED_REQUIRED_LABEL: Partial<Record<RequiredSavingReason, string>> = {
  'already-affordable': 'You can buy this now',
  'no-target-date': 'Add a wanted-by date to see what this needs',
};

/** "Save ≈ €340/month to make June 2027", or why there is no such number. */
const requiredLabelFor = (entry: GoalRequiredSaving, goal: SavingsGoal): string => {
  const fixed = FIXED_REQUIRED_LABEL[entry.reason];
  if (fixed) return fixed;
  if (entry.reason === 'due-now') {
    return `Wanted this month — you're ${formatCurrency(entry.shortfallNow ?? 0)} short right now`;
  }
  // "≈" and not an exact-looking figure: `formatCurrency` rounds to cents, and a rate rounded down
  // would under-fund the goal by that rounding error every month.
  return `Save ≈ ${formatCurrency(entry.requiredPerMonth as number)}/month to make ${formatMonthYear(goal.targetDate as string)}`;
};

/** The required-rate reading of one row (TICKET-FUT-09) — the same row, a different question. */
const requiredFactsFor = (
  goal: SavingsGoal,
  entry: GoalRequiredSaving | undefined,
): Pick<GoalRowVm, 'etaLabel' | 'etaColor' | 'cumulativeLabel' | 'trackLabel' | 'trackColor'> => {
  if (!entry) return BLANK_FACTS;

  return {
    etaLabel: requiredLabelFor(entry, goal),
    etaColor: REQUIRED_COLOR[entry.reason],
    cumulativeLabel:
      entry.reason === 'required'
        ? gapLabelFor(entry)
        : `${formatCurrency(entry.cumulativeTarget)} with everything above it`,
    trackLabel: '',
    trackColor: 'error',
  };
};

/**
 * One row's full render state — the goal, its formatting, and whichever question the page is
 * answering about it (TICKET-FUT-05 / TICKET-FUT-09). The two modes swap the readout on the *same*
 * row rather than rendering a second list.
 */
export const buildGoalRow = (
  goal: SavingsGoal,
  index: number,
  count: number,
  verdict:
    | { mode: 'when-affordable'; affordability: GoalAffordability | undefined }
    | { mode: 'required-rate'; required: GoalRequiredSaving | undefined },
): GoalRowVm => ({
  goal,
  amountLabel: formatCurrency(goal.targetAmount),
  metaLabel: metaLabelFor(goal),
  ...(verdict.mode === 'required-rate'
    ? requiredFactsFor(goal, verdict.required)
    : affordabilityFactsFor(verdict.affordability)),
  isFirst: index === 0,
  isLast: index === count - 1,
});
