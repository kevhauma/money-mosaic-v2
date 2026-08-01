# TICKET-INC-11 — Gross/net ratio

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-11 (new)

## User story

As a user, I want a gross/net ratio per month (my selected income categories' net total ÷ that month's entered gross wage), trended alongside the growth charts, so I can see if my take-home rate is drifting — months without a gross entry show no ratio rather than a misleading one.

## Description

A per-month ratio of net income actually received (from the user's selected income categories) against the gross wage entered for that month, trended alongside the growth charts — surfaces a drifting take-home rate that "net income is up" alone would hide.

## Current situation (as-is)

- FR-INC-10 provides `SalaryMetadata` (one per `yearMonth`, `grossWage` + optional `bonus`);
  FR-INC-2's `computeIncomeCategorySeries()` provides the raw monthly net series. Nothing combines
  them yet.
- **2026-08-01:** FR-INC-10's `SalaryMetadata` gained a `bonus` field — the portion of a month's
  deposit that was a 13th month/vacation/holiday bonus embedded in the regular salary transaction.
  This ticket is where that figure gets used: a bonus baked into the deposit inflates `net` for that
  month, which would otherwise read as a temporarily higher take-home ratio that isn't real.

## Desired result (to-be)

- New pure helper `computeGrossNetRatio(trend, salaryMetadata, selectedCategoryIds)` in
  `core/stats/gross-net-ratio.ts`: for each **raw** (unsmoothed — see Notes) monthly bucket in
  `computeIncomeCategorySeries()`'s `{ bucketKeys, series }` output, sums the selected categories'
  values at that index, looks up that month's `SalaryMetadata` entry by `bucketKey` (`'YYYY-MM'`),
  and subtracts that entry's `bonus` (if any) from the summed total before computing the ratio.
  Returns `{ bucketKey: string; net: number; gross: number | null; ratio: number | null }[]` —
  `net` is already bonus-adjusted, `ratio = net / gross`, and both `gross`/`ratio` are `null` (not
  `0`/`Infinity`) for a month with no entered `SalaryMetadata` row. A month with a `SalaryMetadata`
  row but no `bonus` behaves exactly as before this revision.
- `IncomeOverviewComponent` renders this as a line overlay (secondary y-axis, percentage) on the
  growth-rate panel (FR-INC-5) or its own small chart — months with `ratio === null` show a gap in
  the line, not a dip to zero.

## Acceptance criteria

- [ ] Uses the **raw**, unsmoothed net series — a month with a real gross entry must be compared against what actually happened that month, not a smoothed/redistributed figure; unit test confirms a flagged-annual-bonus category's ratio spikes in its real deposit month rather than being flattened.
- [ ] Months without a `SalaryMetadata` entry return `gross: null, ratio: null`, never `0`/`Infinity`/`NaN`; unit test.
- [ ] A month's `bonus` (when set) is subtracted from `net` before the ratio is computed, so a bonus embedded in the salary deposit doesn't inflate that month's take-home ratio; unit test with a month whose `SalaryMetadata.bonus` is a meaningful fraction of that month's total selected-category income.
- [ ] A month with `SalaryMetadata` but no `bonus` set produces the same `net`/`ratio` as before this revision (regression test).
- [ ] Only counts `selectedIncomeCategoryIds` (FR-INC-3) toward `net`, before the bonus subtraction.
- [ ] Ratio is only ever computed at month granularity (matches `salaryMetadata`'s `yearMonth` key) — since TICKET-STAT-15 granularity is a **chart-local signal**, not a `RangeStore.groupBy`, so this panel either pins its own granularity signal to `'month'` or hides itself when the trend chart's picker is on another bucket size (implementer's choice; document whichever is picked).
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: enter a gross wage for a month with real salary income, confirm the ratio renders (e.g. ~72%); a month with no gross entry shows a gap, not a broken/zero value.

## Notes

- Depends on FR-INC-10 (gross entries) and FR-INC-3 (category selection); can be built any time after both land.
- Deliberately ignores FR-INC-4's smoothing (see acceptance criteria) — this is the one FR-INC panel where the *actual* month matters more than a clean-looking trend line.
