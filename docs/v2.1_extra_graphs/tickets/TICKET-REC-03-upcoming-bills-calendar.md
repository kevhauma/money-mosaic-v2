# TICKET-REC-03 — Upcoming bills calendar: expected payments on the days they'll land

- **Area:** Recurring
- **Type:** Feature
- **Traceability:** adds **FR-REC-3**, projecting FR-REC-1's series
  ([TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md)) forward. Graduated from gap #3
  of [competitive-analysis.md](../../v9999_ideas/competitive-analysis.md), which argues
  (PocketSmith lesson) recurring detection should be designed "calendar-first … so forecasting can
  consume the same events later". Privacy-mode compliance per
  [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone who gets surprised by debits landing mid-month, I want a calendar showing when each
detected recurring payment is expected to hit, so I can see what's still coming before payday
instead of finding out from my balance.

## Description

Adds a month-grid bill calendar to the Explore page's recurring section: a pure projection
function turns detected series into dated expected occurrences over a window, and a calendar
component places them on their days — browsable month by month, with a per-month expected total.
Built with CSS grid and daisyUI, no calendar dependency.

## Current situation (as-is)

- [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md) produces one
  `nextExpectedDate` per series — a list, not a timeline, and only one occurrence deep.
- No calendar UI exists anywhere in the app; the closest thing is the date-range picker's month
  grid, which picks dates rather than displaying events.
- The two session-scoped chart options so far (heatmap cycle, Sankey grouping) live in
  `ChartOptionsStore` ([chart-options.store.ts](../../../src/app/core/state/chart-options.store.ts),
  TICKET-STAT-27) — the established home for in-memory per-chart UI state.

## Desired result (to-be)

- New pure `core/stats/recurring-projection.ts`:
  ```ts
  projectRecurringOccurrences(series, fromIso, toIso): ProjectedOccurrence[]
  // { seriesKey, label, categoryId, date, amount }[] — one entry per expected hit in the window
  ```
  It steps each series forward from its `nextExpectedDate` by its cadence interval through the
  window (a weekly series lands ~4 times in a month, a yearly one usually 0), exported from
  [core/stats/index.ts](../../../src/app/core/stats/index.ts). **The event shape is the point**:
  dated, amounted, series-keyed occurrences are exactly what a future cash-flow forecast (gap #4
  of the competitive analysis) would consume, so it lives in `core/stats/`, not inside the
  component.
- New `app-bills-calendar` under `feature-explore/components/bills-calendar/`, `OnPush`, rendered
  beside/below the recurring payments panel on `/explore`:
  - A month grid (CSS grid + daisyUI styling, **no new dependency**), Monday-first per EU
    convention, days outside the month dimmed, today marked.
  - Each day cell lists that day's expected payments (label + amount); a crowded cell collapses to
    "+N more" with the full list on the cell's details.
  - A header shows the month name with prev/today/next controls, and the month's expected total
    ("€X expected this month").
  - The visible month is session-scoped UI state in `ChartOptionsStore` — like the heatmap cycle,
    it resets to the current month on reload by design, and does **not** follow the Explore range
    (the calendar looks forward from today; the range looks backward at data).
  - Amounts through `formatCurrency()`, masked under privacy mode; a visually-hidden table lists
    the month's expected occurrences (date → label = amount) per the
    [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md)
    convention, since the grid itself is not a data table.
  - No detected series → the calendar section renders nothing (REC-02's empty state already
    explains why).

## Acceptance criteria

- [ ] `projectRecurringOccurrences` is a pure function in `core/stats/recurring-projection.ts`,
      exported from the barrel; monthly, weekly and yearly series project the right number of
      dated occurrences into a given month window — asserted in unit tests.
- [ ] The calendar renders the current month by default with today marked, expected payments on
      their days, and correct Monday-first day alignment.
- [ ] Prev/today/next controls navigate months; the visible month lives in `ChartOptionsStore`
      (session-scoped, in-memory) — not in `appSettings`, not in the URL.
- [ ] The month's expected total is shown and equals the sum of the listed occurrences.
- [ ] The calendar ignores the Explore date range; amounts honour privacy mode and
      `formatCurrency()`.
- [ ] With no detected series the calendar section renders nothing.
- [ ] A visually-hidden table mirrors the month's expected occurrences.
- [ ] No new dependency is added; `angular.json` budgets untouched.
- [ ] Unit tests cover: projection counts per cadence over a window; grid alignment for a month
      starting mid-week; the "+N more" collapse; month navigation via the store; privacy masking;
      the empty case.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the calendar renders on `/explore`, a known monthly payment
      appears on a plausible upcoming day, and month navigation works.

## Notes

- **Projected, not promised.** Every entry is an inference ("expected around the 12th"), and the
  UI copy should say "expected", never "due" — the app has no bill contracts, only rhythm. Date
  jitter means a payment can land a day or two off its cell; that's inherent, not a bug.
- Past days of the current month intentionally show what *was* expected — comparing that against
  what actually arrived is [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md)'s missed-payment
  flag, not this ticket.
- Needs [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md); sits naturally after
  [TICKET-REC-02](./TICKET-REC-02-recurring-payments-panel.md) on the page but does not depend on
  its code.
