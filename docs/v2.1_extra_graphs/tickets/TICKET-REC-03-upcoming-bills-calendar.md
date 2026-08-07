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

**Implementation note, 2026-08-07 — three departures from the to-be section, all deliberate.**
(1) The single `app-bills-calendar` became a **shell plus two presentational children**,
`app-bills-month-grid` and `app-bills-day-list`: with both views in one template it measured
CRITICAL on fallow's template complexity (12 cyclomatic / 35 cognitive), and "one component renders
one view" is the convention anyway. The shell still owns the month, the view and the projection, so
the "both views render the same projection" guarantee is unchanged — strengthened, in fact, since
neither child can derive occurrences of its own. (2) The grid projects across its **whole
Monday-first window**, not just the month: a leading/trailing cell is a real day, and one rendering
empty while a payment is expected on it would be a lie the dimming does not excuse. Everything
month-scoped — the header total, the list, the hidden table — reads a month-filtered subset.
(3) Detection moved out of the component into a shared `RecurringSeriesStore` (see the last
acceptance criterion).

- [x] `projectRecurringOccurrences` is a pure function in `core/stats/recurring-projection.ts`,
      exported from the barrel; monthly, weekly and yearly series project the right number of
      dated occurrences into a given month window — asserted in unit tests.
      (`recurring-projection.spec.ts`, 8 cases: monthly once, weekly five times across August,
      quarterly only in its own months, yearly one month in twelve, plus calendar-stepping —
      a 31st projected into February lands on the 28th and gets its 31st back in March.)
- [x] The section opens in calendar view on the current month by default, with today marked,
      expected payments on their days, and correct Monday-first day alignment. (Specs: *"opens in
      calendar view on whole Monday-first weeks…"* — July 2026 renders 7 headers + 35 cells with
      1 July in the third column and 29 June dimmed — *"places an expected payment on its own
      day…"*, and *"marks today in both views"*.)
- [x] The view switcher swaps to a date-ordered list grouped by day (empty days absent) and back;
      both views show exactly the same occurrences for the visible month — asserted by a spec
      comparing the two renderings' data. (Spec: *"shows the same occurrences in list view,
      date-ordered and with empty days absent"* — it collects the in-month cells' labels and the
      list's labels and asserts every calendar label appears in the list, the list being the
      superset because the grid collapses a crowded day to "+N more".)
- [x] Prev/today/next controls navigate months in both views; the visible month **and the chosen
      view** live in `ChartOptionsStore` (session-scoped, in-memory) — not in `appSettings`, not
      in the URL. (Specs: *"navigates months through the session store, and back to today"*,
      *"rolls the year over at December, rather than producing a month 13"*, and *"keeps the chosen
      view in the session store rather than local state"*. `chart-options-control.spec.ts` adds
      nine cases for `chartVisibleMonth`/`chartBillsView`, mirroring the existing controls'
      block — including "never records the seed as a choice", which matters most here because the
      month seed is clock-derived.)
- [x] The month's expected total is shown in both views and equals the sum of the listed
      occurrences. (Rendered in the shell above the view switch, so it is view-independent by
      construction; summed from `monthOccurrences`, the same month-scoped signal the list and the
      hidden table read. The view-comparison spec asserts the total is byte-identical either way.)
- [x] The section ignores the Explore date range; amounts honour privacy mode and
      `formatCurrency()` in both views. (Spec: *"ignores the Explore date range entirely"* — the
      component injects no `RangeStore` at all — and *"blurs every amount under privacy mode…"*.)
- [x] With no detected series the section renders nothing in either view. (Spec: *"renders nothing
      at all when no series was detected"* — the host's text content is empty.)
- [x] In calendar view a visually-hidden table mirrors the month's expected occurrences; the list
      view is itself accessible list markup and carries no duplicate mirror. (Spec: *"drops the
      visually-hidden mirror in list view, which is its own accessible reading"*. The grid itself
      is `aria-hidden="true"` so the mirror is the *single* accessible reading — without that a
      screen reader hears every payment twice and the mirror's privacy-mode withholding is undone
      by the visible cells being announced anyway.)
- [x] No new dependency is added; `angular.json` budgets untouched. (Grid is CSS `grid-cols-7`;
      `package.json` and `angular.json` are not in the diff.)
- [x] Unit tests cover: projection counts per cadence over a window; grid alignment for a month
      starting mid-week; the "+N more" collapse; view switching (same data both ways, choice
      persisted in the store); the list's day grouping and ordering; month navigation via the
      store; privacy masking; the empty case. (8 projection cases + 12 component cases + 9 control
      cases.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (2026-08-07: "All
      files pass linting"; 241 spec files / 2514 tests passed; "Application bundle generation
      complete", no budget warning.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`:
      maintainability 92.5 "good", dead files/exports 0.0%, **0 duplicate clone groups** and no
      CRITICAL in the new code after the fixes below. `conventions-reviewer` raised twelve
      findings, all applied — the significant one being a **privacy leak**: the day cell's native
      `title` tooltip is painted by the browser outside the `mm-privacy-blur` box, so it showed
      every amount in cleartext under privacy mode; `fullDayTitle` now carries `hidden` instead,
      asserted in the privacy spec. Also applied: the grid `aria-hidden` above; `HIDDEN_AMOUNT`
      resolved in the class instead of `?? 'hidden'` in a binding; chevron icons instead of literal
      `‹`/`›` glyphs; `mondayFirstWeekdayIndex` exported from `calendar-cycles.ts` instead of
      copied; `shiftMonth` built on `shiftRangeByCalendarUnit` with its inverted sign documented
      once; typography utilities dropped from `mm-text` call sites; the components barrel
      re-alphabetised; prettier run. The two clone groups fallow flagged against `period-window.ts`
      are gone too — `parseIsoDate`/`formatIsoDate`/`MS_PER_DAY` are now exported from
      `date-buckets.ts` and imported rather than re-declared.)
- [x] **Added criterion** — detection is derived once per page, not once per section. The new
      `feature-explore/recurring-series.store.ts` holds the shared `series`/`today`/`hasSeries`
      derivation that REC-02's panel and this section both read; before it, `/explore` ran
      `detectRecurringPayments` over the whole history twice per render, and REC-04 would have made
      it three times. This is the condition the Explore page's "no store, on purpose" note reserved
      a store for, so its absence is no longer the right call.
- [ ] Verified live in the browser: the section renders on `/explore`, a known monthly payment
      appears on a plausible upcoming day, month navigation works, and switching to list view
      shows the same payments date-ordered. — **not done: the user asked for this track to be
      worked without browser checks.** Left open rather than ticked. The grid's *appearance* — cell
      height, how a crowded day reads, whether the dimmed out-of-month days are legible — is the
      part no spec here speaks for.

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
