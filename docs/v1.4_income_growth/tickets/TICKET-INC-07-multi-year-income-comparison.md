# TICKET-INC-07 — Multi-year income comparison

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-7 (new)
- **Source story:** user-stories.md §9 — *"As a user, I want to compare income across a chosen multi-year span (e.g. last 3, last 5, or all-time), seeing the aggregate change from the first year in the span to the last, so I can answer 'how has my income changed over the last few years' rather than only 'vs. last year'."*

## Description

Lets the user pick a multi-year span (last 3, last 5, or all-time) and see the aggregate change from the span's first year to its last — a longer-horizon complement to FR-INC-6's adjacent-year deltas.

## Current situation (as-is)

- FR-INC-6's `computeYearlyIncomeSummary()` produces per-year totals but only adjacent-year `%`; nothing aggregates across a chosen span.

## Desired result (to-be)

- New pure helper `computeMultiYearIncomeComparison(yearlySummary, span)` in `core/stats/multi-year-income-comparison.ts`, where `span: 3 | 5 | 'all-time'`: takes FR-INC-6's `{ year, total }[]`, picks the last `span` years (or all of them for `'all-time'`), and returns `{ firstYear: string; firstYearTotal: number; lastYear: string; lastYearTotal: number; pctChange: number | null }` — `pctChange` is `null` when `firstYearTotal` is zero or when fewer than 2 years of history exist for the chosen span (falls back to whatever's available, same truncation behaviour as TICKET-STAT-07's `yearsBack` cap).
- `IncomeOverviewComponent` gets a small span selector (segmented control: "3y" / "5y" / "All-time") next to the FR-INC-6 bar chart, driving this comparison's headline figure (e.g. "+18% over the last 3 years").

## Acceptance criteria

- [ ] Reuses `computeYearlyIncomeSummary()`'s output rather than re-deriving totals from transactions — a single source of truth for yearly figures.
- [ ] `'all-time'` spans every year present in the yearly summary, even beyond 5.
- [ ] A dataset with less than the requested span's years of history compares whatever's available (e.g. "5y" selected on 2 years of data compares those 2 years) rather than erroring or padding with zeros; unit test covers this truncation.
- [ ] `pctChange` is `null` (not `±∞%`) when the first year's total is zero.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: switching the span selector updates the headline % without a page reload.

## Notes

- Depends on FR-INC-6 shipping first — consumes its output type directly.
