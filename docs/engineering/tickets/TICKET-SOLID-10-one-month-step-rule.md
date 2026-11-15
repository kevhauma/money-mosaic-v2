# TICKET-SOLID-10 — One month-step rule that clamps to month-end

- **Area:** Shared utilities (shared/utils/date-buckets.ts) + core/loans, core/stats
- **Released in:** _unreleased_
- **Type:** Bug fix + Refactor
- **Traceability:** CR6-A1 (month-stepping part), CR5-23 ("three month-step helpers disagree"); root of CR5-9 (LOAN-17) and CR6-17 (REC-13), part of CR6-15 (FUT-11); loan schedule dates of TICKET-LOAN-04 / TICKET-LOAN-12

## User story

As a user with a loan starting on 31 January, I want its schedule to fall on 28 February and 31 March, so payment dates don't jump to 3 March and every month-based figure agrees on what "one month later" means.

## Description

The app steps months two ways. `addMonths` in `core/loans` lets the day spill into the next month (31 Jan + 1 → 3 Mar); `stepBy` in `core/stats` and three month-end helpers clamp to the month's last day. Which rule a figure gets depends on which file computed it. One exported helper, with the clamping rule, replaces both.

## Current situation (as-is)

- Overflow: [amortization.ts:31-36](../../../src/app/core/loans/amortization.ts) — `addMonths` builds `Date.UTC(y, m + months, day)`; its doc says "a day past a shorter month's end rolls forward". Callers: [amortization.ts:86](../../../src/app/core/loans/amortization.ts) (schedule), [loan-progress.ts:188](../../../src/app/core/loans/loan-progress.ts) (projected payoff), [what-if.ts:131](../../../src/app/core/loans/what-if.ts) (what-if series).
- Clamp: [recurring-projection.ts:58-73](../../../src/app/core/stats/recurring-projection.ts) — `stepBy`'s calendar branch uses `Math.min(day, daysInMonth(...))` (private `daysInMonth`, line 32).
- Month-end-after copies (all `Date.UTC(y, m + n + 1, 0)`): [goal-affordability.ts:30-37](../../../src/app/core/stats/goal-affordability.ts) `monthEndAfter`, [required-saving-rate.ts:37-42](../../../src/app/core/stats/required-saving-rate.ts) `monthEnd`, [net-worth-projection.ts:38-44](../../../src/app/core/stats/net-worth-projection.ts) `pointDate`.
- Example: loan from 2026-01-31: `addMonths` gives 2026-03-03 for month 1 and 2026-03-31 for month 2 — two payments in March, none in February.

## Desired result (to-be)

- `addCalendarMonths(isoDate, months)` in `date-buckets.ts`: same day-of-month, clamped to the target month's last day; negative `months` steps back. `monthEndAfter(isoDate, months)`: the last day of the month `months` after `isoDate`'s month.
- `addMonths` is deleted; its three callers use `addCalendarMonths`. `stepBy`'s calendar branch uses it. The three month-end helpers use `monthEndAfter`.
- Every step is taken from the original anchor (`start + n months`), never chained month to month, so a clamp in February doesn't pull later months to the 28th — as the schedule already does.

## Acceptance criteria

- [ ] `addCalendarMonths('2026-01-31', 1)` is `2026-02-28`; `('2028-01-31', 1)` is `2028-02-29`; `('2026-01-31', 2)` is `2026-03-31`; `('2026-03-31', -1)` is `2026-02-28`; `('2026-01-15', 13)` is `2027-02-15`.
- [ ] `monthEndAfter('2026-08-09', 0)` is `2026-08-31`; `('2026-01-31', 1)` is `2026-02-28`.
- [ ] A loan starting 2026-01-31 has schedule dates 2026-02-28, 2026-03-31, 2026-04-30 (amortization spec updated; the change of dates is intended and called out in the spec).
- [ ] `grep -rn "addMonths\b" src/app` finds no definition outside `date-buckets.ts`'s replacement and no caller of the old name; no private month-end helper remains in the three files above.
- [ ] Recurring projection, goal affordability, required saving rate and net-worth projection specs pass unchanged (they already clamp).
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: a loan starting on the 31st shows month-end payment dates in its schedule.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Do before [TICKET-LOAN-17](../../loans/tickets/TICKET-LOAN-17-what-if-lump-sums-month-end.md), [TICKET-REC-13](../../recurring/tickets/TICKET-REC-13-next-expected-date-calendar-step.md) and [TICKET-FUT-11](../../future/tickets/TICKET-FUT-11-goal-eta-required-rate-same-grid.md)** — each uses this helper for its own fix. This ticket fixes the shared rule only; it doesn't change which month FUT-11's grids start on or how REC-13 picks the next expected date.
- Part of the date-module split of CR6-A1: [TICKET-SOLID-08](./TICKET-SOLID-08-local-today.md) (local today) is independent; [TICKET-SOLID-11](./TICKET-SOLID-11-drop-private-date-helpers.md) follows this one.
- Shifting a schedule's dates moves interest days in `loan-progress.ts` slightly for loans starting on the 29th–31st; check the loan-progress specs' expected figures and update only those that move for this reason.
