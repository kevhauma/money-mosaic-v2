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

**Implementation notes, 2026-08-01 — two deviations from the to-be above, recorded as built:**

1. **`computeGrossNetRatio(trend, salaryMetadataByMonth)` — no `selectedCategoryIds` parameter.**
   The selection is applied upstream by `computeIncomeCategorySeries`, so the series the helper is
   handed already contains only the counted categories; taking the id set again would let the two
   disagree. Its second argument is the `Map` keyed by `YYYY-MM` that `IncomeStore` already exposes
   (`salaryMetadataByMonth`), rather than a flat array the helper would have to index itself.
2. **The ratio gets its own small panel, not an overlay on the growth panel.** The to-be left the
   choice open. A secondary percentage axis on a currency chart is two units in one frame, and the
   growth panel is two stat cards rather than a chart to overlay onto. The panel also earns its own
   empty state, which an overlay couldn't have: with no gross wage entered anywhere, it says what to
   do instead of drawing an all-gap line.

- [x] Uses the **raw**, unsmoothed net series — a month with a real gross entry must be compared against what actually happened that month, not a smoothed/redistributed figure; unit test confirms a flagged-annual-bonus category's ratio spikes in its real deposit month rather than being flattened. (The panel reads `IncomeStore.rawIncomeTrend()`. Specs `keeps a lump sum in the month it was actually deposited` and `is what the smoothed series would have flattened away` in [gross-net-ratio.spec.ts](../../../src/app/core/stats/gross-net-ratio.spec.ts) run the same data through both series and assert 14,000 vs 3,000 for the deposit month; the panel spec repeats it end-to-end in `keeps a lump sum in its real month even when that category is smoothed elsewhere (FR-INC-4)`.)
- [x] Months without a `SalaryMetadata` entry return `gross: null, ratio: null`, never `0`/`Infinity`/`NaN`; unit test. (Specs `reports gross and ratio as null, never 0 or Infinity`, `never yields NaN or Infinity for a gross wage of zero`, and `treats a bonus-only entry as having no gross to compare against`; the chart renders those months as `null` with `connectNulls: false`, asserted by `breaks the line at a month with no gross wage rather than dipping to zero`.)
- [x] A month's `bonus` (when set) is subtracted from `net` before the ratio is computed, so a bonus embedded in the salary deposit doesn't inflate that month's take-home ratio; unit test with a month whose `SalaryMetadata.bonus` is a meaningful fraction of that month's total selected-category income. (Spec `subtracts the bonus from net before dividing` — a 4,160 deposit of which 2,000 was holiday pay — paired with the negative control `would otherwise report a take-home rate the user never had`, which shows the unadjusted figure exceeding 100%.)
- [x] A month with `SalaryMetadata` but no `bonus` set produces the same `net`/`ratio` as before this revision (regression test). (Spec `leaves a month with an entry but no bonus exactly as it was`, and `applies the bonus only to its own month`.)
- [x] Only counts `selectedIncomeCategoryIds` (FR-INC-3) toward `net`, before the bonus subtraction. (Spec `counts only the selected categories, because the series it is given already excludes the rest`; end-to-end in the panel spec's `drops a deselected category from net (FR-INC-3)`. See implementation note 1 for where the selection is applied.)
- [x] Ratio is only ever computed at month granularity (matches `salaryMetadata`'s `yearMonth` key) — since TICKET-STAT-15 granularity is a **chart-local signal**, not a `RangeStore.groupBy`, so this panel either pins its own granularity signal to `'month'` or hides itself when the trend chart's picker is on another bucket size (implementer's choice; document whichever is picked). — **Pinned, and there is nothing to hide from:** the Income page ships no granularity picker at all (TICKET-INC-02's divergence), so every series on it is bucketed by `INCOME_GRANULARITY`, fixed to `'month'`. Documented in the panel's class doc.
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`.)
- [ ] Verified live in the browser: enter a gross wage for a month with real salary income, confirm the ratio renders (e.g. ~72%); a month with no gross entry shows a gap, not a broken/zero value. — **not done:** the user waived live browser checks for this v1.6 batch. Covered instead by the panel spec, which renders the real component over a 2,160 payslip against a 3,000 gross entry and asserts `72%` in the chart's companion table, then `—` for the following month with no entry.

## Notes

- Depends on FR-INC-10 (gross entries) and FR-INC-3 (category selection); can be built any time after both land.
- Deliberately ignores FR-INC-4's smoothing (see acceptance criteria) — this is the one FR-INC panel where the *actual* month matters more than a clean-looking trend line.
