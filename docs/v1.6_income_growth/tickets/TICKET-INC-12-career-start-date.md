# TICKET-INC-12 — Career start date anchors the income page

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-12 (new); re-anchors FR-INC-2/5/6/7

## User story

As a user, I want to set the date my career actually started — separately from where my imported transaction history happens to begin — so my income trend and growth figures start where my working life started, instead of at whatever month my oldest bank export covers.

## Description

Adds one user-set date, the **career start date**, persisted on the `appSettings` singleton and editable from a control near the Income page header. When set, it **filters the Income page's data to start at that date** — every chart, panel and growth figure on `/income` covers `[careerStartDate, today]` instead of `[first transaction, today]`, so student-era income, a pre-career partial year, or a back-imported account with an early opening balance stop distorting the growth story. Nothing outside `/income` changes.

## Current situation (as-is)

- `IncomeStore.fullHistoryRange` ([income.store.ts:46](../../../src/app/feature-income/income.store.ts#L46)) is the single span every panel on `/income` shares, and it is computed purely from the data: `computeFullHistoryRange()` ([full-history-range.ts](../../../src/app/core/stats/full-history-range.ts)) takes the earliest of each active account's `openingBalanceDate` and its oldest transaction's `bookingDate`. There is no way to say "my history goes back further than my career does" (or vice-versa).
- Consequences today:
  - `computeYearlyIncomeSummary()` ([yearly-income-summary.ts](../../../src/app/core/stats/yearly-income-summary.ts)) gap-fills every calendar year in that span, so years before the user earned anything render as zero bars, and the first real year is flagged `isPartialYear` only because the *dataset* starts mid-year — not because the career did.
  - The monthly chart (`computeIncomeCategorySeries`, [income-category-series.ts](../../../src/app/core/stats/income-category-series.ts)) carries the same leading dead zone.
  - TICKET-INC-05's period-over-period / YoY growth and TICKET-INC-07's multi-year comparison both inherit this span, so their earliest comparison window can be a stretch of non-career data.
- `AppSettings` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) already carries optional, non-indexed fields (`primaryColor`, `locale`, `currencySymbol`, `excludedIncomeCategoryIds`) written through `AppSettingsRepository`'s read-merge-put setters ([app-settings.repository.ts](../../../src/app/core/data-access/app-settings.repository.ts)) and exposed by `AppSettingsStore` — the established home for exactly this kind of single scalar setting.
- `mm-page-header` ([page-header.component.ts](../../../src/app/shared/ui/page-header/page-header.component.ts)) takes `title`/`subtitle` inputs only — it has no content slot for a trailing control, so the Income page header currently can't host one.

## Desired result (to-be)

- New optional field `careerStartDate?: string` (ISO `YYYY-MM-DD`) on `AppSettings`, with a `setCareerStartDate()` read-merge-put setter on `AppSettingsRepository` and a matching method + signal on `AppSettingsStore`. **Additive, non-indexed — no Dexie version bump** (same reasoning as `excludedIncomeCategoryIds`).
- `IncomeStore` gains an `incomeRange` computed that clamps `fullHistoryRange` by the career start date: `from = max(fullHistoryRange.from, careerStartDate)` when set, otherwise `fullHistoryRange.from` unchanged. `to` is untouched. Every panel on `/income` reads `incomeRange` instead of `fullHistoryRange`.
- A small date control near the Income page header lets the user set and clear the date, with a short hint explaining it's the start of their working life, not of their data. `mm-page-header` gets an optional projected-content slot (`<ng-content>`) so the control sits in the header rather than being bolted above the first panel.
- Unset is the default and behaves exactly as today — no migration, no prompt, no inferred value.

## Acceptance criteria

- [ ] `careerStartDate` persists across a reload and is written through `AppSettingsStore` → `AppSettingsRepository`, never a direct `appDb.appSettings` write from a component or store.
- [ ] No Dexie `.version()` bump is added — the field is optional and non-indexed, matching the `excludedIncomeCategoryIds` precedent.
- [ ] With the date unset, every figure on `/income` is byte-for-byte what it is today (`incomeRange === fullHistoryRange`).
- [ ] With the date set **after** the first transaction, the monthly chart and yearly panel both start at the career start date; pre-career years no longer appear as zero bars.
- [ ] With the date set **before** the first transaction, the range is unchanged — the setting narrows the window, it never invents history the data doesn't have.
- [ ] A career start date in the future (or after the last transaction) is rejected in the UI with a visible validation message and is not persisted.
- [ ] Clearing the control removes the setting and restores the full-history span.
- [ ] The date is rendered through `localeDate` and the control respects the app's locale setting (TICKET-SET-03/04).
- [ ] Unit tests cover: unset (range unchanged), set-after-first-transaction (range clamped), set-before-first-transaction (range unchanged), set-to-a-future-date (rejected), and the repository setter round-tripping the field without clobbering other `AppSettings` fields.
- [ ] `mm-page-header`'s new content slot is optional — existing pages that pass no content render unchanged; a spec covers both.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified with the fallow skill and the coding-conventions skill.
- [ ] Verified live in the browser: setting a career start date visibly shortens the Income page's monthly chart and yearly panel, and clearing it restores them.

## Notes

- **Scope is the Income page only.** The dashboard, account detail charts and the topbar range are untouched — this is an income-growth anchor, not a global data cut-off. If it later proves useful elsewhere, that's a separate ticket.
- **Placement in the build order:** independent of the remaining INC chain — it only touches `IncomeStore`'s range, which INC-01/02/03/06 already ship. It's cheapest to land right after TICKET-INC-06, so the yearly view (the panel where a leading run of zero bars is most visible) benefits immediately and INC-07's multi-year comparison inherits the clamped span for free rather than being retrofitted.
- Deliberately **not** inferred (no "your first salary transaction looks like month X") — consistent with this version's stated principle of no new inferred classification (see [../overview.md](../overview.md)'s FR-INC-3/FR-INC-4 rationale).
- `isPartialYear` semantics are unchanged: a career starting in June still makes that year partial and therefore uncomparable — which is correct, and now correct *for the right reason*.
- Related: TICKET-INC-05 (growth-rate panel) and TICKET-INC-07 (multi-year comparison) both consume the range this ticket clamps; neither needs changing if they read `IncomeStore`'s range signal rather than recomputing their own.
