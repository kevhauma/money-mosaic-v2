import type { Account } from '@/core/data-access';

/**
 * The order the account cards render in, top to bottom — **the chart's bands read top to bottom**
 * (TICKET-ACC-09).
 *
 * `AccountBalanceHistoryChartComponent` builds one stacked area per entry of `activeAccounts()`, and
 * in echarts the *first* series is the **bottom** band. So the stack read downwards is the reverse
 * of that array, and a list rendered in array order pointed the opposite way to the chart directly
 * above it. Both sides derive from the same `activeAccounts()` array, so they cannot drift.
 *
 * Archived accounts (only present when the toggle is on) come last: they have no band to line up
 * with, so a clean break at the bottom beats interleaving them into an order they don't take part
 * in. They are reversed among themselves too — not for alignment, but so `storeDirectionFor` below
 * holds for *every* card in the list rather than for some of them.
 */
export const accountDisplayOrder = (
  activeAccounts: readonly Account[],
  archivedAccounts: readonly Account[],
  showArchived: boolean,
): Account[] => [
  ...[...activeAccounts].reverse(),
  ...(showArchived ? [...archivedAccounts].reverse() : []),
];

/**
 * Translates a card's up/down arrow into the direction `AccountsStore.moveAccount` needs
 * (TICKET-ACC-09).
 *
 * The arrows keep meaning what the user sees — "up" moves the card up the screen — but the rendered
 * list is now the reverse of the stored order, so moving up the screen means moving *later* in the
 * store. Passing `'up'` straight through would move the card the right way and its band the wrong
 * way, which is precisely the mismatch this ticket exists to remove.
 */
export const storeDirectionFor = (visual: 'up' | 'down'): 'up' | 'down' =>
  visual === 'up' ? 'down' : 'up';
