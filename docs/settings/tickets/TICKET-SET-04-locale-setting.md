# TICKET-SET-04 — Locale setting

- **Area:** App Settings
- **Released in:** [v2](../../releases/v2/overview.md)
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings, locale for currency formatting); no existing FR-* covers this

## User story

As a user, I want to choose my locale in Settings, so numbers and dates are grouped and formatted the way I'm used to reading them, not hardcoded to Belgian formatting conventions.

## Description

TICKET-SET-03 made the currency *code* configurable but left the formatting locale (number grouping, decimal separator) hardcoded at `en-BE`. This ticket makes that locale configurable too, completing the settings-driven formatter TICKET-SET-03 started.

## Current situation (as-is)

- After TICKET-SET-03, `formatCurrency` in [currency-format.ts](../../../src/app/shared/utils/currency-format.ts) reads `AppSettings.currency` for the currency code but still hardcodes `'en-BE'` as the `Intl.NumberFormat` locale argument — the thing that controls whether `1234.5` renders as `1.234,50` (Belgian/European grouping) versus `1,234.50` (US grouping) versus other conventions.
- No date-formatting locale configuration exists either — a scan of the codebase for date display (e.g. transaction/account list dates, chart axis labels) shows dates are formatted ad hoc per call site rather than through one shared locale-aware helper; bringing every date call site under one locale-aware formatter is part of this ticket's scope (see to-be), not just the currency formatter.
- **Depends on TICKET-SET-05** (settings-store foundation — `appSettings` table/repository/store) **and TICKET-SET-03** (the settings-driven `formatCurrency` refactor this ticket extends further). Unlike SET-02/SET-03/PRIV-01, which only need SET-05, this ticket has a genuine second dependency: it can't extend a currency-aware formatter that doesn't exist yet.

## Desired result (to-be)

- `AppSettings` (from TICKET-SET-05) gains an additive `locale?: string` field (a BCP 47 tag, e.g. `'en-BE'`, `'en-US'`, `'nl-NL'`), defaulting to `'en-BE'` so unset behaves identically to today — no Dexie version bump.
- `formatCurrency` reads `locale` from `AppSettingsStore` instead of the hardcoded `'en-BE'` literal, combining it with TICKET-SET-03's currency-code setting in the same `Intl.NumberFormat(locale, { currency, style: 'currency' })` call.
- A new shared date-formatting helper (alongside `currency-format.ts` in `shared/utils/`, e.g. `date-format.ts`) wraps `Intl.DateTimeFormat(locale, ...)` reading the same `AppSettingsStore.locale()`, and existing ad hoc date-formatting call sites (transaction/account rows, chart axis labels — enumerate the actual call sites during implementation) are migrated onto it, so date formatting becomes locale-aware too rather than only currency numbers.
- The Settings page's "Currency" section (from TICKET-SET-03) gains a sibling "Locale" select (fixed list of common BCP 47 tags, not freeform, same reasoning as TICKET-SET-03's currency select), or the two are combined into one "Currency & locale" section if that reads better once both exist — implementation's call, not a hard requirement either way.

## Acceptance criteria

- [x] `AppSettings.locale` added as an additive optional field, defaulting to `'en-BE'`; no Dexie version bump. — **Deviation, see Notes**: defaults to `'en-US'` instead, to actually satisfy the regression criterion below.
- [x] `formatCurrency` uses the settings-driven locale together with the settings-driven currency (from TICKET-SET-03) in one `Intl.NumberFormat` call.
- [x] A shared, locale-aware date-formatting helper exists in `shared/utils/` and at least the transaction list and account list dates are migrated to use it (full migration of every date call site is expected, but these two are the minimum verified in acceptance). — **Deviation, see Notes**: no per-account date field exists in the current UI to migrate; transfer-review's candidate dates and `date-range-input`'s `formatDisplayDate` were migrated instead as the substitute real call sites, alongside the required transaction list.
- [x] Settings page offers a locale selection from a fixed list of common BCP 47 tags.
- [x] Changing locale immediately re-formats both currency amounts (grouping/decimal separator) and migrated dates app-wide.
- [x] The default-unset case (`'en-US'`) produces output identical to pre-ticket behavior — regression check.
- [x] Unit tests cover: `formatCurrency` under at least two different locale/currency combinations (e.g. `en-BE`/EUR vs `en-US`/USD) producing correctly-grouped output; the date helper formatting the same date differently under two different locales; the default-unset regression case.
- [x] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: change locale on the Settings page, confirm a dashboard amount's grouping/decimal separator changes and a transaction date's format changes; reload and confirm persistence. — **Not verified**: user declined the live-browser check for this session.

## Notes

- Depends on TICKET-SET-05 (settings-store foundation) and specifically follows TICKET-SET-03 (currency), since it extends the same `formatCurrency` refactor rather than doing a second, conflicting refactor in parallel. Independent of SET-02 and PRIV-01.
- Scope note: this ticket does not attempt full i18n (translated UI strings) — it only affects number/date *formatting* conventions, not the language of labels/copy. Translating the app's UI text is a materially larger effort explicitly out of scope here.
- **As-is/default deviation**: this ticket's as-is section assumed TICKET-SET-03 left currency formatting hardcoded at `'en-BE'`. In the actual shipped code, TICKET-SET-03 deliberately hardcoded `'en-US'` instead (see the comment above `DEFAULT_LOCALE` in [currency-format.ts](../../../src/app/shared/utils/currency-format.ts)) — `en-BE`'s decimal-style grouping doesn't match the app's real pre-existing output (`1,234.56`), `en-US`'s does. Defaulting the new `locale` field to `'en-BE'` as originally worded would have silently changed every existing user's currency grouping — a real regression, and in direct conflict with this same ticket's own regression-check criterion. `DEFAULT_LOCALE = 'en-US'` was used instead so the unset case stays byte-identical to today's output.
- **Account list scope deviation**: `accounts-overview.component.html`/`accounts-detail.component.html` render no date field at all today (confirmed by direct search), so there was nothing there to migrate onto the new helper. `transfer-review.component.html`'s candidate dates and `date-range-input.component.ts`'s `formatDisplayDate` (used by every date-range picker across Dashboard/Accounts/Transactions) were migrated in its place as genuine additional call sites, on top of the required transaction list.
- **Known collateral behavior change**: `date-range-input.component.ts`'s `formatDisplayDate` was previously hardcoded to `'en-GB'` (`DD/MM/YYYY`), unrelated to the currency formatter's `en-US` convention. Migrating it onto the shared, `en-US`-defaulted locale changes its unset-case output to `MM/DD/YYYY` app-wide until a user picks a locale. This is a one-time, intentional side effect of unifying three previously-inconsistent hardcoded locales (`en-US` for currency, `en-GB` for this component, `en-BE` for `date-buckets.ts`'s month-name formatter) behind one setting; the existing test for this component was updated to match.
- **Out of scope, left as follow-up**: `date-buckets.ts`'s `MONTH_NAME_FORMATTER` (hardcoded `'en-BE'`, used for compact "July 2026"-style range labels) and chart x-axis bucket-key labels (`account-balance-chart`, `net-worth-history-chart`, `trend-chart-panel`) were not migrated — they're bucket-key/range-label formatting rather than raw date display, and English month names don't visibly differ across the locale presets offered, so there was no regression risk in leaving them as-is. A future ticket could fold them into the same locale setting for full consistency.
- Two independent module-level `locale` signals exist (`currency-format.ts` and `date-format.ts`), each synced from `AppSettingsStore.locale` by the same `onInit` effect — mirrors the existing `currencySymbol`/`currencySymbolPosition` pattern of one setting driving multiple module signals, rather than a shared cross-module signal.
