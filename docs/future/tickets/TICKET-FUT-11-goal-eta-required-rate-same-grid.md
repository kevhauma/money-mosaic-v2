# TICKET-FUT-11 — Goal ETA and required saving use one month grid

- **Area:** Forecast
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-15, CR6-A1 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-FUT-4 (goal ETA, [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md)), FR-FUT-6 (required saving, [TICKET-FUT-09](./TICKET-FUT-09-required-saving-rate-mode.md))

## User story

As someone checking whether a goal is on track, I want both modes of the Future page to give the same answer, so I'm not told "on track" in one view and "late" in the other.

## Description

The ETA counts month 1 as the end of **next** month. The required-saving rate also counts the end of the **current** month. With the same goal, balance and saving rate, one mode can say "on track" while the other gives an ETA after the wanted-by date. The doc comment says the two can never disagree. The fix puts both on the grid the chart already uses: month 1 is the end of next month.

## Current situation (as-is)

- [`computeGoalAffordability`](../../../src/app/core/stats/goal-affordability.ts) (lines 113–117): `months = ceil(shortfall / perMonth)`, `affordableOn = monthEndAfter(today, months)`. `monthEndAfter(today, 1)` (lines 30–37) is next month's last day.
- [`monthsAvailableUntil`](../../../src/app/core/stats/required-saving-rate.ts) (lines 51–59) loops from `offset = 0` and counts every month-end after `today`, so the current month's end counts as a saving month.
- [`computeNetWorthProjection`](../../../src/app/core/stats/net-worth-projection.ts) (lines 38–44, 82) makes month 0 today and month 1 the end of next month: the chart agrees with the ETA, not with the required rate.
- Example: today 2026-08-09, shortfall €300, saving €100/month, goal wanted by 2026-10-31.
  - The required rate counts three month-ends (Aug, Sep, Oct): €100/month needed, gap €0, on track.
  - The ETA is `monthEndAfter(today, 3)` = 2026-11-30: after the date, so not on track.
- [`computeRequiredSavingRate`](../../../src/app/core/stats/required-saving-rate.ts)'s doc (lines 129–132) claims "the same month-end grid … can never disagree".

## Desired result (to-be)

- `monthsAvailableUntil` counts month-ends from **next** month (offset 1) up to and including the last one on or before `targetDate`. This is the ETA's and the chart's grid.
- Both month-end helpers (`monthEndAfter` and `monthEnd`, which are copies) are replaced by the one month-end helper from [TICKET-SOLID-10](../../engineering/tickets/TICKET-SOLID-10-one-month-step-rule.md).
- The doc comments' worked examples are corrected. In `monthsAvailableUntil`'s example, 15 March 2027 asked on 9 August 2026 now has six month-ends, not seven.

## Acceptance criteria

- [ ] In the example, required-rate mode reports 2 months available, €150/month required and a gap of €50 (not on track), matching the ETA's 2026-11-30.
- [ ] A goal wanted by 2026-11-30 in the same example is on track in both modes: 3 months, €100/month, gap €0, ETA 2026-11-30.
- [ ] Goal wanted by 2027-03-15, asked on 2026-08-09: `monthsAvailable` is 6.
- [ ] A goal wanted by the end of the current month (2026-08-31) is `due-now` in required-rate mode.
- [ ] A property-style spec asserts, over a grid of shortfalls, rates and dates, that `onTrack` from the ETA equals `gapPerMonth <= 0` from the required rate.
- [ ] No private month-end helper remains in `goal-affordability.ts` or `required-saving-rate.ts`.
- [ ] Unit tests in `required-saving-rate.spec.ts` and `goal-affordability.spec.ts` cover the cases above. Existing cases whose month counts move are updated, with the reason in the commit.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: on `/future`, a goal the "When can I afford it" view shows as late is also shown short in "What do I need to save".

## Notes

- **After TICKET-SOLID-10** (one month-step rule that clamps to month-end). The grid fix itself is independent; SOLID-10 only removes the duplicated helpers.
- The review cited `goal-affordability.ts:274-281`. The file is 128 lines long, and the ETA logic is at lines 113–117. The finding itself is confirmed.
- Changing the ETA instead (counting the current month) would break the chart, whose month 1 is next month-end. That's why the required rate is the side that moves.
- Requiring a month's saving before its end-of-month is conservative when today is the 1st. Accepted, for one rule shared by all three.
