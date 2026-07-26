# TICKET-SET-03 — Currency setting

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings, currency); no existing FR-* covers this

## User story

As a user whose bank account isn't in euros, I want to choose my currency in Settings, so amounts throughout the app display correctly instead of being hardcoded to EUR.

## Description

Every amount in the app is formatted through one hardcoded `Intl.NumberFormat('en-BE', { currency: 'EUR' })` helper. This ticket makes the currency display configurable and refactors that single source of truth to read it, so every call site updates automatically with no per-component changes.

**Scope changed during implementation (explicit user instruction):** rather than a fixed ISO 4217 code list feeding `Intl.NumberFormat`'s `currency` style, the setting is a free-form display **symbol** (a handful of presets — €, $, £, ¥, ₹ — plus a custom text field) and a **before/after** position toggle relative to the number. Number formatting itself (2 decimals, en-BE grouping) is done with `Intl.NumberFormat({ style: 'decimal' })` and the symbol is spliced onto whichever side the user picked; no ISO code is stored or validated. See Notes for why.

## Current situation (as-is)

- [currency-format.ts](../../../src/app/shared/utils/currency-format.ts) hardcodes both the currency and the formatting locale: `new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' })` (plus a `signDisplay: 'always'` variant). It exports one function, `formatCurrency(amount, { signed? })`, reused by [signed-amount.pipe.ts](../../../src/app/shared/utils/signed-amount.pipe.ts), dashboard stat formatters, and the chart tooltip formatter ([tooltip-formatter.ts](../../../src/app/shared/echarts/tooltip-formatter.ts)). **Correction found during implementation:** the original repo-wide search claiming this was the *only* hardcoded EUR literal was wrong — three more components each had their own separate `const EUR_FORMATTER = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' })`: `weekday-weekend-split-panel.component.ts`, `top-transactions-panel.component.ts`, and `category-comparison-panel.component.ts`. All three were switched to the shared `formatCurrency` as part of this ticket (see Notes).
- There is no per-user currency configuration anywhere — `en-BE`/`EUR` are compile-time constants.
- **Depends on TICKET-SET-05**, not on any other Settings ticket. TICKET-SET-05 introduces the `appSettings` Dexie table, `AppSettingsRepository`, and `AppSettingsStore` this ticket adds a field to. This ticket does not create that table itself, and is independent of TICKET-SET-02/PRIV-01's build order — those also depend only on SET-05, not on this ticket or each other.

## Desired result (to-be)

- `AppSettings` (from TICKET-SET-05) gains two additive optional fields: `currencySymbol?: string` (default `'€'`) and `currencySymbolPosition?: 'before' | 'after'` (default `'before'`) in `DEFAULT_APP_SETTINGS`, so existing behavior is unchanged for anyone who never opens Settings — no Dexie version bump.
- `currency-format.ts` is refactored so `formatCurrency` no longer hardcodes the formatter instances; instead it builds the number with a `style: 'decimal'` `Intl.NumberFormat` and splices the current symbol onto whichever side `currencySymbolPosition` says, reading both from module-level signals kept in sync with `AppSettingsStore` by an effect. The decimal formatter's locale is `'en-US'`, not `'en-BE'` — despite the original code reading like it grouped "en-BE style", `en-BE`'s `decimal` style actually renders `1.234,56` (`.`/`,` swapped from what the app's original `style: 'currency'` formatter produced); `en-US` decimal output (`1,234.56`) is what actually matches unchanged. Until TICKET-SET-04 lands, this locale stays hardcoded.
- The Settings page gains a "Currency" section: a row of preset symbol buttons (€, $, £, ¥, ₹) plus a custom text field (all writing the same underlying value — no ISO code list, no freeform-input-causes-invalid-code risk since there's no `Intl` currency code involved at all), a before/after position toggle, and a live preview of the configured format.
- Changing either the symbol or the position immediately re-formats every amount displayed app-wide (stat cards, transaction/account lists, chart tooltips) since they all funnel through the one `formatCurrency` source of truth — no other component needs to change, except marking `SignedAmountPipe` impure (`pure: false`) so Angular's pure-pipe memoization — keyed only on `amount` — doesn't mask a symbol/position-only change.
- This ticket does **not** convert amounts between currencies — it only changes the *symbol/formatting* of the numbers already stored (which remain whatever raw numeric value the bank CSV had). This is a display setting, not a multi-currency accounting feature; call this out clearly in the Settings UI copy so a user with, say, USD and EUR accounts doesn't mistake it for currency conversion.

## Acceptance criteria

- [x] `AppSettings.currencySymbol`/`currencySymbolPosition` added as additive optional fields, defaulting to `'€'`/`'before'`; no Dexie version bump.
- [x] `formatCurrency` (and its signed variant) read the symbol/position from `AppSettingsStore` instead of a hardcoded literal, with `formatCurrency` remaining synchronous and cheap enough to call from templates/pipes as it is today.
- [x] Settings page renders a "Currency" section with preset symbol buttons, a custom symbol text field, and a before/after position toggle, with the current selection indicated and a live preview shown.
- [x] Changing the currency symbol or position immediately re-formats amounts across at least: a dashboard stat card, a transaction row, and a chart tooltip — verified in one pass since they all share the one formatter.
- [x] Settings UI includes explicit copy clarifying this changes display formatting only, not currency conversion.
- [x] The existing default (`'€'`/`'before'`) remains correct for a user who has never touched this setting, matching today's hardcoded EUR-prefix output exactly.
- [x] Unit tests cover: `formatCurrency` reflecting a changed symbol and a changed position; the signed variant still showing a sign correctly with a custom symbol/position; the default-unset case still formatting as `'€'`-prefixed (regression check against current behavior).
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: change the currency symbol/position on the Settings page, confirm dashboard stat cards, a transaction list amount, and a chart tooltip all reflect the new format immediately; reload and confirm it persisted.

## Notes

- Depends only on TICKET-SET-05 (settings-store foundation). Independent of TICKET-SET-02 (primary color) and TICKET-PRIV-01 — either order is fine between all three.
- **Scope changed during implementation, by explicit user instruction:** the original text below described an ISO-4217-code `mm-select` feeding `Intl.NumberFormat`'s `currency` style. That was replaced with a free-form display symbol (presets + custom field) and a before/after position toggle, formatted via `Intl.NumberFormat({ style: 'decimal' })` with the symbol spliced on afterwards — since this app never does real currency conversion, a "pick your ISO code" control implied more multi-currency capability than actually exists; a display symbol makes the "cosmetic only" nature obvious.
- TICKET-SET-04 (locale) extends the same refactored `formatCurrency` to also read a user-selected locale instead of the still-hardcoded `'en-BE'` grouping/format locale — build this ticket first since it establishes the "settings-driven formatter" shape TICKET-SET-04 then extends, rather than both tickets touching `currency-format.ts` in parallel.
- Multi-currency accounting (per-account currency, real conversion rates) is explicitly out of scope — flagged in "Considered, not ticketed yet" in this version's `overview.md` as a materially bigger feature.
- **Bugfix found and fixed in this session, wider than this ticket alone:** `AppSettingsStore` only hydrates and wires up its settings-application effects (the accent-color CSS override from TICKET-SET-02, and this ticket's currency-symbol sync) the first time something injects it — nothing in the persistent authenticated-app shell (`AppShellComponent`) previously did, since `AppSettingsStore` was only ever injected by the Settings page itself. In practice this meant both accent color and (newly) currency silently never applied outside of a page load where the user had visited `/settings` first — reload straight into `/dashboard` and everything reverted to defaults, even though the underlying `appSettings` row was intact. Fixed by injecting `AppSettingsStore` in `AppShellComponent` so its `onInit` hydration/effects always run for every authenticated route. Also found and fixed: three dashboard panels (`weekday-weekend-split-panel`, `top-transactions-panel`, `category-comparison-panel`) each had their own separate hardcoded `EUR_FORMATTER`, missed by this ticket's original as-is analysis — switched to the shared `formatCurrency`.
