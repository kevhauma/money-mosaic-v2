# TICKET-STAT-19 — Show period date range in category comparison bar tooltips

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** extends FR-STAT-8 (TICKET-STAT-04's category period comparison panel)

## User story

As a user reviewing the category period comparison panel, I want each bar's hover tooltip to show which period it represents (e.g. "W27 2026" or "July 2026"), so I can tell at a glance which calendar period a given bar's amount belongs to without having to count bars or drill down.

## Description

Each bar in the category comparison panel's mini chart currently only shows its formatted total (e.g. "€120.00") on hover. Add the period's date range to that tooltip, formatted the same way the global date-range picker already formats calendar-aligned ranges — `W<number> <year>` for a week, `<month> <year>` for a month, falling back to the raw date span for periods that don't line up with a calendar unit.

## Current situation (as-is)

- [category-comparison-panel.component.html:76-88](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.html) renders each bar as an `<a>` with a daisyUI `tooltip` class and `[attr.data-tip]="bar.formattedTotal"` — the tooltip shows only the euro amount, not which period the bar is.
- [category-comparison-panel.component.ts:79-92](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.ts) builds each `ComparisonBarVm` from `comparison.window[index]` (a `{ from, to, isSelected }` period from `computeComparisonWindow()`), but only reads `period.from` (as the track key) — the period's `to` isn't otherwise used, and no formatted label is derived from either.
- [date-buckets.ts:313-314](../../../src/app/core/stats/date-buckets.ts) already exports `formatAlignedRangeLabel(from, to): string | null`, returning `"W27 2026"` / `"July 2026"` / `"Q3 2026"` / `"2026"` for a range that exactly matches a calendar week/month/quarter/year, or `null` for an arbitrary span. This is the exact helper the global date-range picker uses ([date-range-input.component.ts:57](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts)) to render its own label, falling back to `formatDisplayDate(from) – formatDisplayDate(to)` when `null`.

## Desired result (to-be)

- `ComparisonBarVm` gains a `periodLabel: string` field, computed per bar as `formatAlignedRangeLabel(period.from, period.to) ?? \`${formatDisplayDate(period.from)} – ${formatDisplayDate(period.to)}\`` — reusing the exact same helper and fallback the global date-range picker already uses, so the two surfaces stay visually consistent (e.g. a monthly comparison window shows "July 2026" bars, matching what the topbar would show if you navigated to that month).
- The tooltip (`data-tip`) shows both pieces of information, e.g. `"July 2026 · €120.00"`, so the amount is still the primary, most-scannable part of the tooltip.
- No visual change to the bars themselves (height, colour, selected/unselected styling) — only the tooltip content changes.

## Acceptance criteria

- [ ] `category-comparison-panel.component.ts` computes `periodLabel` per bar using `formatAlignedRangeLabel` (falling back to formatted `from`–`to` dates), not a re-implementation of the week/month formatting logic.
- [ ] The bar's `data-tip` includes the period label alongside the existing formatted total.
- [ ] Unit tests in `category-comparison-panel.component.spec.ts` cover: a week-aligned window period renders `"W<n> <year>"` in the label, a month-aligned window period renders `"<Month> <year>"`, and a non-calendar-aligned (day-count/rolling) window period falls back to the formatted date range.
- [ ] No change to `computeComparisonWindow()` or `computeCategoryPeriodComparison()` — this is presentation-only, reusing the window periods' existing `from`/`to`.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: hovering a bar in the category comparison panel for a monthly range shows the month/year in the tooltip; for a weekly range shows `W<n> <year>`.

## Notes

- This mirrors the label format the global date-range picker already renders via `formatAlignedRangeLabel` — intentionally not inventing a new format so the app has one consistent way of naming a calendar-aligned period.
- Scoped to the category comparison panel's bar tooltips only; other panels with period-based hovers (if any) are out of scope for this ticket.
