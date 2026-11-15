# TICKET-NG-16 — Formatters never print "-0,00" or "-0%"

- **Area:** Shared formatting (shared/utils)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-24; fixes the formatters of TICKET-NG-10 / TICKET-STAT-12 and the money colours of TICKET-UI-27

## User story

As a user whose balance nets to exactly zero, I want to see "€0,00" in the normal colour, so a floating-point leftover never shows up as a red "-€0,00" loss.

## Description

€10.10 + €20.20 − €30.30 is −3.55e-15 in floating point. `Intl.NumberFormat` rounds it to 0,00 but keeps the minus sign, and `moneyColor` tests `< 0`, so the figure renders as "-€0,00" in the loss colour. The percent formatters do the same with "-0%".

## Current situation (as-is)

- [currency-format.ts:7-31](../../../src/app/shared/utils/currency-format.ts) — `DECIMAL_FORMATTER` and `WHOLE_FORMATTER` use the default `signDisplay` (`'auto'`), which prints "-0,00" / "-0" for a negative value that rounds to zero; `SIGNED_DECIMAL_FORMATTER` uses `'always'`, which prints "-0,00" too. `signAndMagnitude` then splices that sign in front of the symbol.
- [number-format.ts:9-11](../../../src/app/shared/utils/number-format.ts) — `PERCENT_FORMATTER` (default `'auto'`) prints "-0%" for −0.0001. `SIGNED_PERCENT_FORMATTER` already uses `'exceptZero'` and is fine; `SIGN_BY_ICON` uses `'never'`.
- [money-color.ts:24-25](../../../src/app/shared/utils/money-color.ts) — `moneyColor` is `amount < 0 ? 'money-negative' : 'money-positive'`; `negativeMoneyColor` (line 32) likewise.
- Checked with Node's `Intl` (nl-BE): −3.55e-15 formats as "-0,00" by default, "0,00" with `signDisplay: 'negative'` or `'exceptZero'`; −0.0001 as percent formats "-0%" by default, "0%" with `'negative'`.

## Desired result (to-be)

- `DECIMAL_FORMATTER`, `WHOLE_FORMATTER` and `PERCENT_FORMATTER` use `signDisplay: 'negative'`; `SIGNED_DECIMAL_FORMATTER` uses `'exceptZero'` (a rounded zero shows no sign, a real amount keeps its `+`/`-`).
- `moneyColor` and `negativeMoneyColor` treat an amount that rounds to zero cents (`amount > -0.005`) as non-negative.

## Acceptance criteria

- [ ] `formatCurrency(10.1 + 20.2 - 30.3)` is "€0,00" with the symbol before and "0,00€" with it after — no minus.
- [ ] `formatCurrency(10.1 + 20.2 - 30.3, { signed: true })` has no sign; `formatCurrency(-5, { signed: true })` is "-€5,00" and `formatCurrency(5, { signed: true })` is "+€5,00".
- [ ] `formatCurrency(-0.4, { whole: true })` is "€0"; `formatCurrency(-0.6, { whole: true })` is "-€1".
- [ ] `formatPercent(-0.0001)` is "0%"; `formatPercent(-0.25)` is "-25%".
- [ ] `moneyColor(-3.55e-15)` and `moneyColor(-0.004)` are `'money-positive'`; `moneyColor(-0.005)` is `'money-negative'`; `negativeMoneyColor(-3.55e-15)` is `undefined`.
- [ ] Specs added to `currency-format.spec.ts`, `number-format.spec.ts` and `money-color.spec.ts`; formatter memoisation specs still pass.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: an account whose transactions net to zero (e.g. +10.10, +20.20, −30.30 on a zero opening balance) shows "€0,00" in the positive colour on the accounts page.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- `signDisplay: 'negative'` is supported in every browser the app targets (ES2023 `Intl.NumberFormat` v3); no polyfill.
- The −0.005 boundary matches 2-decimal rounding; `whole` figures may still colour −0.4 as positive while showing "€0", which is the intended result.
