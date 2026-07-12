# TICKET-STAT-05 — Average spending rate (per day/week/month)

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** adds FR-STAT-9 (new)

## User story

As a user, I want to see my average spending per day/week/month for the selected range, so I have a normalised rate I can compare across ranges of different lengths.

## Description

Show a normalised spending rate for the selected range — average expense per day, per week, and per month — so a 9-day range and a 9-month range are comparable on the same footing. Not every unit makes sense for every range length, so units are shown only when they'd represent a genuine average rather than restating the total.

## Current situation (as-is)

- [period-stats.ts](../../../src/app/core/stats/period-stats.ts) `computePeriodStats()` returns a single `expense` total for `[from, to]` — no rate, no notion of the range's length.
- The dashboard's stat cards ([dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)) show raw `income`/`expense`/`net`/`savingsRate` only.

## Desired result (to-be)

- A new pure helper `computeSpendingRate(transactions, from, to, ownSavingsIbans)` in `core/stats/spending-rate.ts`, reusing `computePeriodStats().expense` for the total and `bucketKeysInRange()` (already in [date-buckets.ts](../../../src/app/core/stats/date-buckets.ts)) to count the number of day/week/month buckets touched by `[from, to]` — dividing the total by that count gives `avgPerDay`/`avgPerWeek`/`avgPerMonth`.
- **Gating rule**: a unit is only returned (non-`null`) when the range spans **at least 2** buckets of that granularity — averaging 1 bucket just restates the total, which isn't a useful "average." So a 1-week range returns `avgPerDay` only; a 1-month range returns `avgPerDay` + `avgPerWeek`; a 1-year+ range returns all three. `all-time` gets whichever units its span supports.
- Dashboard shows the applicable rate(s) as a compact card/row (e.g. "€42/day · €294/week" for a month-long range), next to the existing Income/Expense/Net/Savings-rate stat cards — reusing `mm-stat-card` (`subLabel` can carry a secondary unit) rather than introducing a new visual primitive.
- Rates use the same `ownSavingsIbans` exclusion as `computePeriodStats`/`computeCategoryBreakdown` so savings movements don't inflate the "spending" rate.

## Acceptance criteria

- [x] `computeSpendingRate()` returns `{ avgPerDay: number; avgPerWeek: number | null; avgPerMonth: number | null }`, gated per the ≥2-buckets rule above; unit tests cover a 3-day range (day only), an 10-day range (day + week), a 2-month range (day + week + month), and `all-time` with a short real history (day only, since week/month buckets may not reach 2).
- [x] Values are computed from the same `expense` figure as `computePeriodStats()` (no divergent expense definition) — a shared test asserts `avgPerDay * bucketKeysInRange(..., 'day').length ≈ periodStats.expense` (within rounding).
- [x] Savings movements are excluded exactly as in `computePeriodStats`/`computeCategoryBreakdown` (shared `ownSavingsIbans` set, no duplicated exclusion logic).
- [x] Dashboard renders the applicable rate(s) next to the existing stat-card row; hidden units (gated out) simply don't render — no "—" placeholder clutter.
- [x] `angular.json` bundle budgets are not raised.
- [x] Verified live in the browser: "This month" shows day+week rates; "This year" shows day+week+month rates; "This week" shows day rate only.

## Notes

- Deliberately not "average per period the current `groupBy` granularity" — `groupBy` is a chart-bucketing choice the user can override independently of range length (FR-STAT-7), and using it here would make the rate change when the user just wants a different chart view. The gating rule is driven by the range's own length, not `RangeStore.groupBy()`.
