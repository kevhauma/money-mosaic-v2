# TICKET-STAT-06 — Weekday vs. weekend spending split

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** adds FR-STAT-10 (new)

## User story

As a user, I want to see how much I spend on weekdays vs. weekends, so I can tell whether my spending habits differ by day type.

## Description

Split the selected range's expense into **weekday** (Mon–Fri) and **weekend** (Sat–Sun) totals, each normalised to an average-per-day-of-that-type so a range with 22 weekdays and 8 weekend days is compared fairly rather than by raw totals.

## Current situation (as-is)

- No day-of-week classification exists anywhere in `core/stats`; `Transaction.bookingDate` is only ever grouped by the day/week/month/quarter buckets in [date-buckets.ts](../../../src/app/core/stats/date-buckets.ts), never by weekday/weekend.

## Desired result (to-be)

- A new pure helper `computeWeekdayWeekendSplit(transactions, from, to, ownSavingsIbans)` in `core/stats/weekday-weekend-split.ts` returning `{ weekday: { total, dayCount, avgPerDay }, weekend: { total, dayCount, avgPerDay } }`. `dayCount` is the number of **calendar days** of that type within `[from, to]` (not just days with transactions), so a weekday with zero spend still counts toward the average denominator. Day-of-week is computed on the UTC calendar date (same convention as `bucketKeyForDate`'s ISO-week math) to stay consistent with the rest of `core/stats`.
- Excludes transfers and savings movements exactly like `computePeriodStats`/`computeCategoryBreakdown` (shared `ownSavingsIbans` set + `transferId` check).
- Dashboard shows this as a small two-bar comparison (weekday avg/day vs. weekend avg/day) with the ratio (e.g. "1.6× more per day on weekends"), placed near the spending-rate card from [TICKET-STAT-05](./TICKET-STAT-05-average-spending-rate.md) since both are "rate" framings of the same range.

## Acceptance criteria

- [ ] `computeWeekdayWeekendSplit()` correctly classifies Sat/Sun as weekend across a range that starts/ends mid-week; unit tests cover a range with an uneven weekday/weekend day count (e.g. 9 days spanning 6 weekdays + 3 weekend days) and assert both the totals and the per-day averages.
- [ ] `dayCount` counts calendar days regardless of transaction presence (a weekday with no spend still lowers `avgPerDay`) — asserted directly.
- [ ] Transfers and savings movements are excluded using the same predicates as `computePeriodStats`, not a re-implementation.
- [ ] Ranges shorter than 2 calendar days (or `all-time` with insufficient history) fall back to a documented behaviour (e.g. hide the panel rather than divide by a 0/1 day count) — asserted in a test.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser on a range spanning at least one full week: weekday/weekend totals and the ratio render and drill-down-link (via `buildTransactionDrilldownParams`, filtered by the range) to `/transactions`.

## Notes

- Deliberately simple Sat/Sun split rather than a per-locale "business days" calendar (public holidays, region-specific weekends) — out of scope; the app has no locale/holiday data source today.
