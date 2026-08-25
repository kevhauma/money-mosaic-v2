# TICKET-INC-09 — Lost income stream warning

- **Area:** Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
- **Type:** Feature
- **Traceability:** adds FR-INC-9 (new)

## User story

As a user, I want to be warned when an income category that used to show up regularly has gone quiet longer than its usual cadence, so a lost income stream (job change, ended contract, lapsed side income) doesn't just silently drop out of my growth trend.

## Description

Warns when a category that used to show up regularly has gone quiet longer than its usual cadence — a job change, an ended contract, or lapsed side income shouldn't just silently vanish from the growth trend.

## Current situation (as-is)

- No cadence/gap detection exists. The closest precedent for "surface what's missing" is v1.3's [TICKET-STAT-09](../../dashboard/tickets/TICKET-STAT-09-uncategorised-spend-visibility.md) (uncategorised-spend visibility), now shipped as part of the dashboard's [action-queue-panel](../../../src/app/feature-dashboard/components/action-queue-panel/action-queue-panel.component.ts) — still a static snapshot, not a time-series gap detector.

## Desired result (to-be)

- New pure helper `detectIncomeGaps(trend, categoriesById, todayBucketKey)` in `core/stats/income-gap-detection.ts`, operating on the **raw** (unsmoothed — a gap is a gap regardless of the smoothing flag) monthly `{ bucketKeys, series }` output of `computeIncomeCategorySeries()`:
  - For each category, compute its historical cadence: the count of non-zero months among all months since its first non-zero month, up to (but excluding) the most recent 3 months (a trailing exclusion window so the detector doesn't need the gap to already be "over" to flag it).
  - A category with a cadence of at least **75%** non-zero months and at least 6 months of history is treated as "recurring."
  - Flag a gap when a recurring category has had **zero** total in each of the most recent 2 months.
  - Returns `{ categoryId: number; lastSeenBucketKey: string; monthsMissing: number }[]`.
- `IncomeOverviewComponent` renders detected gaps as `mm-alert` callouts (e.g. "Other Income hasn't shown up since April 2026 — usually appears most months").

## Acceptance criteria

**Implementation notes, 2026-08-01 — two deviations from the to-be above, recorded as built:**

1. **The signature is `detectIncomeGaps(trend, granularity, throughBucketKey)`**, not
   `(trend, categoriesById, todayBucketKey)`. Two changes, for two reasons:
   - `categoriesById` is gone. The helper returns `categoryId`s; naming them is presentation, and
     `buildGapWarning()` in the component does it — same split TICKET-INC-08 landed on.
   - `todayBucketKey` became `throughBucketKey`, and it is the newest **complete** month
     (`lastCompleteBucketKey()`), not today's. Judged against today's bucket, a salary paid on the
     25th is "missing" for the first three weeks of every month, so the warning would fire every
     month and mean nothing. A `granularity` guard was added alongside it, matching FR-INC-8's:
     the 75% / 6-month / 2-month constants are months, and mean something else in weeks.
2. **The gap window is the most recent complete months, so a 2-month gap needs 2 complete silent
   months.** Same point as above from the user's side: the warning appears one month later than a
   naive reading of the to-be would put it, and in exchange never cries wolf mid-month.

- [x] A category present in ~90%+ of months that then goes quiet for 2+ consecutive recent months is flagged; unit test. (Specs `flags a monthly category that has been silent for two months`, `flags a category present in ~90% of its months, not only a perfect one` (8/9 months) and `counts every silent month, not just the two that triggered it` in [income-gap-detection.spec.ts](../../../src/app/core/stats/income-gap-detection.spec.ts).)
- [x] A category that's inherently irregular (e.g. present in 40% of months historically) never flags purely for "not this month," since it fails the 75% cadence bar; unit test. (Spec `never flags an inherently irregular category` — paid in 5 of 9 months, ~44%. `excludes the trailing months from the cadence, so the gap cannot hide itself` covers the opposite failure, where the silence would drag the cadence under its own bar.)
- [x] Categories with under 6 months of history are never evaluated (too little data to establish a cadence); unit test. (Specs `never evaluates a category with under six months of history` and `counts history from the category’s first payment, not the start of the chart`.)
- [x] A category still actively recurring (present in the most recent month) never flags; unit test. (Specs `never flags a category that is still arriving` and `never flags on a single quiet month — that is a late payment, not a lost stream`; the pair `ignores buckets past the newest complete month` / `flags the same history once the silent month is complete` covers implementation note 2.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`; the change adds one pure helper and a component built from the shipped `mm-alert`.)
- [ ] Verified live in the browser: seed a monthly-recurring income category, remove its last 2 months of transactions from test data, confirm a callout appears. — **not done:** the user waived live browser checks for this v1.6 batch. Covered instead by the component spec, which renders the real component over ten monthly deposits with the last two months absent and asserts one "hasn't shown up since" alert — then zero once those two months are present.

## Notes

- Deliberately operates on the raw series, not FR-INC-4's smoothed one — smoothing redistributes a real deposit across months for *display* purposes but must never manufacture a fake non-zero month that hides a real gap.
- Threshold constants (75% cadence, 6-month minimum, 2-month gap) mirror FR-INC-8's fixed-constant approach; the same unscheduled tuning-surface follow-up note applies (originally written as "v1.7", which is now the Loan tracker).
- Dates in the callout copy go through the `localeDate` pipe / locale-aware formatting (TICKET-SET-04), not a hardcoded `en-US`-shaped month name.
