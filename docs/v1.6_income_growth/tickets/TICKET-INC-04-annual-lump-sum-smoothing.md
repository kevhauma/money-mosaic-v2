# TICKET-INC-04 — Annual lump-sum smoothing

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-4 (new)

## User story

As a user, I want to choose which income categories are an annual lump sum (13th month, vacation
pay, a holiday bonus — real income, but deposited once a year), from the Income page's own
settings, so that single deposit doesn't read as a spike on the by-category trend, a false spurt
in the growth-rate panel, or a phantom raise/step-change alert.

## Description

A page-level setting — not a per-category field — so a once-a-year deposit (13th month, vacation
pay, holiday bonus) reads as smoothed-in income on the trend/growth/step-change views, rather than
a monthly spike or a false raise alert. Bundled into a single **Income settings** popup alongside
TICKET-INC-03's category filter and TICKET-INC-12's career start date, so the Income page has one
settings entry point instead of three scattered controls.

## Current situation (as-is)

- `Category` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) has no field for this, and
  this ticket no longer adds one (see Desired result — superseded by the 2026-08-01 revision below).
- `computeIncomeCategorySeries()` (FR-INC-2) returns `{ bucketKeys, series: CategorySeriesEntry[] }`
  — the true per-bucket amount for every category, so a June bonus shows as a one-bucket spike.
- TICKET-INC-03 already established the precedent this ticket now follows exactly: a page-level
  selection persisted as an additive, non-indexed array field on the `appSettings` singleton
  (schema v12), read through `AppSettingsStore`/`AppSettingsRepository`, never a direct `appDb`
  write. `IncomeCategoryFilterComponent` (that ticket) renders its checkbox list in an `mm-dropdown`
  next to the trend chart.
- TICKET-INC-12 mounts its control
  via `mm-page-header`'s existing `[actions]` projected-content slot
  ([page-header.component.html](../../../src/app/shared/ui/page-header/page-header.component.html))
  — not a new slot, as that ticket originally assumed; the slot already existed.
- These two controls currently live in two different places on the page (one beside the chart, one
  in the header) with no shared "settings" concept — this ticket's popup consolidates all three.
- Data management (v1.4) exports/imports whole Dexie rows, so a new `appSettings` field round-trips
  without touching [data-management.repository.ts](../../../src/app/core/data-access/data-management.repository.ts)
  — worth confirming rather than assuming when building.

## Desired result (to-be)

> **Revised 2026-08-01, before any part of this ticket was built.** The original design put the
> flag on `Category` (checkbox in the category-form). It now lives as a page-level setting instead,
> mirroring TICKET-INC-03 exactly, and is surfaced through a single consolidated settings popup
> rather than its own control.

- New optional field on `AppSettings`: `smoothedBonusCategoryIds?: number[]`. Additive, non-indexed
  — **no Dexie version bump**, same reasoning as `excludedIncomeCategoryIds`. Unlike that field,
  this one is a plain **inclusion** list (defaults to `[]`, nothing smoothed until the user opts a
  category in) rather than an exclusion list, since "smooth this category" should never be the
  default for a newly added income category the way "count this category" is.
- `AppSettingsRepository` gains a `setSmoothedBonusCategoryIds()` read-merge-put setter (same shape
  as the existing `excludedIncomeCategoryIds` setter); `IncomeStore` gains a
  `smoothedBonusCategoryIds()` signal and `toggleSmoothedBonusCategory(id: number)` method, mirroring
  `selectedIncomeCategoryIds()`/`toggleIncomeCategory()`. Toggling a category off in TICKET-INC-03's
  filter also drops it from `smoothedBonusCategoryIds` if present, so a deselected category can't
  linger as a smoothing candidate the user can no longer see.
- New pure helper `smoothAnnualLumpSums(trend, smoothedCategoryIds, granularity)` in
  `core/stats/annual-lump-sum-smoothing.ts`: takes `computeIncomeCategorySeries()`'s
  `{ bucketKeys, series }` output; for each series whose category id is in `smoothedCategoryIds`,
  groups its `values` by calendar year (`bucketKeys[i].slice(0, 4)`), sums each year's total, and
  replaces every value in that year with `yearTotal / bucketsInThatYear` — only when
  `granularity === 'month'` (the only granularity where "one big bucket vs. twelve small ones" is
  the actual problem). For `day`/`week`/`quarter` granularity the function is a documented
  pass-through no-op for every category.
- FR-INC-2's chart, FR-INC-5's growth panel, and FR-INC-8's step-change detector all consume
  `smoothAnnualLumpSums(computeIncomeCategorySeries(...), incomeStore.smoothedBonusCategoryIds(), ...)`
  instead of the raw series directly.
- **New `IncomeSettingsComponent`** (`components/income-settings/income-settings.component.{ts,html}`)
  — a single `mm-dropdown` popup triggered from one button projected into `mm-page-header`'s
  existing `[actions]` slot (the same slot TICKET-INC-12's career-start control currently occupies
  directly). Its panel composes, top to bottom:
  1. TICKET-INC-12's existing career-start control (`IncomeCareerStartComponent`), unchanged
     internally — only its mounting location moves, out of the bare header slot and into this panel.
  2. TICKET-INC-03's existing category checklist (`IncomeCategoryFilterComponent`), unchanged
     internally — only its mounting location moves, out from beside the chart into this panel.
  3. A new "Bonus categories to smooth out" checklist — same `mm-label`/checkbox row markup as #2,
     scoped to only the categories currently selected in #2 (a category excluded from "count toward
     income" shouldn't also be offered as a smoothing candidate).
  - `income-overview.component.html` drops the standalone `<app-income-category-filter />` next to
    the chart and the bare header control, replacing both with `<app-income-settings />` in the
    header slot.

## Acceptance criteria

- [ ] `smoothAnnualLumpSums()` preserves each year's category total exactly (sum of smoothed buckets
      in a year ≈ sum of raw buckets in that year, within rounding) — unit test asserts this for a
      category with an all-months-flat pattern plus one spike month.
- [ ] Categories not in `smoothedBonusCategoryIds` pass through completely unchanged
      (reference-equal `values` array, not just numerically equal) — unit test.
- [ ] `granularity !== 'month'` returns the input series unchanged for every category, flagged or
      not.
- [ ] `smoothedBonusCategoryIds` defaults to `[]` for a fresh `appSettings` row — no category is
      smoothed until the user opts one in via the popup.
- [ ] Deselecting a category in the "income categories to include" section also removes it from
      `smoothedBonusCategoryIds` if present; unit test.
- [ ] `IncomeSettingsComponent` hosts all three sections (career start, income categories, bonus
      categories to smooth out) behind one trigger button in the page header; the standalone
      `<app-income-category-filter />` next to the chart and the bare header career-start control
      are both removed from `income-overview.component.html`.
- [ ] `angular.json` bundle budgets not raised; no Dexie version bump (schema stays at whatever
      TICKET-INC-10 lands it on).
- [ ] A `smoothedBonusCategoryIds` value set before an export still round-trips through
      data-management export → import intact.
- [ ] Verified live in the browser: open the Income settings popup, mark "Other Income" as a bonus
      category to smooth out, add a one-off bonus transaction, confirm the FR-INC-2 chart shows it
      spread across the year's months rather than a single spike; confirm the career-start and
      category-filter controls still work identically from inside the popup.

## Notes

- Deliberately query-time (recomputed from raw data on every read) rather than writing smoothed
  values back to transactions — keeps the setting freely toggleable and never mutates real
  transaction amounts. A consequence: marking a category smooths its **whole** history
  retroactively, since the setting isn't a per-transaction fact — documented behaviour, not a bug.
- Gross/net ratio (FR-INC-11) explicitly does **not** use this smoothed series — it needs the real
  amount in the real month to match against that month's entered gross wage.
- **This is a different mechanism from TICKET-INC-10's `SalaryMetadata.bonus`.** This ticket handles
  a bonus that's its own *separately categorized* transaction (smooth the whole category's annual
  total across its months). TICKET-INC-10 handles a bonus *embedded inside the same deposit* as the
  regular salary (no separate transaction/category exists to flag) — it's subtracted from that
  month's total rather than smoothed across the year, and feeds TICKET-INC-11's ratio, not this
  ticket's chart smoothing. A household could need either, both, or neither depending on how their
  payroll actually deposits.
- Supersedes the standalone control placement described in TICKET-INC-03's and TICKET-INC-12's own
  desired-result sections — those tickets' underlying state/logic are unchanged, only where their
  controls are mounted.
