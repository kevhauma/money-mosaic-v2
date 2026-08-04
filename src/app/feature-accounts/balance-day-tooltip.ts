import { dayMovementsFor, type AccountDayMovement, type DayTransactionIndex } from '@/core/stats';
import { formatCurrency, formatDate } from '@/shared/utils';

/**
 * What one tooltip will show before the rest collapses into `+N more`: transaction lines per
 * account, and transaction lines across all accounts.
 *
 * A payday books thirty rows on one account, and a salary sweep moves every account at once —
 * without caps the tooltip grows taller than the viewport and hides the chart it is explaining.
 * Only the *transaction* lines are budgeted: every band keeps its balance row, because that row is
 * the answer the hover is asked for, and folding some accounts away would leave the tooltip listing
 * fewer accounts than the stack it is sitting on.
 */
const MAX_LINES_PER_ACCOUNT = 5;
const MAX_LINES_TOTAL = 10;

/**
 * How wide one transaction line may get. A bank's `rawDescription` is often a whole line of terminal
 * ids, mandate references and city names, and the tooltip is a floating box with no wrapping budget —
 * past this the description stops labelling the amount and starts pushing it out of sight.
 */
const MAX_LABEL_CHARS = 40;

/** Shape of an axis-trigger tooltip callback param echarts actually passes — only the fields this formatter reads. */
type AxisTooltipParam = {
  axisValue?: string;
  axisValueLabel?: string;
  marker?: string;
  seriesName?: string;
  /** That band's data point in the hovered bucket — on these charts the account's own balance that day. */
  value?: unknown;
};

/** What echarts drew for one band, as the tooltip needs it: whose it is, its legend swatch, and the day's balance. */
type Band = {
  accountName: string;
  marker: string;
  balance: number | undefined;
};

const INDENT = '&nbsp;&nbsp;';

const truncate = (label: string): string =>
  label.length > MAX_LABEL_CHARS ? `${label.slice(0, MAX_LABEL_CHARS).trimEnd()}…` : label;

const lineFor = (label: string, amount: number): string =>
  `${INDENT}${truncate(label)}: ${formatCurrency(amount)}`;

const toBand = (param: AxisTooltipParam): Band => ({
  accountName: param.seriesName ?? '',
  marker: param.marker ?? '',
  balance: typeof param.value === 'number' ? param.value : undefined,
});

/**
 * The bands echarts actually drew at the hovered day, in its own stacking order — so every row's dot
 * is the swatch of that band and every balance is the very point it plotted, with no re-derivation
 * here. A band echarts didn't hand over (an account hidden from the legend) is absent from the
 * tooltip too, which is what keeps the two in agreement.
 *
 * Account detail has a single, unnamed series, so there is nothing to key on: its one param *is* the
 * band.
 */
const bandsOf = (params: readonly AxisTooltipParam[], showAccountNames: boolean): Band[] =>
  showAccountNames
    ? params.filter((param) => !!param.seriesName).map(toBand)
    : params.slice(0, 1).map(toBand);

/** That band's movement — by account name on the overview, and the day's only movement on account detail. */
const movementLookup = (
  movements: readonly AccountDayMovement[],
  showAccountNames: boolean,
): ((band: Band) => AccountDayMovement | undefined) => {
  if (!showAccountNames) return () => movements[0];

  const byAccountName = new Map(movements.map((movement) => [movement.accountName, movement]));
  return (band) => byAccountName.get(band.accountName);
};

/** How many of an account's lines this tooltip has room for: its own cap, further trimmed by what's left of the shared budget. */
const shownLineCount = (movement: AccountDayMovement | undefined, budget: number): number =>
  Math.min(movement?.lines.length ?? 0, MAX_LINES_PER_ACCOUNT, Math.max(budget, 0));

/**
 * The balance every band gets at the hovered day: `●Checking: €4,120.00` on the overview, a bare
 * `Balance: €4,120.00` on account detail, where naming the account the page already is would label
 * nothing. Empty when echarts sent no numeric point, so a missing value never prints as a figure.
 */
const balanceRow = ({ accountName, marker, balance }: Band, showAccountName: boolean): string => {
  if (balance === undefined) return showAccountName ? `${marker}${accountName}` : '';

  return `${showAccountName ? `${marker}${accountName}` : 'Balance'}: ${formatCurrency(balance)}`;
};

/** One account's block: its balance for the day, then the transactions that got it there. */
const accountBlock = (
  band: Band,
  movement: AccountDayMovement | undefined,
  shown: number,
  showAccountName: boolean,
): string[] => {
  const lines = movement?.lines ?? [];
  const hidden = lines.length - shown;

  return [
    balanceRow(band, showAccountName),
    ...lines.slice(0, shown).map(({ label, amount }) => lineFor(label, amount)),
    ...(hidden > 0 ? [`${INDENT}+${hidden} more`] : []),
  ].filter(Boolean);
};

/** Walks the bands in the chart's own stacking order, spending the shared transaction-line budget as it goes. */
const renderBands = (
  bands: readonly Band[],
  movements: readonly AccountDayMovement[],
  showAccountNames: boolean,
): string[] => {
  const movementFor = movementLookup(movements, showAccountNames);
  let budget = MAX_LINES_TOTAL;

  return bands.flatMap((band) => {
    const movement = movementFor(band);
    const shown = shownLineCount(movement, budget);
    budget -= shown;
    return accountBlock(band, movement, shown, showAccountNames);
  });
};

/** The hovered category — for these charts the `YYYY-MM-DD` bucket key itself. */
const hoveredDay = (items: readonly AxisTooltipParam[]): string => {
  const first = items[0];
  if (!first) return '';
  return first.axisValue ?? first.axisValueLabel ?? '';
};

/** Empty for a hover that carried no category at all — `formatDate('')` would throw on an invalid date. */
const headerFor = (day: string): string => (day ? `<b>${formatDate(day)}</b>` : '');

export type BalanceDayTooltipOptions = {
  /**
   * `false` on account detail: the page is already that one account, so a name row above its own
   * transactions is a redundancy, not a label. Same formatter either way — forking it would
   * guarantee the two tooltips drift.
   */
  showAccountNames: boolean;
};

/**
 * The balance charts' axis tooltip (TICKET-ACC-11): the hovered **day**, then every band the chart
 * drew — its balance at the close of that day, followed by the transactions that moved it
 * (descriptions clipped at `MAX_LABEL_CHARS`).
 *
 * Replaces `formatAxisTooltip` on these two charts only. That shared formatter repeats each series'
 * value in the hovered bucket without ever saying what caused it; every other axis chart still uses
 * it, because on a period *sum* the value alone is the useful answer.
 *
 * Reads a prebuilt `DayTransactionIndex` rather than the raw transactions: this runs on every hover
 * frame. Accounts are driven by the bands, not by the index, so an account that stood still still
 * shows its balance — and a day where nothing moved anywhere says "No transactions" outright rather
 * than leaving the reader to infer it from an absence.
 */
export const buildBalanceDayTooltip =
  (index: DayTransactionIndex, { showAccountNames }: BalanceDayTooltipOptions) =>
  (params: AxisTooltipParam | AxisTooltipParam[]): string => {
    const items = Array.isArray(params) ? params : [params];
    const day = hoveredDay(items);
    const movements = dayMovementsFor(index, day);

    const rows = renderBands(bandsOf(items, showAccountNames), movements, showAccountNames);
    const lines = movements.length === 0 ? [...rows, 'No transactions'] : rows;

    return [headerFor(day), ...lines].filter(Boolean).join('<br/>');
  };
