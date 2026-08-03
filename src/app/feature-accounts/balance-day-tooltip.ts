import { dayMovementsFor, type AccountDayMovement, type DayTransactionIndex } from '@/core/stats';
import { formatCurrency, formatDate } from '@/shared/utils';

/**
 * What one tooltip will show before the rest collapses into `+N more`: transaction lines per
 * account, transaction lines across all accounts, and accounts.
 *
 * A payday books thirty rows on one account, and a salary sweep moves every account at once —
 * without caps the tooltip grows taller than the viewport and hides the chart it is explaining.
 * Budgeting only the transaction lines isn't enough on its own: each account also costs a name row,
 * a net row and possibly a `+N more`, so ten moving accounts would still be ~40 rows. All three caps
 * together bound the tooltip at roughly two dozen rows whatever the day looks like.
 */
const MAX_LINES_PER_ACCOUNT = 5;
const MAX_LINES_TOTAL = 10;
const MAX_ACCOUNTS = 4;

/** Shape of an axis-trigger tooltip callback param echarts actually passes — only the fields this formatter reads. */
type AxisTooltipParam = {
  axisValue?: string;
  axisValueLabel?: string;
  marker?: string;
  seriesName?: string;
};

const INDENT = '&nbsp;&nbsp;';

const lineFor = (label: string, amount: number): string =>
  `${INDENT}${label}: ${formatCurrency(amount)}`;

/** Every account band's marker, keyed by the series name — so a tooltip row's dot is the very swatch echarts drew for that band. */
const markersBySeriesName = (params: readonly AxisTooltipParam[]): Map<string, string> =>
  new Map(
    params
      .filter((param): param is AxisTooltipParam & { seriesName: string } => !!param.seriesName)
      .map((param) => [param.seriesName, param.marker ?? '']),
  );

/** How many of an account's lines this tooltip has room for: its own cap, further trimmed by what's left of the shared budget. */
const shownLineCount = (movement: AccountDayMovement, budget: number): number =>
  Math.min(movement.lines.length, MAX_LINES_PER_ACCOUNT, Math.max(budget, 0));

const movementLines = (
  movement: AccountDayMovement,
  marker: string,
  shown: number,
  showAccountName: boolean,
): string[] => {
  const hidden = movement.lines.length - shown;

  return [
    ...(showAccountName ? [`${marker}${movement.accountName}`] : []),
    ...movement.lines.slice(0, shown).map(({ label, amount }) => lineFor(label, amount)),
    ...(hidden > 0 ? [`${INDENT}+${hidden} more`] : []),
    `${INDENT}<b>Net ${formatCurrency(movement.net)}</b>`,
  ];
};

/** Walks the day's accounts in chart order, spending the shared line budget as it goes, and says so when it stopped early. */
const renderMovements = (
  movements: readonly AccountDayMovement[],
  markers: ReadonlyMap<string, string>,
  showAccountNames: boolean,
): string[] => {
  let budget = MAX_LINES_TOTAL;
  const shownAccounts = movements.slice(0, MAX_ACCOUNTS);
  const hiddenAccounts = movements.length - shownAccounts.length;

  const lines = shownAccounts.flatMap((movement) => {
    const shown = shownLineCount(movement, budget);
    budget -= shown;
    return movementLines(
      movement,
      markers.get(movement.accountName) ?? '',
      shown,
      showAccountNames,
    );
  });

  return hiddenAccounts > 0 ? [...lines, `+${hiddenAccounts} more accounts`] : lines;
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
 * The balance charts' axis tooltip (TICKET-ACC-11): the hovered **day**, then what actually moved
 * the balance that day — per account with movement, each transaction and that account's net change.
 *
 * Replaces `formatAxisTooltip` on these two charts only. That shared formatter repeats each series'
 * value in the hovered bucket, which for a balance chart is the number the line already draws; every
 * other axis chart still uses it, because on a period *sum* restating the value is the useful answer.
 *
 * Reads a prebuilt `DayTransactionIndex` rather than the raw transactions: this runs on every hover
 * frame. Accounts that didn't move are absent — a day where one account moved shows one account, not
 * a column of zeroes — and a day where nothing moved still renders its date plus "No transactions",
 * so the tooltip is never empty.
 */
export const buildBalanceDayTooltip =
  (index: DayTransactionIndex, { showAccountNames }: BalanceDayTooltipOptions) =>
  (params: AxisTooltipParam | AxisTooltipParam[]): string => {
    const items = Array.isArray(params) ? params : [params];
    const day = hoveredDay(items);
    const movements = dayMovementsFor(index, day);

    const lines =
      movements.length === 0
        ? ['No transactions']
        : renderMovements(movements, markersBySeriesName(items), showAccountNames);

    return [headerFor(day), ...lines].filter(Boolean).join('<br/>');
  };
