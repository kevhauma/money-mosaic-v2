# TICKET-FUT-10 — The required-saving chart reaches every goal

- **Area:** Forecast
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-13 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-FUT-6 (required-saving mode, [TICKET-FUT-09](./TICKET-FUT-09-required-saving-rate-mode.md)), FR-FUT-5 (projected net-worth chart, [TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md))

## User story

As someone planning a purchase years out, I want the "what do I need to save" chart to run until my goal's date, so I can see the step down when I buy it.

## Description

The chart's length is set from the **measured-rate** ETAs only. In required-rate mode, a goal wanted later than that silently falls off the end of the line, and the caption doesn't count it as missing.

## Current situation (as-is)

- [`projectionHorizonMonths`](../../../src/app/feature-future/forecast.store.ts) (lines 168–173) is `max(12, latest affordability monthsAway + 3)`, from `computeGoalAffordability` at the measured rate.
- `requiredProjection` (lines 232–259) reuses that horizon and places each goal on its `targetDate` (line 248). `computeNetWorthProjection` only buckets purchases inside the horizon, so a later one is dropped.
- `omittedGoalCount` in required-rate mode (lines 288–294) counts only `no-target-date` and `due-now` goals, so the caption claims nothing is missing.
- Example (today 2026-11-15): goal €30,000 wanted by 2030-01-31, spendable €10,000, measured saving €2,000/month. The ETA is 10 months, so the horizon is 13 months (to 2027-12). The required line runs to December 2027 and never steps down, and no goal is reported as omitted.

## Desired result (to-be)

- In required-rate mode, the horizon also reaches the latest `targetDate` of a goal plotted on the required line, plus the same 3-month headroom.
- Measured-rate mode keeps today's horizon.
- In required-rate mode the dashed measured-rate comparison line is drawn over the same, longer horizon, so the two lines stay comparable.

## Acceptance criteria

- [ ] In the example, required-rate mode draws the line to at least 2030-04 and shows the €30,000 step down in 2030-01.
- [ ] Two goals wanted by 2027-06-30 and 2029-09-30: the line reaches at least 2029-12, and both step-downs are drawn.
- [ ] When-affordable mode's horizon is unchanged for the same data (13 months in the example).
- [ ] An undated goal is still counted in `omittedGoalCount` and doesn't stretch the horizon.
- [ ] The horizon stays capped by a backstop: a goal wanted in 9999 doesn't produce a 95,000-month chart. Reuse the ETA's 600-month `DEFAULT_HORIZON_MONTHS` (`goal-affordability.ts`) rather than inventing a new limit.
- [ ] Unit tests (forecast store or a pure horizon helper) cover: the example, two dated goals, when-affordable unchanged, the undated goal, and the cap.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: on `/future` in "What do I need to save" mode, a goal dated three years out shows its step down on the chart.

## Notes

- A goal that is `already-affordable` is placed on the first month-end, so it never stretches the horizon.
