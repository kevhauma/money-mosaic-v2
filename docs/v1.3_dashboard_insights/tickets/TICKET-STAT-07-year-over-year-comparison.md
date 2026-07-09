# TICKET-STAT-07 — Year-over-year comparison

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** adds FR-STAT-11 (new)
- **Source story:** user-stories.md §6 — *"As a user looking at a month/quarter/year, I want to compare it to the same period in previous years, so I can see whether I'm trending up or down year-over-year rather than just month-over-month."*

## Description

Compare the selected range's income/expense/net to the **same calendar dates**, shifted back 1–3 years (as many as there's transaction history for). Distinct from [TICKET-STAT-04](./TICKET-STAT-04-category-period-comparison.md)'s rolling window: this is calendar-date shifting (Jan 1–Mar 31 vs. Jan 1–Mar 31 last year), not "the preceding same-length period," so it survives ranges that aren't clean calendar periods (e.g. a custom range, or `year-to-date`) and captures seasonal effects a rolling window would miss.

## Current situation (as-is)

- Nothing shifts a range by calendar years; the closest existing preset is `last-year` (the *whole* previous calendar year, not "this range, one year back").
- [period-stats.ts](../../../src/app/core/stats/period-stats.ts) only ever computes one `[from, to]` window at a time.

## Desired result (to-be)

- A new pure helper `shiftRangeByYears(from, to, years)` in `core/stats/year-over-year.ts`: shifts both `from` and `to` back by `years` calendar years, clamping Feb 29 → Feb 28 when the shifted year isn't a leap year.
- A new pure aggregator `computeYearOverYearComparison(transactions, from, to, ownSavingsIbans, yearsBack = 3)` that calls `computePeriodStats()` once for the selected range and once per shifted range (1..`yearsBack` years back, stopping early if a shifted range's `to` predates the earliest transaction), returning `{ current: PeriodStats; priorYears: Array<{ yearsBack: number; from: string; to: string; stats: PeriodStats }> }` plus a `%` delta for income/expense/net vs. the immediately-prior year.
- Dashboard shows this as delta badges on the existing Income/Expense/Net stat cards (e.g. "+12% vs. same period last year") when at least one prior year of comparable data exists, using the same `mm-stat-card` component (`subLabel`) rather than a new primitive — consistent with [TICKET-STAT-05](./TICKET-STAT-05-average-spending-rate.md)'s approach.
- Hidden when no prior-year data exists (e.g. the user's data starts less than a year ago), or when the preset is `all-time` (no meaningful "same period" to shift).

## Acceptance criteria

- [ ] `shiftRangeByYears()` correctly clamps Feb 29 in a leap-year range to Feb 28 in a non-leap target year; unit tests cover a leap-day range, a plain month, and a range spanning New Year's Eve.
- [ ] `computeYearOverYearComparison()` stops requesting years earlier than the dataset's earliest transaction (via the same helper `full-history-range.ts`'s `computeFullHistoryRange` already uses to bound `all-time`), so it never returns a "prior year" of all-zero data pretending to be real.
- [ ] Delta badges render on Income/Expense/Net stat cards only when ≥1 valid prior year exists; a fresh dataset with <1 year of history shows no badges (not a "+∞%"/misleading figure).
- [ ] `all-time` never triggers this comparison (panel/badges hidden).
- [ ] Reuses `computePeriodStats()` per shifted range rather than reimplementing income/expense math.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser on a dataset spanning 2+ years: selecting "This year" shows a delta badge comparing to last year; selecting a custom range inside the first tracked year shows no badge.

## Notes

- `yearsBack = 3` is a soft cap on how many prior years to compute/display, not a requirement to always show 3 — most datasets won't have that much history yet, and the acceptance criteria already require truncating to what's available.
