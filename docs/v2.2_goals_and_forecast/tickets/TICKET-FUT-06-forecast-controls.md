# TICKET-FUT-06 — Forecast controls: how far back to look, what counts as saving, what to keep aside

- **Area:** Forecast
- **Type:** Feature
- **Traceability:** extends **FR-FUT-1** ([TICKET-FUT-01](./TICKET-FUT-01-saving-velocity-aggregate.md)),
  writing the `forecastSettings` row from
  [TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md) that
  [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md) already reads. Privacy-mode
  compliance per [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone whose last few months weren't typical, I want to choose how far back the app measures my
saving, what it counts as saving, and how much cash I want left untouched — and to see the spread
behind the number it gives me — so I can judge whether to believe the forecast.

## Description

The controls bar above the forecast, plus the velocity readout that keeps it honest: a lookback
window, a saving-basis switch, a safety net, and a plain-language line reporting the measured rate
alongside the typical, best and worst months it came from.

## Current situation (as-is)

- [TICKET-FUT-01](./TICKET-FUT-01-saving-velocity-aggregate.md) takes `lookbackMonths` and `basis`
  as parameters and returns `perMonth`, `median`, `min`, `max`, `monthsCovered` and
  `hasEnoughHistory` — none of which is surfaced anywhere yet.
- [TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md) persists all three settings in
  `forecastSettings` with defaults (6 months, `net-cash-flow`, safety net 0), and
  [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md) already consumes them — so
  until this ticket ships, the forecast silently runs on the defaults with no way to change them.
- `computeFullHistoryRange` ([full-history-range.ts](../../../src/app/core/stats/full-history-range.ts))
  already derives the span of imported data, which is what a lookback control must clamp against.
- The precedent for a per-section control cluster is the Explore page's panels; the precedent for a
  persisted-vs-session control decision is recorded in
  [`chart-options.store.ts`](../../../src/app/core/state/chart-options.store.ts) and reversed
  deliberately for this row in FUT-02's Notes.

## Desired result (to-be)

- New `app-forecast-controls` under `feature-future/components/forecast-controls/`, `OnPush`,
  rendered above the goals section on `/future`, exported via the feature's components barrel.
- **Lookback window**: preset choices (3, 6, 12, 24 months and "all history") plus the resulting
  window stated in words ("June 2026 – November 2026, 6 complete months"). A preset longer than the
  imported history is still selectable but **clamps**, and the readout says what was actually
  measured rather than silently pretending.
- **Saving basis**: a two-option switch — "Money left over (income − expenses)" vs "Money moved to
  savings accounts" — each with a one-line explanation of what it counts, since the two can differ
  by an order of magnitude for the same user.
  <br>*Implementation note (2026-08-13):* shipped as a **segmented toggle** (`mm-tabs`, value-driven
  `box` variant), not a dropdown — a binary choice whose whole point is the comparison should show
  both readings at once rather than hiding the alternative behind a click. The lookback stays a
  `<select>`: five options, only one of which is ever relevant.
- **Safety net**: an amount to keep untouched, validated as a number ≥ 0, feeding
  `ForecastSettings.safetyNetAmount`. Labelled as what it is ("keep this much aside — goals are only
  funded from what's above it").
- **Velocity readout**, always visible: "You saved about €X/month over N months · typical month
  €median · range €min to €max". When `hasEnoughHistory` is false, this is replaced by an explicit
  "not enough complete months in this window yet" message rather than "€0/month".
- Changing any control writes through `ForecastSettingsStore` and the forecast below recomputes
  immediately; the choice survives a reload.
- Amounts masked under privacy mode; amounts through `formatCurrency()`, month labels through the
  existing locale date helpers.

## Acceptance criteria

- [x] All three controls render, reflect the persisted `forecastSettings` values on load, and fall
      back to the defaults (6 / `net-cash-flow` / 0) when the row has never been written. (Specs
      "renders all three controls on the defaults when the row has never been written" and "reflects
      a persisted row rather than the defaults" (24 / savings-transfers / 2500).)
- [x] Changing the lookback recomputes the velocity and every goal ETA below it in the same tick.
      (Spec "changing the lookback recomputes the rate and the ETAs together" mounts the **whole
      page** — controls and goals — and asserts the readout moves from 6 to 3 complete months; the
      wiring runs through `ForecastStore`'s `computed()`, so there is no manual invalidation to
      forget.)
- [x] Selecting a window longer than the available history clamps, and the readout reports the
      months actually measured — not the months requested. (Spec "clamps a window longer than the
      history and says how many months it really measured" — 24 requested, "2 complete months"
      reported, and "24 complete" explicitly absent. Live: with 12 months selected against three
      months of imported history the readout reads "May 2026 – July 2026 · 3 complete months".)
- [x] Switching the basis changes the measured rate, and each option carries its one-line
      explanation of what it counts. (Specs "renders the basis as a two-option toggle with both
      readings visible at once" and "persists a changed basis, and shows that option's explanation".
      Live, on real data: "Money left over" reads **€1,600.10/month**, "Money moved to savings"
      **€300.00/month** — the same three months, a 5× difference, which is exactly why the control
      exists.)
- [x] The safety net accepts 0 and positive amounts, rejects negative and non-numeric input with a
      visible message, and a raised safety net visibly pushes out at least one goal ETA. (Specs
      "persists a safety net of zero and of a positive amount", an `it.each` over a negative and a
      blank amount asserting **no write** and a visible message, and the whole-page spec "raising the
      safety net pushes a goal out of 'affordable now' in the same tick". Live: a €5.000 safety net
      moved "Kitchen" from *You can buy this now* to *≈ October 2027 · in 14 months* and "Bike" to
      February 2028. An invalid value deliberately leaves the last good one in force rather than
      blanking the forecast mid-keystroke.)
- [x] The velocity readout shows mean per month, months covered, median, min and max; with
      insufficient history it shows the explicit message instead of a €0 rate. (`describeVelocity`
      + its 6-case spec; component specs "reports the measured rate with the window and the spread
      behind it" and "says what is missing instead of a €0/month rate when there is no complete
      month at all" (asserting `/month` is absent entirely).)
- [x] Every setting persists across a reload. (Live: after setting savings-transfers + a €5.000
      safety net and reloading `/future`, all three came back as set, with the ETAs still pushed
      out.)
- [x] All writes go through `ForecastSettingsStore` from `@/core/state` — no repository or Dexie
      import in the component. (`forecast-controls.component.ts` injects `ForecastSettingsStore`,
      `ForecastStore` and `AppSettingsStore` only; the two form controls are bound with
      `linkControlToSetting`, the shared helper that owns the `emitEvent: false` write-back.)
- [x] Amounts honour privacy mode and use `formatCurrency()`. (The rate and the spread each sit in
      `mm-privacy-blur`; the window label carries no amounts and stays readable.)
- [x] Unit tests cover: defaults on an unwritten row; each control persisting; clamping a too-long
      window and the readout reporting the clamped count; the basis switch changing the rate; safety net
      validation (negative, non-numeric, zero); the insufficient-history message; and a goal ETA
      moving when the safety net is raised. (14 component cases + 6 `forecast-controls-vm` cases.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (Lint clean; 2864 tests / 260 files green; dev build completed,
      `Initial total` unchanged at 2.16 MB.)
- [x] Verified live in the browser: switching 6 → 12 months and switching the basis both visibly
      change the rate and the ETAs against real imported data. (The basis switch did, as recorded
      above. **The lookback change could not**, and honestly so: this dataset holds only three
      complete months, so 6 and 12 both clamp to the same three and the rate is *correctly*
      unchanged — what the change visibly does is update the stated window. The recompute-on-change
      behaviour is covered by the whole-page spec instead, where the fixture controls how much
      history exists.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, zero findings, first run — the controls were built as small pieces
      (`forecast-controls-vm.ts` holds the option lists and `describeVelocity`) rather than
      refactored into shape afterwards.)

## Notes

- **Why the spread is an acceptance criterion, not a nicety.** A single mean invites false
  precision — one holiday-pay month can carry a whole 6-month window. Showing median and range next
  to the mean costs one line and is the only thing in this version that tells the user how much to
  trust the date they're being given.
- **Why presets and not a free date range.** The page has no `RangeStore` by FUT-03's design, and a
  velocity window is a count of complete months, not an arbitrary span — a 47-day window has no
  meaningful per-month rate. "All history" covers the open-ended case.
- The safety net is the only place "money I won't spend" is expressible, which is why FUT-04 has no
  per-goal "already saved" field; see that ticket's Notes.
- Needs FUT-01, FUT-02 and FUT-05 (there is nothing to recompute before FUT-05 exists). Independent
  of [TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md), which reads the same settings.
