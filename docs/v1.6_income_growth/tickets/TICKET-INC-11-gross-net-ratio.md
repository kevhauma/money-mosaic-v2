# TICKET-INC-11 — Gross/net ratio

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-11 (new)

## User story

As a user, I want a gross/net ratio per month (my selected income categories' net total ÷ that month's entered gross wage), trended alongside the growth charts, so I can see if my take-home rate is drifting — months without a gross entry show no ratio rather than a misleading one.

## Description

A per-month ratio of net income actually received (from the user's selected income categories) against the gross wage entered for that month, trended alongside the growth charts — surfaces a drifting take-home rate that "net income is up" alone would hide.

## Current situation (as-is)

- FR-INC-10 provides `grossWageEntries` (one per `yearMonth`); FR-INC-2's `computeIncomeCategorySeries()` provides the raw monthly net series. Nothing combines them yet.

## Desired result (to-be)

- New pure helper `computeGrossNetRatio(series, grossWageEntries, selectedCategoryIds)` in `core/stats/gross-net-ratio.ts`: for each **raw** (unsmoothed — see Notes) monthly bucket in `series`, sums the selected categories' totals, looks up that month's `grossWageEntries` entry by `bucketKey` (`'YYYY-MM'`), and returns `{ bucketKey: string; net: number; gross: number | null; ratio: number | null }[]` — `ratio = net / gross`, and both `gross`/`ratio` are `null` (not `0`/`Infinity`) for a month with no entered gross figure.
- `IncomeOverviewComponent` renders this as a line overlay (secondary y-axis, percentage) on the growth-rate panel (FR-INC-5) or its own small chart — months with `ratio === null` show a gap in the line, not a dip to zero.

## Acceptance criteria

- [ ] Uses the **raw**, unsmoothed net series — a month with a real gross entry must be compared against what actually happened that month, not a smoothed/redistributed figure; unit test confirms a flagged-annual-bonus category's ratio spikes in its real deposit month rather than being flattened.
- [ ] Months without a `grossWageEntries` entry return `gross: null, ratio: null`, never `0`/`Infinity`/`NaN`; unit test.
- [ ] Only counts `selectedIncomeCategoryIds` (FR-INC-3) toward `net`.
- [ ] Ratio is only ever computed at month granularity (matches `grossWageEntries`' `yearMonth` key) — the chart forces `groupBy = 'month'` while this panel is visible, or hides the panel entirely at other granularities (implementer's choice; document whichever is picked).
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: enter a gross wage for a month with real salary income, confirm the ratio renders (e.g. ~72%); a month with no gross entry shows a gap, not a broken/zero value.

## Notes

- Depends on FR-INC-10 (gross entries) and FR-INC-3 (category selection); can be built any time after both land.
- Deliberately ignores FR-INC-4's smoothing (see acceptance criteria) — this is the one FR-INC panel where the *actual* month matters more than a clean-looking trend line.
