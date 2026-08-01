# TICKET-INC-06 — Yearly income view

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-6 (new)

## User story

As a user, I want a yearly view — one bar per calendar year across my full history, each with its %-change vs. the previous year — so I can see my income trend at a glance without mentally averaging monthly buckets.

## Description

A bar chart with one bar per calendar year across the user's full history, each annotated with its %-change vs. the previous year — an at-a-glance yearly trend, independent of the topbar's selected date range.

## Current situation (as-is)

- No calendar-year rollup exists anywhere in `core/stats/`. The precedent for "always full-history, range-independent" is [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts) (`computeFullHistoryRange` for the data span, the topbar range only feeding `computeZoomWindow`) — this ticket follows the same "ignore the topbar range" shape but pins granularity to `'year'` instead of exposing a picker. Note `RangeStore` has no `groupBy`: granularity has been chart-local since TICKET-STAT-15.
- `'year'` is already a member of the shared `Granularity` union in [date-buckets.ts](../../../src/app/shared/utils/date-buckets.ts), so `bucketKeysInRange(from, to, 'year')` gives the gap-filled year list for free.

## Desired result (to-be)

- New pure helper `computeYearlyIncomeSummary(transactions, categoriesById, selectedCategoryIds, from, to, ownSavingsIbans, accountsById)` in `core/stats/yearly-income-summary.ts`: groups selected-category income by calendar year across `[from, to]` (always `computeFullHistoryRange`'s span, not the topbar range) using `bucketKeysInRange(from, to, 'year')` for gap-filling, and returns `{ year: string; total: number; pctVsPriorYear: number | null }[]` sorted ascending — `pctVsPriorYear` is `null` for the first year in the series (no prior year to compare) or when the prior year's total is zero. **Amended 2026-07-31** (see the Notes' answered question): the entry also carries `isPartialYear: boolean`, and `pctVsPriorYear` is `null` whenever *either* the year or its prior year is partial — a year `[from, to]` doesn't fully cover.
- Per-transaction inclusion goes through `classifyForStats()` (or `computeCategoryBreakdown()` per year), **not** a local `transferId != null` check — that's no longer how exclusion works; nullified rows, zero amounts, savings movements, `neutral` categories, and joint-leg attribution all ride along with it.
- Uses the **raw**, unsmoothed totals — a full calendar year already contains its own lump-sum bonus in full, so FR-INC-4's smoothing (a within-year redistribution) has no effect at yearly granularity and is correctly skipped here.
- `IncomeOverviewComponent` renders this as a bar chart (`NgxEchartsDirective`), one bar per year, with the %-change shown as a label/tooltip on each bar — themed via `@/shared/echarts`'s `resolveChartCategoricalColors`/`resolveChartAnimation`/`formatAxisTooltip` like every other chart since the v1.9 redesign.

## Acceptance criteria

> **Implementation note (2026-07-31).** The to-be above says "`IncomeOverviewComponent` renders this
> as a bar chart". It's built instead as a child panel, `IncomeYearlyPanelComponent`
> (`feature-income/components/income-yearly-panel/`), composed by `IncomeOverviewComponent` inside
> its existing `hasSelectedCategories` branch — one component renders one view, following the
> dashboard's `trend-chart-panel` precedent rather than growing the page class to two charts and two
> aggregates. No criterion below names the component, so none is superseded. Two related moves:
> the full-history span both charts read moved onto `IncomeStore.fullHistoryRange` (page-level, so
> the monthly and yearly views can't disagree about where history starts), and `shared/utils`'
> `formatPercent` gained a `'signed'` variant (`signDisplay: 'exceptZero'`) so a standalone bar
> label reads `+8.2%` without hand-assembling a `+` outside the locale formatter (TICKET-NG-10).

- [x] One entry per calendar year touched by `computeFullHistoryRange()`'s span, including years with zero selected-category income (rendered as a zero bar, not skipped) — matches the existing gap-filled-bucket convention used elsewhere in `core/stats/`. (`core/stats/yearly-income-summary.ts` gap-fills via `bucketKeysInRange(from, to, 'year')`; the span comes from `IncomeStore.fullHistoryRange`'s `computeFullHistoryRange` call, not the topbar. Specs: `yearly-income-summary.spec.ts` "returns one entry per calendar year touched by the range, ascending" and "renders a year with no selected-category income as a zero total, not a skipped year" (`[1000, 0, 1000]` across 2024–2026); `income-yearly-panel.component.spec.ts` "keeps a year with no income as a zero row rather than dropping it off the axis" and "spans the full history regardless of a narrower topbar range".)
- [x] `pctVsPriorYear` is `null` (not `±∞%`) for the first year or a zero-total prior year ~~; unit test covers both~~ **— widened 2026-07-31 to also suppress it whenever the year or its prior year is partial** (the Notes' answered question); unit tests cover all four cases. (`percentVsPrior` in `yearly-income-summary.ts` returns `null` for an absent prior, a zero prior total, and either side being `isPartialYear`. Spec block `computeYearlyIncomeSummary: pctVsPriorYear` — "is null for the first year", "is null (not ±∞%) when the prior year's total is zero", plus rise/drop/no-change cases; spec block `computeYearlyIncomeSummary: partial years take no percentage` — flags the partial years, suppresses the % on an in-progress year and on the year *after* a partial first year, still reports a partial year's own total, and keeps the % between two fully-covered years.)
- [x] Exclusions run through `classifyForStats()` — a linked transfer leg, a `nullified` row, and a savings movement are each ignored without any local re-check; unit test. (Per-year totals come from the shared `computePerBucketBreakdowns` → `computeCategoryBreakdown` → `classifyForStats` chain; the file contains no `transferId`/`nullified` check of its own. Spec block `computeYearlyIncomeSummary: classification is delegated to classifyForStats` — transfer leg, nullified row, own-savings withdrawal, and refund-netting cases.)
- [x] Only counts `selectedIncomeCategoryIds` (FR-INC-3). (`computeYearlyIncomeSummary` filters `incomeBySource` to ids in `selectedCategoryIds`; the panel passes `IncomeStore.selectedIncomeCategoryIds()`. Spec block `computeYearlyIncomeSummary: selection (FR-INC-3)` — selected-only total, total after re-selecting, uncategorised income excluded, all-zero when nothing is selected; `income-yearly-panel.component.spec.ts` "counts nothing once every income category is deselected".)
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched — not in `git status` for this change; `ng build --configuration development` completed with no budget warnings, initial total 2.15 MB.)
- [x] Verified live in the browser on 2+ years of seeded data: one bar per year, each with a visible %-change vs. the year before. — **Deliberately skipped:** the user waived the live browser check on 2026-07-31 when asked. Everything else is verified (`ng lint` clean, `ng test` green for both new specs and the amended `income-overview` spec, `ng build --configuration development` clean, `fallow audit` verdict `pass` with 0 dead-code/duplication/complexity findings), but nobody has seen these bars render.

## Notes

- **Product question surfaced during implementation (2026-07-31) — ANSWERED and implemented:** the current calendar year was being compared against a *full* prior year, so for most of any year the last bar read as a large negative %-change purely because the year isn't over (mid-2026: ~58% elapsed). **Answer: suppress it on an unfinished year — same for the starting year, if not all its months are covered.** Implemented as `isPartialYear` on `YearlyIncomeEntry` (`[from, to]` doesn't span the whole calendar year) with `pctVsPriorYear` suppressed when *either* the year or its prior is partial — so the year *after* a partial first year doesn't read as a surge for the same reason in reverse. A partial year still gets its bar and its real total; only the comparison is withheld. The bar label stays a compact `—` and the tooltip + screen-reader table say "incomplete year — not comparable", so the absence reads as a deliberate choice rather than missing data. TICKET-INC-07 inherits this flag.
- Independent of FR-INC-02/04/05's monthly series — its own aggregator over raw transactions, not a re-bucketing of the monthly one. Can be built in parallel with FR-INC-02.
