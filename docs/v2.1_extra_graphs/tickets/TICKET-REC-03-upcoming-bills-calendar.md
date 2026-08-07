# TICKET-REC-03 — Upcoming bills: expected payments as a calendar or a list

- **Area:** Recurring
- **Type:** Feature
- **Traceability:** adds **FR-REC-3**, projecting FR-REC-1's series
  ([TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md)) forward. Graduated from gap #3
  of [competitive-analysis.md](../../v9999_ideas/competitive-analysis.md), which argues
  (PocketSmith lesson) recurring detection should be designed "calendar-first … so forecasting can
  consume the same events later". Privacy-mode compliance per
  [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone who gets surprised by debits landing mid-month, I want to see when each detected
recurring payment is expected to hit — on a calendar when I'm thinking about the month's shape,
as a simple date-ordered list when I just want to scan what's next — so I can see what's still
coming before payday instead of finding out from my balance.

## Description

Adds an upcoming-bills section to the Explore page's recurring track, with two views over the
same projected occurrences and a switcher between them: a month-grid bill calendar (browsable
month by month, per-month expected total) and a chronological list grouped by day. A pure
projection function turns detected series into dated expected occurrences over a window; both
views only render its output. Built with CSS grid and daisyUI, no calendar dependency.

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
  - **Two views over the same month's projected occurrences, chosen by a view switcher** (a small
    segmented control in the section header, "Calendar | List"):
    - **Calendar view** (the default): a month grid (CSS grid + daisyUI styling, **no new
      dependency**), Monday-first per EU convention, days outside the month dimmed, today marked.
      Each day cell lists that day's expected payments (label + amount); a crowded cell collapses
      to "+N more" with the full list on the cell's details.
    - **List view**: the same occurrences date-ordered and grouped by day — each day heading with
      its payments (label + amount) beneath, days with nothing expected simply absent, today's
      divider marked. Real list markup, so it doubles as the accessible reading of the data.
  - Both views are projections of the same `projectRecurringOccurrences` output for the visible
    month — switching views can never change *what* is shown, only its shape.
  - A header shows the month name with prev/today/next controls and the month's expected total
    ("€X expected this month") — both apply identically to either view.
  - The visible month **and the chosen view** are session-scoped UI state in `ChartOptionsStore`
    — like the heatmap cycle, they reset (current month, calendar view) on reload by design, and
    do **not** follow the Explore range (this section looks forward from today; the range looks
    backward at data).
  - Amounts through `formatCurrency()`, masked under privacy mode in both views; in calendar view
    a visually-hidden table lists the month's expected occurrences (date → label = amount) per the
    [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md)
    convention, since the grid is not a data table — the list view *is* its own accessible
    representation and needs no mirror.
  - No detected series → the section renders nothing in either view (REC-02's empty state already
    explains why).

## Acceptance criteria

- [ ] `projectRecurringOccurrences` is a pure function in `core/stats/recurring-projection.ts`,
      exported from the barrel; monthly, weekly and yearly series project the right number of
      dated occurrences into a given month window — asserted in unit tests.
- [ ] The section opens in calendar view on the current month by default, with today marked,
      expected payments on their days, and correct Monday-first day alignment.
- [ ] The view switcher swaps to a date-ordered list grouped by day (empty days absent) and back;
      both views show exactly the same occurrences for the visible month — asserted by a spec
      comparing the two renderings' data.
- [ ] Prev/today/next controls navigate months in both views; the visible month **and the chosen
      view** live in `ChartOptionsStore` (session-scoped, in-memory) — not in `appSettings`, not
      in the URL.
- [ ] The month's expected total is shown in both views and equals the sum of the listed
      occurrences.
- [ ] The section ignores the Explore date range; amounts honour privacy mode and
      `formatCurrency()` in both views.
- [ ] With no detected series the section renders nothing in either view.
- [ ] In calendar view a visually-hidden table mirrors the month's expected occurrences; the list
      view is itself accessible list markup and carries no duplicate mirror.
- [ ] No new dependency is added; `angular.json` budgets untouched.
- [ ] Unit tests cover: projection counts per cadence over a window; grid alignment for a month
      starting mid-week; the "+N more" collapse; view switching (same data both ways, choice
      persisted in the store); the list's day grouping and ordering; month navigation via the
      store; privacy masking; the empty case.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the section renders on `/explore`, a known monthly payment
      appears on a plausible upcoming day, month navigation works, and switching to list view
      shows the same payments date-ordered.

## Notes

- **Why two views.** The calendar answers "what does my month look like" (shape, clusters,
  quiet weeks); the list answers "what's next" (scan top to bottom, done) and reads far better in
  a narrow viewport. Both being pure renderings of the same projection keeps the choice purely
  presentational — added 2026-08-07 at the user's request.
- **Projected, not promised.** Every entry is an inference ("expected around the 12th"), and the
  UI copy should say "expected", never "due" — the app has no bill contracts, only rhythm. Date
  jitter means a payment can land a day or two off its cell; that's inherent, not a bug.
- Past days of the current month intentionally show what *was* expected — comparing that against
  what actually arrived is [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md)'s missed-payment
  flag, not this ticket.
- Needs [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md); sits naturally after
  [TICKET-REC-02](./TICKET-REC-02-recurring-payments-panel.md) on the page but does not depend on
  its code.
