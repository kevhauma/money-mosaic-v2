import type { MoneyTextColor } from './typography.component';

/**
 * The one place a money figure's sign becomes a colour (TICKET-UI-27).
 *
 * Every surface that colours an amount calls this rather than reaching for `success`/`error` — or,
 * as the Net worth tile did, `primary`. That mattered because both default themes set
 * `--color-error` five hue degrees from `--color-primary`, so a *positive* €16,898.26 rendered in
 * the loss red beside a green "Net cash flow". `src/themes/theme-palette.spec.ts` now holds those
 * two hues apart, and `MoneyTextColor` resolves to money's own `--mm-money-*` tokens rather than to
 * the alert palette.
 *
 * Lives beside `mm-text` rather than in `shared/utils` because it returns a `TextColor` member —
 * `shared/ui` already depends on `shared/utils`, so the reverse direction would close a cycle.
 *
 * Zero counts as positive: a €0.00 balance is not a loss, and a third neutral state would make every
 * caller branch three ways to say the same thing.
 */
export const moneyColor = (amount: number): MoneyTextColor =>
  amount < 0 ? 'money-negative' : 'money-positive';

/**
 * For the surfaces that mark **only** losses and leave a positive amount in the body ink — the
 * transactions table, the import preview, the suggestion lists. Colouring every positive row green
 * there would tint most of a long table, which is why those places never did.
 */
export const negativeMoneyColor = (amount: number): MoneyTextColor | undefined =>
  amount < 0 ? 'money-negative' : undefined;
