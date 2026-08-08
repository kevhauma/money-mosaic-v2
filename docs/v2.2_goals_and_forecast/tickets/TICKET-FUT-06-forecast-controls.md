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

- [ ] All three controls render, reflect the persisted `forecastSettings` values on load, and fall
      back to the defaults (6 / `net-cash-flow` / 0) when the row has never been written.
- [ ] Changing the lookback recomputes the velocity and every goal ETA below it in the same tick.
- [ ] Selecting a window longer than the available history clamps, and the readout reports the
      months actually measured — not the months requested.
- [ ] Switching the basis changes the measured rate, and each option carries its one-line
      explanation of what it counts.
- [ ] The safety net accepts 0 and positive amounts, rejects negative and non-numeric input with a
      visible message, and a raised safety net visibly pushes out at least one goal ETA.
- [ ] The velocity readout shows mean per month, months covered, median, min and max; with
      insufficient history it shows the explicit message instead of a €0 rate.
- [ ] Every setting persists across a reload.
- [ ] All writes go through `ForecastSettingsStore` from `@/core/state` — no repository or Dexie
      import in the component.
- [ ] Amounts honour privacy mode and use `formatCurrency()`.
- [ ] Unit tests cover: defaults on an unwritten row; each control persisting; clamping a too-long
      window and the readout reporting the clamped count; the basis switch changing the rate; safety net
      validation (negative, non-numeric, zero); the insufficient-history message; and a goal ETA
      moving when the safety net is raised.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified live in the browser: switching 6 → 12 months and switching the basis both visibly
      change the rate and the ETAs against real imported data.
      *(Ask the user first; if declined, note it here rather than ticking.)*
- [ ] Verified via the fallow skill and coding-conventions skill.

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
