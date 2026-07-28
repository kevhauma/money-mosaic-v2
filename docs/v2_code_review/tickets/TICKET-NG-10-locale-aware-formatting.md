# TICKET-NG-10 — Locale-aware formatting: fix the drift, consolidate the channels, guard recurrence

- **Area:** Shared formatting
- **Type:** Bug fix (drift) + Refactor (consolidation)
- **Traceability:** CR4-6 Part 1 + Part 2 Option A + Part 3 ([solution doc](../solutions/CR4-06-formatting-mechanisms.md)); CR4-7 Instance 1 Option A ([doc](../solutions/CR4-07-exports-from-component-files.md))

## User story

As a user who set my locale in Settings, I want every number the app shows — percentages, ratios, month names, not just currency and dates — to follow that locale, so the dashboard doesn't mix my locale's formatting with hardcoded Belgian formatting.

## Description

Five hardcoded `'en-BE'` `Intl` formatters ignore the locale setting — a live user-visible inconsistency (the bug). While fixing it, merge the two independent module-signal channels into one `format-settings` module (Part 2 Option A; Options B/C explicitly rejected), delete the `formatDisplayDate` alias exported from a `shared/ui` component file, and add a lint guard so the drift can't recur.

## Current situation (as-is)

- Hardcoded formatters ignoring the locale setting:
  - `PERCENT_FORMATTER` ×3 — [dashboard-overview](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts), [category-breakdown-panel](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts), [category-comparison-panel](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.ts) (the last with `maximumFractionDigits: 0` + `signDisplay: 'never'`);
  - `RATIO_FORMATTER` — [weekday-weekend-split-panel](../../../src/app/feature-dashboard/components/weekday-weekend-split-panel/weekday-weekend-split-panel.component.ts);
  - `MONTH_NAME_FORMATTER` — [date-buckets.ts](../../../src/app/shared/utils/date-buckets.ts).
- Two independent private `locale` signals in [currency-format.ts](../../../src/app/shared/utils/currency-format.ts) and [date-format.ts](../../../src/app/shared/utils/date-format.ts), each synced by its own `AppSettingsStore` `onInit` effect.
- [date-range-input.component.ts](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts) exports `formatDisplayDate`, an alias of `formatDate` from `shared/utils` — one helper, two names, two barrels.

## Desired result (to-be)

- One `shared/utils/format-settings.ts` module holding `locale`, `currencySymbol`, `currencySymbolPosition` with a single `syncFormatSettings(settings)` entry point; `currency-format.ts`, `date-format.ts`, and the new percent module read it; `AppSettingsStore`'s sync effects collapse to one.
- Locale-aware `formatPercent` (options bag covering the three current variants, including a **named** sign-conveyed-by-icon variant), ratio, and month-name display formatting in `shared/utils`; all five hardcoded formatters deleted. `Intl` formatter instances rebuilt via memoized `computed()` per variant when locale changes — never constructed per call (dashboard hot path).
- `formatDisplayDate` alias removed: one name, one home in `shared/utils`; all consumers import `formatDate`.
- ESLint `no-restricted-syntax` rule flagging `new Intl.NumberFormat`/`Intl.DateTimeFormat` with a string-literal locale outside `shared/utils`.

## Acceptance criteria

- [ ] Changing the locale setting updates percentages, ratios, and month names across the dashboard (live browser check: switch locale, verify the breakdown/comparison/weekday panels and trend axis labels).
- [ ] `MONTH_NAME_FORMATTER` consumers audited first: if any consumer treats month names as bucketing **keys** rather than display, the localization gets a display-only seam and the key path stays stable (name the finding in the ticket on completion).
- [ ] Exactly one module-level locale signal remains, with one store sync point; grep proves no other `syncLocale`-style setters survive.
- [ ] `formatDisplayDate` no longer exists; `date-range-input.component.ts` exports only its component class.
- [ ] The new lint rule fires on a string-literal-locale `Intl` construction outside `shared/utils` (prove with a scratch violation) and the codebase passes clean.
- [ ] Unit tests cover: each `formatPercent` variant per locale, ratio and month-name formatting per locale, formatter memoization (same instance until locale changes).
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Part 2 Option B (DI service) rejected: `formatCurrency` is called from non-DI contexts (ECharts tooltip callbacks, module-level chart config). Option C (pipes-only) rejected: fights the VM-completion direction of the CR4-1 tickets.
- Coordinate with TICKET-STAT-23 (same comparison-panel file); land this first so the panel refactor builds on the shared formatter.
