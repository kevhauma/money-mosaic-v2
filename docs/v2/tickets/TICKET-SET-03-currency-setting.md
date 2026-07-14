# TICKET-SET-03 — Currency setting

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings, currency); no existing FR-* covers this

## User story

As a user whose bank account isn't in euros, I want to choose my currency in Settings, so amounts throughout the app display correctly instead of being hardcoded to EUR.

## Description

Every amount in the app is formatted through one hardcoded `Intl.NumberFormat('en-BE', { currency: 'EUR' })` helper. This ticket makes the currency code a user setting and refactors that single source of truth to read it, so every call site updates automatically with no per-component changes.

## Current situation (as-is)

- [currency-format.ts](../../../src/app/shared/utils/currency-format.ts) hardcodes both the currency and the formatting locale: `new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' })` (plus a `signDisplay: 'always'` variant). It exports one function, `formatCurrency(amount, { signed? })`, that is the single source of truth reused by [signed-amount.pipe.ts](../../../src/app/shared/utils/signed-amount.pipe.ts), dashboard stat/panel formatters, and the chart tooltip formatter ([tooltip-formatter.ts](../../../src/app/shared/echarts/tooltip-formatter.ts)) — confirmed via a repo-wide search, this is the *only* place currency formatting happens; there is no second hardcoded EUR literal to hunt down elsewhere.
- There is no per-user currency configuration anywhere — `en-BE`/`EUR` are compile-time constants.
- TICKET-SET-01 has introduced the `appSettings` table, `AppSettingsRepository`/`Store`, and `/settings` page this ticket extends.

## Desired result (to-be)

- `AppSettings` gains an additive `currency?: string` field (ISO 4217 code, e.g. `'EUR'`, `'USD'`, `'GBP'`) on the existing `appSettings` table, defaulting to `'EUR'` in `DEFAULT_APP_SETTINGS` so existing behavior is unchanged for anyone who never opens Settings — no Dexie version bump.
- `currency-format.ts` is refactored so `formatCurrency` no longer hardcodes the formatter instances; instead, the currency code (and, once TICKET-SET-04 lands, the locale) is read from `AppSettingsStore` and a fresh/memoized `Intl.NumberFormat` is built for the current selection, recomputing when the setting changes. Until TICKET-SET-04 lands, the formatting locale stays hardcoded at `'en-BE'` — this ticket only makes the currency **code** configurable, not the number-grouping locale (that's TICKET-SET-04's job, see its ticket for how the two combine).
- The Settings page gains a "Currency" section (a `mm-select` populated from a fixed, reasonable list of common ISO 4217 codes — not a freeform text input, to avoid invalid codes reaching `Intl.NumberFormat` and throwing).
- Changing the currency setting immediately re-formats every amount displayed app-wide (stat cards, transaction/account lists, chart tooltips) since they all funnel through the one `formatCurrency` source of truth — no other component needs to change.
- This ticket does **not** convert amounts between currencies — it only changes the *symbol/formatting* of the numbers already stored (which remain whatever raw numeric value the bank CSV had). This is a display setting, not a multi-currency accounting feature; call this out clearly in the Settings UI copy so a user with, say, USD and EUR accounts doesn't mistake it for currency conversion.

## Acceptance criteria

- [ ] `AppSettings.currency` added as an additive optional field, defaulting to `'EUR'`; no Dexie version bump.
- [ ] `formatCurrency` (and its signed variant) read the currency code from `AppSettingsStore` instead of a hardcoded literal, with `formatCurrency` remaining synchronous and cheap enough to call from templates/pipes as it is today.
- [ ] Settings page renders a "Currency" select populated from a fixed list of common ISO 4217 codes, with the current selection indicated.
- [ ] Changing the currency setting immediately re-formats amounts across at least: a dashboard stat card, a transaction row, and a chart tooltip — verified in one pass since they all share the one formatter.
- [ ] Settings UI includes explicit copy clarifying this changes display formatting only, not currency conversion.
- [ ] Passing an unsupported/invalid code from the fixed select list is impossible by construction (no freeform input), and the existing default (`'EUR'`) remains correct for a user who has never touched this setting.
- [ ] Unit tests cover: `formatCurrency` reflecting a changed currency setting; the signed variant still applying `signDisplay: 'always'` correctly under a non-EUR currency; the default-unset case still formatting as EUR (regression check against current behavior).
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: change currency on the Settings page, confirm dashboard stat cards, a transaction list amount, and a chart tooltip all reflect the new currency symbol/format immediately; reload and confirm it persisted.

## Notes

- Depends on TICKET-SET-01 for the `appSettings` table/store/page shell. Independent of TICKET-SET-02 (primary color) — either order is fine between them.
- TICKET-SET-04 (locale) extends the same refactored `formatCurrency` to also read a user-selected locale instead of the still-hardcoded `'en-BE'` grouping/format locale — build this ticket first since it establishes the "settings-driven formatter" shape TICKET-SET-04 then extends, rather than both tickets touching `currency-format.ts` in parallel.
- Multi-currency accounting (per-account currency, real conversion rates) is explicitly out of scope — flagged in "Considered, not ticketed yet" in this version's `overview.md` as a materially bigger feature.
