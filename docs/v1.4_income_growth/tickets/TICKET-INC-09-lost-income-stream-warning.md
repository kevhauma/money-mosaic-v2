# TICKET-INC-09 — Lost income stream warning

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-9 (new)
- **Source story:** user-stories.md §9 — *"As a user, I want to be warned when an income category that used to show up regularly has gone quiet longer than its usual cadence, so a lost income stream (job change, ended contract, lapsed side income) doesn't just silently drop out of my growth trend."*

## Description

Warns when a category that used to show up regularly has gone quiet longer than its usual cadence — a job change, an ended contract, or lapsed side income shouldn't just silently vanish from the growth trend.

## Current situation (as-is)

- No cadence/gap detection exists. The closest precedent for "surface what's missing" is v1.3's [TICKET-STAT-09](../../v1.3_dashboard_insights/tickets/TICKET-STAT-09-uncategorised-spend-visibility.md) (uncategorised-spend visibility), but that's a static snapshot, not a time-series gap detector.

## Desired result (to-be)

- New pure helper `detectIncomeGaps(series, categoriesById, todayBucketKey)` in `core/stats/income-gap-detection.ts`, operating on the **raw** (unsmoothed — a gap is a gap regardless of the smoothing flag) monthly `computeIncomeCategorySeries()` output:
  - For each category, compute its historical cadence: the count of non-zero months among all months since its first non-zero month, up to (but excluding) the most recent 3 months (a trailing exclusion window so the detector doesn't need the gap to already be "over" to flag it).
  - A category with a cadence of at least **75%** non-zero months and at least 6 months of history is treated as "recurring."
  - Flag a gap when a recurring category has had **zero** total in each of the most recent 2 months.
  - Returns `{ categoryId: number; lastSeenBucketKey: string; monthsMissing: number }[]`.
- `IncomeOverviewComponent` renders detected gaps as `mm-alert` callouts (e.g. "Other Income hasn't shown up since April 2026 — usually appears most months").

## Acceptance criteria

- [ ] A category present in ~90%+ of months that then goes quiet for 2+ consecutive recent months is flagged; unit test.
- [ ] A category that's inherently irregular (e.g. present in 40% of months historically) never flags purely for "not this month," since it fails the 75% cadence bar; unit test.
- [ ] Categories with under 6 months of history are never evaluated (too little data to establish a cadence); unit test.
- [ ] A category still actively recurring (present in the most recent month) never flags; unit test.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: seed a monthly-recurring income category, remove its last 2 months of transactions from test data, confirm a callout appears.

## Notes

- Deliberately operates on the raw series, not FR-INC-4's smoothed one — smoothing redistributes a real deposit across months for *display* purposes but must never manufacture a fake non-zero month that hides a real gap.
- Threshold constants (75% cadence, 6-month minimum, 2-month gap) mirror FR-INC-8's fixed-constant approach; same v1.5 tuning-surface follow-up note applies.
