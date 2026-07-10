# TICKET-STAT-04 — Top-5 category period-over-period comparison

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** adds FR-STAT-8 (new); reuses FR-STAT-3's category breakdown

## User story

As a user reviewing my spending, I want to see my top-5 expense categories for the selected range compared against the 4 nearest same-length periods (average, highest, lowest), so I can tell whether this period's spend in a category is normal or an outlier.

## Description

For the 5 largest expense categories in the selected range (by `computeCategoryBreakdown().expenseByCategory`, already sorted by total), show each category's spend across a **5-period comparison window**: the selected period plus 4 more periods of the same length, with average/highest/lowest across the window and the selected period's delta vs. that average.

## The comparison window rule (defines the periods being compared)

A "period" is a range the same length as the currently-selected range, shifted by whole periods:

- **Calendar-aligned presets** (`this-week`, `this-month`, `last-month`, `this-quarter`, `last-quarter`, `this-year`, `last-year`) shift by whole calendar units (week/month/quarter/year) so periods land on real calendar boundaries — a shifted month is a full different-length month, not "30 days back" (avoids Feb/Jan-length drift).
- **Everything else** (`last-31-days`, `last-365-days`, `year-to-date`, `custom`) shifts by the **exact day-count** of `[from, to]` as a rolling window.
- **`all-time` is excluded** — there's no "previous all-time" to compare against; the panel is hidden for that preset.

**Anchor rule** — call the period containing today `currentPeriod` and the selected range's period `selectedPeriod`:
- If `selectedPeriod` is within 4 periods of `currentPeriod` (inclusive), the window's most recent period is `currentPeriod` — i.e. the window always reaches up to "now" when the selection is recent.
- Otherwise the window's most recent period is `selectedPeriod` itself (a plain trailing window).
- Either way the window is exactly 5 consecutive periods ending at that most-recent period.

Worked examples (matches the product ask verbatim): selecting **this month** → window is [this month, and the 4 preceding months] (selected = most recent in window, all 4 comparisons are previous). Selecting **last month** → `currentPeriod` (this month) is only 1 period ahead, so the window is [this month, last month (selected), and 3 months before that] — 1 "next" period (this month) + 3 "previous" periods, exactly as the product ask describes. Selecting a period more than 4 periods in the past (e.g. a custom range from 8 months ago) → plain trailing window of that period + the 4 before it.

## Current situation (as-is)

- [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts) `computeCategoryBreakdown()` computes totals for exactly one `[from, to]` range — no notion of adjacent periods.
- [category-breakdown-panel.component.ts](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) shows a top-5 list + donut for the single selected range only, no historical context.
- There is no period-shifting helper anywhere in `core/stats` — [date-buckets.ts](../../../src/app/core/stats/date-buckets.ts) resolves presets to a single `[from, to]` relative to "today," it doesn't shift an arbitrary existing range by whole periods.

## Desired result (to-be)

- A new pure helper `computeComparisonWindow(range, todayIso, periodCount = 5)` in `core/stats/period-window.ts`, taking the currently-resolved `{ preset, from, to }` (from `RangeStore`) and returning an ordered array of `{ from: string; to: string; isSelected: boolean }`, applying the anchor rule above. Calendar-unit shifting is delegated to small helpers colocated with the existing `resolvePresetRange`-style month/quarter/year/week math in `date-buckets.ts` (reused, not reimplemented); day-count shifting is a simple date-arithmetic loop.
- A new pure aggregator `computeCategoryPeriodComparison(transactions, categoriesById, window, ownSavingsIbans)` in `core/stats/category-period-comparison.ts` that: takes the top-5 category ids from the *selected* period's `computeCategoryBreakdown()`, then calls `computeCategoryBreakdown()` once per window period to get that category's total in each period, and returns per category `{ categoryId, name, color, perPeriod: number[], average, highest, lowest, selectedTotal, deltaVsAveragePct }`.
- A new dashboard component (e.g. `category-comparison-panel`) rendering the 5 categories, each as a small multi-bar/sparkline across the window periods plus average/highest/lowest and a "+18% vs your 5-period average" style badge, colour-coded (over-average = warning tone, under = success tone, consistent with existing daisyUI semantic colours). Placed on the dashboard grid alongside `category-breakdown-panel`.
- Hidden (or shows an explanatory empty state) when the selected preset is `all-time`, or when fewer than 2 periods in the window have any transaction data (nothing meaningful to compare).
- Reuses the existing drill-down pattern (`buildTransactionDrilldownParams`) so clicking a category/period bar navigates to `/transactions` filtered to that category + that period's range.

## Acceptance criteria

- [ ] `computeComparisonWindow()` implements the anchor rule exactly as specified above; unit tests cover: selecting the current period (trailing-only window), selecting the immediately-preceding period (1 forward + 3 back), selecting a period > 4 periods old (plain trailing), and each preset family (calendar-unit vs. day-count shifting), including a month-length-drift check (e.g. selecting a 31-day month doesn't misalign when shifted to a 28/29-day February).
- [ ] `all-time` never produces a window (returns `null`/empty and the UI hides the panel).
- [ ] `computeCategoryPeriodComparison()` selects its 5 categories from the **selected period's** top expense categories (not the window average's), so the set of categories shown doesn't change just because a neighbouring period happened to spend more elsewhere.
- [ ] Average/highest/lowest are computed only over periods that have data (a genuinely empty period — e.g. before the account existed — contributes a `0`/is-excluded per a documented, consistent choice; tests assert whichever is chosen).
- [ ] "Biggest movers" (folded in from the parked suggestion): the panel additionally surfaces which of the 5 categories has the largest positive and largest negative delta vs. its own average, each rendered as a callout the deltas are already computed, this is just a sort — no new aggregate).
- [ ] No stored data is mutated; `computeCategoryBreakdown()` is reused per window period rather than reimplementing category totals.
- [ ] Every bar/period in the panel is drill-down-linked to `/transactions` with the right `categoryId` + that period's `from`/`to`.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: selecting "This month" shows the top-5 categories with 4 trailing comparison periods; selecting "Last month" shows 1 forward (this month) + 3 trailing periods; switching to "All-time" hides the panel without an error.

## Notes

- This ticket does not change `computeCategoryBreakdown()` itself — it's called once per window period, so v1.1's joint-account share-weighting (once it ships) applies automatically with no extra work here.
- Keep `periodCount` a named constant (not hard-coded `5`/`4`) so a future ticket can make it configurable without touching the anchor-rule logic.
