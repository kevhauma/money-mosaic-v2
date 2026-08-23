import type { ForecastMode } from '@/core/data-access';
import type { SavingBasis, SavingVelocity } from '@/core/stats';
import type { TabDefinition } from '@/shared/ui';
import { formatCurrency, formatMonthYear } from '@/shared/utils';

/**
 * "All history" as a lookback (TICKET-FUT-06). A plain month count rather than a sentinel value on
 * the persisted row: `computeSavingVelocity` already clamps a window longer than the imported
 * history and reports what it actually measured, so a hundred years and "everything you have" are
 * the same request as far as the aggregate is concerned — and `ForecastSettings.lookbackMonths`
 * stays a number, with no null case for every reader to handle.
 */
export const ALL_HISTORY_LOOKBACK_MONTHS = 1200;

export type LookbackOption = { value: number; label: string };

export const LOOKBACK_OPTIONS: LookbackOption[] = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
  { value: 24, label: 'Last 24 months' },
  { value: ALL_HISTORY_LOOKBACK_MONTHS, label: 'All history' },
];

export type BasisOption = { value: SavingBasis; label: string; hint: string };

/**
 * Both readings, each with what it actually counts. The hint is not decoration: for the same user
 * these two can differ by an order of magnitude — someone who never moves money to a savings
 * account measures €0/month under the strict basis — so picking between them blind is picking
 * blind.
 */
export const BASIS_OPTIONS: BasisOption[] = [
  {
    value: 'net-cash-flow',
    label: 'Money left over',
    hint: 'Everything that came in, minus everything that went out.',
  },
  {
    value: 'savings-transfers',
    label: 'Money moved to savings',
    hint: 'Only what you deliberately moved into your own savings accounts.',
  },
];

/**
 * What the basis becomes once specific savings accounts are selected — not a choice any more, so
 * the toggle goes inert and this replaces the chosen option's hint. "Money moved to savings" counts
 * transfers *into* own savings accounts, and from inside those accounts there are none, so leaving
 * the choice live would let a steady saver read ~€0/month.
 */
export const SCOPED_BASIS_HINT =
  'Fixed while savings accounts are selected: everything that came into them, minus everything that left.';

/**
 * The basis is a **toggle, not a dropdown**: there are exactly two readings, and both need to be
 * visible at once for the choice to make sense — a closed dropdown hides the alternative behind a
 * click, which is the wrong shape for a binary decision whose whole point is the comparison.
 */
export const BASIS_TABS: TabDefinition[] = BASIS_OPTIONS.map(({ value, label }) => ({
  value,
  label,
}));

export type ModeOption = { value: ForecastMode; label: string; hint: string };

/**
 * The two questions `/future` can answer (TICKET-FUT-09). They are the same plan read in opposite
 * directions — fix the rate and solve for the date, or fix the date and solve for the rate — so the
 * page answers one at a time rather than putting a date the user didn't ask for next to a rate they
 * didn't ask for on every row.
 */
export const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'when-affordable',
    label: 'When can I afford it?',
    hint: 'Keep saving as you have been, and see when each goal comes within reach.',
  },
  {
    value: 'required-rate',
    label: 'What do I need to save?',
    hint: 'Set a wanted-by date per goal, and see the monthly amount that would hit it.',
  },
];

export const MODE_TABS: TabDefinition[] = MODE_OPTIONS.map(({ value, label }) => ({
  value,
  label,
}));

/**
 * The velocity readout (TICKET-FUT-06) — the mean the projection uses, next to the months it came
 * from and the spread inside them.
 *
 * The spread is the honesty mechanism, not a nicety: a single mean invites false precision, since
 * one holiday-pay month can carry a whole six-month window. Median, min and max cost one line and
 * are the only thing telling the user how much to trust the date they are being given.
 */
export type VelocityReadout = {
  /** `''` when there is a rate to show; otherwise why there isn't, in place of a €0/month. */
  insufficientMessage: string;
  /** "June 2026 – November 2026 · 6 complete months" — no amounts, so never masked. */
  windowLabel: string;
  /** The measured mean. Masked under privacy mode. */
  rateLabel: string;
  /**
   * Which of the two measures the rate above *is* (TICKET-STAT-42) — "money moved to savings" or
   * "money left over". The page has always let the user pick a basis; the readout never said which
   * one it had been given, so "You saved about €1,600.10/month" was a third unlabelled answer to
   * the same question the Dashboard already answers twice. No amounts, so never masked.
   */
  basisLabel: string;
  /** "typical month €180.00 · from €50.00 to €400.00". Masked under privacy mode. */
  spreadLabel: string;
};

const EMPTY_READOUT: Omit<VelocityReadout, 'insufficientMessage'> = {
  windowLabel: '',
  rateLabel: '',
  basisLabel: '',
  spreadLabel: '',
};

/** The chosen basis in the readout's own voice, off `BASIS_OPTIONS` so the two can't drift apart. */
const basisLabelFor = (basis: SavingBasis): string => {
  const option = BASIS_OPTIONS.find((candidate) => candidate.value === basis);
  return option ? `counting ${option.label.toLowerCase()}` : '';
};

export const describeVelocity = (velocity: SavingVelocity): VelocityReadout => {
  if (!velocity.hasEnoughHistory) {
    return {
      insufficientMessage:
        'Not enough complete months in this window yet — import more history, or pick a shorter window.',
      ...EMPTY_READOUT,
    };
  }

  const first = velocity.months[0];
  const last = velocity.months[velocity.months.length - 1];
  const monthWord = velocity.monthsCovered === 1 ? 'month' : 'months';

  return {
    insufficientMessage: '',
    // What was *measured*, which is not always what was asked for: a 24-month window over 9 months
    // of imported history says nine, rather than quietly implying twenty-four.
    windowLabel: `${formatMonthYear(first.from)} – ${formatMonthYear(last.to)} · ${velocity.monthsCovered} complete ${monthWord}`,
    rateLabel: `${formatCurrency(velocity.perMonth)}/month`,
    basisLabel: basisLabelFor(velocity.basis),
    spreadLabel: `typical month ${formatCurrency(velocity.median)} · from ${formatCurrency(velocity.min)} to ${formatCurrency(velocity.max)}`,
  };
};
