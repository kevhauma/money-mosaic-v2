# TICKET-SET-04 — Locale setting

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings, locale for currency formatting); no existing FR-* covers this

## User story

As a user, I want to choose my locale in Settings, so numbers and dates are grouped and formatted the way I'm used to reading them, not hardcoded to Belgian formatting conventions.

## Description

TICKET-SET-03 made the currency *code* configurable but left the formatting locale (number grouping, decimal separator) hardcoded at `en-BE`. This ticket makes that locale configurable too, completing the settings-driven formatter TICKET-SET-03 started.

## Current situation (as-is)

- After TICKET-SET-03, `formatCurrency` in [currency-format.ts](../../../src/app/shared/utils/currency-format.ts) reads `AppSettings.currency` for the currency code but still hardcodes `'en-BE'` as the `Intl.NumberFormat` locale argument — the thing that controls whether `1234.5` renders as `1.234,50` (Belgian/European grouping) versus `1,234.50` (US grouping) versus other conventions.
- No date-formatting locale configuration exists either — a scan of the codebase for date display (e.g. transaction/account list dates, chart axis labels) shows dates are formatted ad hoc per call site rather than through one shared locale-aware helper; bringing every date call site under one locale-aware formatter is part of this ticket's scope (see to-be), not just the currency formatter.
- TICKET-SET-01 has introduced the `appSettings` table/repository/store/`/settings` page this ticket extends; TICKET-SET-03 has introduced the settings-driven currency formatter this ticket extends further.

## Desired result (to-be)

- `AppSettings` gains an additive `locale?: string` field (a BCP 47 tag, e.g. `'en-BE'`, `'en-US'`, `'nl-NL'`) on the existing table, defaulting to `'en-BE'` so unset behaves identically to today — no Dexie version bump.
- `formatCurrency` reads `locale` from `AppSettingsStore` instead of the hardcoded `'en-BE'` literal, combining it with TICKET-SET-03's currency-code setting in the same `Intl.NumberFormat(locale, { currency, style: 'currency' })` call.
- A new shared date-formatting helper (alongside `currency-format.ts` in `shared/utils/`, e.g. `date-format.ts`) wraps `Intl.DateTimeFormat(locale, ...)` reading the same `AppSettingsStore.locale()`, and existing ad hoc date-formatting call sites (transaction/account rows, chart axis labels — enumerate the actual call sites during implementation) are migrated onto it, so date formatting becomes locale-aware too rather than only currency numbers.
- The Settings page's "Currency" section (from TICKET-SET-03) gains a sibling "Locale" select (fixed list of common BCP 47 tags, not freeform, same reasoning as TICKET-SET-03's currency select), or the two are combined into one "Currency & locale" section if that reads better once both exist — implementation's call, not a hard requirement either way.

## Acceptance criteria

- [ ] `AppSettings.locale` added as an additive optional field, defaulting to `'en-BE'`; no Dexie version bump.
- [ ] `formatCurrency` uses the settings-driven locale together with the settings-driven currency (from TICKET-SET-03) in one `Intl.NumberFormat` call.
- [ ] A shared, locale-aware date-formatting helper exists in `shared/utils/` and at least the transaction list and account list dates are migrated to use it (full migration of every date call site is expected, but these two are the minimum verified in acceptance).
- [ ] Settings page offers a locale selection from a fixed list of common BCP 47 tags.
- [ ] Changing locale immediately re-formats both currency amounts (grouping/decimal separator) and migrated dates app-wide.
- [ ] The default-unset case (`'en-BE'`) produces output identical to pre-ticket behavior — regression check.
- [ ] Unit tests cover: `formatCurrency` under at least two different locale/currency combinations (e.g. `en-BE`/EUR vs `en-US`/USD) producing correctly-grouped output; the date helper formatting the same date differently under two different locales; the default-unset regression case.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: change locale on the Settings page, confirm a dashboard amount's grouping/decimal separator changes and a transaction date's format changes; reload and confirm persistence.

## Notes

- Depends on TICKET-SET-01 (settings shell) and specifically follows TICKET-SET-03 (currency), since it extends the same `formatCurrency` refactor rather than doing a second, conflicting refactor in parallel.
- Scope note: this ticket does not attempt full i18n (translated UI strings) — it only affects number/date *formatting* conventions, not the language of labels/copy. Translating the app's UI text is a materially larger effort explicitly out of scope here.
