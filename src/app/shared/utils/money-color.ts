/**
 * Money's own colour vocabulary, separate from daisyUI's brand/alert palette (TICKET-UI-27).
 *
 * These are NOT palette names: they resolve to the `.mm-money-*` hook classes in `styles.css`, which
 * read each theme's own `--mm-money-positive` / `--mm-money-negative`. A money figure must never be
 * coloured `primary` or `error` directly — both default themes shipped their brand red and their loss
 * red five hue degrees apart, so the Net worth tile's `color="primary"` rendered a positive figure as
 * a loss. `src/themes/theme-palette.spec.ts` holds the palettes apart; this vocabulary is what keeps
 * markup from reaching for the alert colours in the first place.
 *
 * Declared here rather than on `mm-text` so the union has one home for its three consumers — the
 * helpers below, `TextColor`, and the feature view-models — and so a child never imports a type
 * through its own parent component file.
 */
export type MoneyTextColor = 'money-positive' | 'money-negative';

/**
 * The one place a money figure's sign becomes a colour. Every sign-coloured amount calls this rather
 * than writing `amount < 0 ? 'error' : …` at the binding.
 *
 * Zero counts as positive: a EUR 0.00 balance is not a loss, and a third neutral state would make
 * every caller branch three ways to say the same thing.
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
