# TICKET-INC-07 — Multi-year income comparison

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-7 (new)

## User story

As a user, I want to compare income across a chosen multi-year span (e.g. last 3, last 5, or all-time), seeing the aggregate change from the first year in the span to the last, so I can answer 'how has my income changed over the last few years' rather than only 'vs. last year'.

## Description

Lets the user pick a multi-year span (last 3, last 5, or all-time) and see the aggregate change from the span's first year to its last — a longer-horizon complement to FR-INC-6's adjacent-year deltas.

## Current situation (as-is)

- FR-INC-6's `computeYearlyIncomeSummary()` produces per-year totals but only adjacent-year `%`; nothing aggregates across a chosen span.
- TICKET-STAT-07 has since shipped: [year-over-year.ts](../../../src/app/core/stats/year-over-year.ts)'s `computeYearOverYearComparison(..., yearsBack = 3)` already truncates to however many prior years actually exist — the truncation behaviour this ticket mirrors is real code now, not a planned one.
- [granularity-picker.component.ts](../../../src/app/shared/ui/granularity-picker/granularity-picker.component.ts) (`mm-granularity-picker`) is the shipped precedent for a small stateless segmented toggle: the caller owns the value, the component just emits `valueChange`. The span selector should follow that shape (and, if it grows a second use, become its own `shared/ui` primitive rather than inline markup).

## Desired result (to-be)

- New pure helper `computeMultiYearIncomeComparison(yearlySummary, span)` in `core/stats/multi-year-income-comparison.ts`, where `span: 3 | 5 | 'all-time'`: takes FR-INC-6's `{ year, total }[]`, picks the last `span` years (or all of them for `'all-time'`), and returns `{ firstYear: string; firstYearTotal: number; lastYear: string; lastYearTotal: number; pctChange: number | null }` — `pctChange` is `null` when `firstYearTotal` is zero or when fewer than 2 years of history exist for the chosen span (falls back to whatever's available, same truncation behaviour as TICKET-STAT-07's `yearsBack` cap).
- `IncomeOverviewComponent` gets a small span selector (segmented control: "3y" / "5y" / "All-time") next to the FR-INC-6 bar chart, driving this comparison's headline figure (e.g. "+18% over the last 3 years").

## Acceptance criteria

**Implementation notes, 2026-08-01 — three deviations from the to-be above, recorded as built:**

1. **Only complete calendar years are comparable.** The to-be section didn't mention partial years, but FR-INC-6 shipped with `isPartialYear` and refuses to put a percentage on one, and `IncomeStore.incomeRange`'s `to` is *today* (`computeFullHistoryRange`) — so the newest year is in progress every month except December. Anchoring the span on it would print a double-digit collapse eleven months a year and contradict the `—` the bar above it already shows. `computeMultiYearIncomeComparison` therefore drops partial years before taking the span, and `span` counts *comparable* years rather than calendar ones.
2. **Returns `MultiYearIncomeComparison | null`**, not the bare object: a history with no complete year has no first/last year to name. `pctChange: null` stays reserved for the two cases the to-be describes (a single comparable year, a zero first-year total).
3. **The span selector and headline live on `IncomeYearlyPanelComponent`, not `IncomeOverviewComponent`.** The ticket predates TICKET-INC-06, which put the yearly bar chart in its own child panel; "next to the FR-INC-6 bar chart" is that panel now.

- [x] Reuses `computeYearlyIncomeSummary()`'s output rather than re-deriving totals from transactions — a single source of truth for yearly figures. (`computeMultiYearIncomeComparison(yearlySummary, span)` in [multi-year-income-comparison.ts](../../../src/app/core/stats/multi-year-income-comparison.ts) takes `YearlyIncomeEntry[]` and never sees a `Transaction`; the panel passes its own `yearlyIncome()` signal — the same one the chart renders.)
- [x] `'all-time'` spans every year present in the yearly summary, even beyond 5. (Spec `spans every year present for all-time, even beyond 5` — six years of data, `firstYear: '2020'`.)
- [x] A dataset with less than the requested span's years of history compares whatever's available (e.g. "5y" selected on 2 years of data compares those 2 years) rather than erroring or padding with zeros; unit test covers this truncation. (Specs `compares the two years available when 5 years are requested, rather than erroring` and `does not pad the missing years with zeros, which would read as a surge`; component-level `compares whatever history exists when the span asks for more years than there are` renders `2024 → 2025`, `+20%`.)
- [x] `pctChange` is `null` (not `±∞%`) when the first year's total is zero. (Spec `is null (not ±∞%) when the first year’s total is zero`.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`; the change adds one pure helper and reuses the shipped `mm-stat-card`.)
- [ ] Verified live in the browser: switching the span selector updates the headline % without a page reload. — **not done:** the user waived live browser checks for this v1.6 batch. Covered instead by the component spec `updates the headline when the span changes, without re-rendering the page`, which clicks "All-time" and asserts the rendered headline flips from `+25%` / `2023 → 2025` to `+50%` / `2022 → 2025`.

## Notes

- Depends on FR-INC-6 shipping first — consumes its output type directly.
