# TICKET-FUT-07 — Projected net worth: what my balance looks like as each goal gets bought

- **Area:** Forecast
- **Type:** Feature
- **Traceability:** adds **FR-FUT-5**, consuming FR-FUT-1's velocity and FR-FUT-4's ETAs
  ([TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md)). Accessible figure table per
  [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md);
  privacy-mode compliance per
  [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone about to commit to a purchase, I want to see my projected net worth month by month with
each goal's purchase knocked out of it, so I can see whether buying the first thing leaves me
somewhere I'm comfortable with.

## Description

A line chart on `/future`: net worth projected forward from today at the measured saving rate, with
a step down at each goal's ETA for the money actually spent, so the sawtooth shows what the plan
costs rather than just when it completes.

## Current situation (as-is)

- [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md) produces a date per goal but
  renders it only as text on a row — the shape of the balance between those dates is invisible.
- `AccountsStore.netWorth()` ([accounts.store.ts](../../../src/app/core/state/accounts.store.ts))
  is the single point-in-time figure; the Dashboard shows it as a stat card.
- **There is no net-worth-over-time series in the app.**
  [`computeAccountBalanceHistory`](../../../src/app/core/stats/account-balance-history.ts) is
  explicitly *not* net worth — its doc comment records TICKET-ACC-07's decision that it takes no
  `JointLegContext` and never calls `resolveContribution`, so a joint account's ownership share,
  neutral partner inflows and attribution overrides are all excluded by design.
- [TICKET-FUT-03](./TICKET-FUT-03-future-page-scaffold.md) already provides
  `provideEchartsCore({ echarts })` at route level, so no provider wiring is needed here.
- The shared ECharts theme helpers, tooltip formatter and bucketed axis option live in
  [`shared/echarts`](../../../src/app/shared/echarts); every existing chart registers its modules
  once in that shared setup rather than per component.

## Desired result (to-be)

- New `app-net-worth-projection-chart` under
  `feature-future/components/net-worth-projection-chart/`, `OnPush`, rendered on `/future` below
  the goals section, exported via the feature's components barrel.
- **Forward-only projection**, monthly buckets from today to the last goal's ETA plus a few months
  of headroom (or a fixed horizon when no goal has an ETA):
  - month 0 is exactly `AccountsStore.netWorth()`, so the chart and the Dashboard's stat card agree
    on day zero by construction;
  - each subsequent month adds `SavingVelocity.perMonth`;
  - at each goal's `affordableOn`, the balance steps **down** by that goal's `targetAmount` — the
    purchase actually happens in this picture.
- A marked point and label per goal at its ETA ("Camera · €1.800"), so the sawtooth is readable
  without a tooltip.
- A horizontal reference line at `safetyNetAmount` when it is non-zero, making "this is the floor I
  said I wouldn't cross" visible.
- Tooltip per month: projected balance, and which goal (if any) is bought that month.
- **The `safetyNetAmount` floor is respected, not crossed**: because FUT-05 only schedules a goal once
  the balance above the safety net covers it, the projected line can never dip below the safety net — the
  spec asserts this rather than assuming it.
- Degenerate states drawn honestly, not as a flat line pretending to be a forecast: velocity ≤ 0
  renders a declining line with an explicit caption, and insufficient history / no goals render
  `mm-empty-state` with the same copy the goals section uses.
- Ships the visually-hidden figure table (month, projected balance, goal bought) per TICKET-STAT-20,
  and every amount — chart labels, tooltip, table — masks under privacy mode.
- Reads `AccountsStore`/`GoalsStore`/`ForecastSettingsStore`/`TransactionsStore` from
  `@/core/state`; the projection itself is a pure function in `core/stats/` (extending
  `goal-affordability.ts` or a sibling `net-worth-projection.ts`), clock-free with `today` passed
  in.

## Acceptance criteria

- [x] The chart's first point equals `AccountsStore.netWorth()` exactly — asserted against the
      store, not a literal. (Spec "starts the series at exactly AccountsStore.netWorth()" reads the
      store and compares, and checks the figure table's first row through `formatCurrency`. Live:
      August 2026 reads €16.898,26 — the same figure as the Dashboard's stat card.)
- [x] Between goal purchases the line rises by `perMonth` per month; at each goal's `affordableOn`
      it drops by that goal's `targetAmount`. (`computeNetWorthProjection` + its 10-case spec;
      component spec "rises by the measured rate between purchases and steps down at the goal's
      ETA" asserts both deltas against the store's own `perMonth`.)
- [x] Each goal is marked and labelled at its ETA; a goal with no ETA
      (`never-at-this-rate`) is not drawn on the chart, and the caption says how many were omitted.
      (Specs "labels the month a goal is bought, and nothing on the others" and "says in the caption
      how many goals were left off, and does not plot them" — a €5.000.000 goal is absent from the
      plotted purchases and counted in "1 goal is not drawn".)
      **Divergence, recorded when it was made:** a goal that is affordable *today* has no
      `affordableOn`, and the literal reading of this criterion would leave it off the line — which
      would put the chart in contradiction with the rows above it, since FUT-05 already charges
      goal 2's ETA for goal 1's price. Those goals are therefore drawn too, on the first plotted
      month-end. Only `never-at-this-rate` is omitted, which is what the criterion's own parenthesis
      says.
- [x] The projected balance never falls below `safetyNetAmount` (asserted with a non-zero safety net).
      (Aggregate spec "never dips below the safety net when the purchase dates come from the
      affordability walk" and component spec "never dips below a non-zero safety net", both looping
      every point. Live: with a €4.000 net the line bottoms out on the floor and turns back up.)
- [x] A non-zero safety net draws its reference line; a zero safety net draws none. (Spec "draws the
      safety net as its own dashed line only when one is set" — two series vs one. Live: the dashed
      floor appears at €4.000 and disappears at 0.)
- [x] The tooltip reports the month's projected balance and names the goal bought that month when
      there is one. (Spec "reports the projected balance in the tooltip, and names the goal bought
      that month", asserting both strings exactly.)
- [x] Velocity ≤ 0 draws a declining line with an explicit caption; no goals or insufficient
      history render the empty state instead of a chart. (Spec "draws a declining line with an
      explicit caption when the rate is negative" asserts the line falls *and* the chart is still
      rendered; an `it.each` covers the two empty states asserting `div[echarts]` is absent.)
- [x] The visually-hidden figure table lists every projected month with its balance and any goal
      bought, per TICKET-STAT-20. (Spec "ships the screen-reader figure table, matching the plotted
      series month for month" — row count equals the projection's length. Live: the table reads
      "September 2026 · €1,498.36 · Kitchen (€16,000.00), Bike (€1,000.00)".)
- [x] Every amount honours privacy mode — chart labels, tooltip and the figure table. (Withheld
      rather than blurred, per TICKET-STAT-29: everything here is data handed to echarts or clipped
      into a 1px `sr-only` box, where a CSS filter paints nothing. Specs assert the label, the
      tooltip, the y-axis formatter and every table row collapse to `HIDDEN_AMOUNT_TEXT`. Live: the
      axis ticks read "hidden".)
- [x] The projection is a pure, clock-free function in `core/stats/`; the component imports no
      repository or Dexie, and adds no ECharts provider of its own (FUT-03's route-level one is
      used). (`net-worth-projection.ts` takes `today` as a parameter — proved by a two-`today` spec;
      the component injects only stores, and `future.routes.ts` still holds the only
      `provideEchartsCore`.)
- [x] Unit tests cover: the first point equalling net worth; the per-month rise; the step down at an
      ETA; two goals stepping down on different months; the safety net floor holding; goals without an
      ETA being omitted and counted in the caption; velocity ≤ 0; the empty states; privacy masking;
      and the figure table's contents matching the plotted series. (10 aggregate cases, 7 chart-option
      cases, 10 component cases.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched — ECharts stays in this feature's lazy chunk, and no new charting dependency
      is added. (Lint clean; 2891 tests / 263 files green; `--verbose` build still lists
      `future-overview-component` under **Lazy chunk files** with `Initial total` at 2.16 MB.
      **No new echarts modules either**: `markPoint`/`markLine` were avoided deliberately in favour
      of a point `label` and one constant-valued series, so `echarts-setup.ts` is untouched. One
      run showed the project's known `import-wizard` moving flake; it passed on re-run.)
- [x] Verified live in the browser: with real data and two goals, the sawtooth appears, the labels
      land on the right months, and the figures match the goal rows above. (Two rounds. The first
      showed the purchase label centred on its point and hanging off the left edge of the grid, and
      two adjacent labels overprinting each other — fixed with `align: 'left'` and
      `labelLayout: { hideOverlap: true }`, both re-checked. Final state: the line starts at
      €16.898,26, steps down where the goal rows say it should, and rises at €1.600,10/month
      between. No console errors at any point.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, 0 introduced findings. The first run flagged four complexity findings; all
      four were fixed by extraction rather than suppressed — `groupByMonth`/`pointDate`/`totalOf`/
      `gainAt` out of the projection loop, `toProjectedPurchase` out of the store, and `dataIndexOf`
      out of the tooltip formatter. `ng lint` separately caught a hardcoded `Intl.NumberFormat` in
      the new spec, which now goes through `formatCurrency` like the code it tests.)

## Notes

- **Why forward-only, with no historical net worth band.** Drawing the past would need a
  net-worth-over-time aggregate that does not exist — `computeAccountBalanceHistory` deliberately
  computes real bank balance, not net worth (TICKET-ACC-07), so reusing it would put a line on the
  chart that disagrees with both the Dashboard card and the projection's own starting point. A
  proper `computeNetWorthHistory` (joint stakes, reimbursement suppression, over time) is a
  worthwhile ticket in its own right and is recorded in the version overview's "Considered, not
  ticketed yet" — it is not smuggled in here.
- **Why the goals are subtracted rather than just marked.** "When can I afford it" and "what am I
  left with afterwards" are the two halves of the user's actual question; a line that only ever goes
  up would answer the first and quietly flatter the second.
- The chart inherits every simplification listed in FUT-05's Notes — straight line, no compounding,
  no inflation, no known upcoming bills. The caption says so in one sentence rather than letting a
  smooth curve imply precision the data can't support.
- **Revised by [TICKET-FUT-09](./TICKET-FUT-09-required-saving-rate-mode.md)**, which makes this
  chart mode-aware rather than adding a second one: in required-rate mode the line rises at the
  *required* rate and steps down on each goal's `targetDate`, with the measured-rate projection drawn
  as a dashed comparison series. Build the series as a parameterised projection (rate in, step dates
  in) rather than hard-wiring `perMonth` and `affordableOn`, and FUT-09 is a caller rather than a
  rewrite.
- Needs FUT-05 (and therefore FUT-01/02/04) plus FUT-03's provider scope. Independent of FUT-06,
  though it reads the same settings and gets better once FUT-06's controls exist.
