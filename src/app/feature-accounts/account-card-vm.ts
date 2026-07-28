import type { Account } from '@/core/data-access';

/** One account card's full render state (TICKET-ACC-05), joined once so the `@for` loop over
 * accounts never calls a component method per row — `balanceFor`/`shareFor`/`isFirst`/`isLast`/
 * `accountIconName` all collapse into this. */
export type AccountCardVm = {
  account: Account;
  balance: number;
  /** My net-worth stake in a joint account (TICKET-STAT-03) — `hasShare` is `false` (and
   * `shareDisplay` meaningless) for a non-joint account. Split into a flag + a non-nullable number,
   * rather than `number | null`, so the template can gate on `hasShare` without a `!` assertion to
   * satisfy `SignedAmountPipe`'s `number` parameter — a `null`-check alone doesn't narrow a signal
   * input's field across repeated `vm()` calls the way it would a plain, stable reference. */
  hasShare: boolean;
  shareDisplay: number;
  isFirst: boolean;
  isLast: boolean;
  iconName: string;
  /** Last 4 characters of the account's IBAN, or `null` when it has none. */
  ibanTail: string | null;
};
