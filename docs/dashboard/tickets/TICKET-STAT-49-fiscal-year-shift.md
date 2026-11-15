# TICKET-STAT-49 — Stepping a fiscal year keeps its start month

- **Area:** Date ranges (shared/utils, core/state, core/stats)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-8; fixes FR-STAT-7 (range stepping) for the fiscal-year setting of TICKET-SET-09, and FR-STAT-8's comparison window ([TICKET-STAT-04](./TICKET-STAT-04-category-period-comparison.md))

## User story

As a user whose fiscal year starts in April, I want "previous"/"next" and the category comparison to step from April to March, so I land on the fiscal year I asked for and the comparison bars line up with my selection.

## Description

Shifting a range by a calendar `year` always rebuilds 1 Jan–31 Dec and ignores the range's own start month. The `quarter` case right above it already steps from the start month; `year` should do the same, and a chain of steps should keep stepping by whole fiscal years.

## Current situation (as-is)

- [date-buckets.ts:165-169](../../../src/app/shared/utils/date-buckets.ts) — `shiftRangeByCalendarUnit`'s `year` case returns `Date.UTC(year - count, 0, 1)`..`Date.UTC(year - count, 11, 31)`. Fiscal start April, "Previous fiscal year" on 2026-11-15 is 2025-04-01..2026-03-31; one step back gives 2024-01-01..2024-12-31.
- The entry carries `calendarUnit: 'year'` ([quick-ranges.ts:176-183](../../../src/app/shared/utils/quick-ranges.ts)), so both callers take the broken branch:
  - [range-state.store.ts:242-259](../../../src/app/core/state/range-state.store.ts) (`shiftRange`, prev/next arrows);
  - [period-window.ts:58-60](../../../src/app/core/stats/period-window.ts) (`computeComparisonWindow`). The shifted periods never equal the selection, so `isSelected` (line 78) is never true and [category-period-comparison.ts:66](../../../src/app/core/stats/category-period-comparison.ts) falls back to the last window period and labels it "selected".
- Second-step drift (found while confirming; not in CR5-8): after the first step `quickRangeId` is `null`, and [`alignedCalendarUnit`](../../../src/app/shared/utils/date-buckets.ts) (line 267) recognises only 1 Jan–31 Dec as a year, so a fiscal range falls back to `shiftRangeByDayCount`. Even with the `year` case fixed, 2024-04-01..2025-03-31 steps to 2023-04-02..2024-03-31 (365 days across 29 Feb 2024).
- No spec covers a fiscal range.

## Desired result (to-be)

- The `year` case steps from the range's start month: `Date.UTC(year - count, startMonth, 1)`..`Date.UTC(year - count, startMonth + 12, 0)`. A January start gives the same result as today.
- A range of 12 whole months starting on the 1st keeps stepping as a `year` after its preset is cleared (`alignedCalendarUnit` returns `'year'` for it), without changing the "2026"-style label `formatAlignedRangeLabel` gives a calendar year.

## Acceptance criteria

- [ ] Fiscal start April: shifting 2025-04-01..2026-03-31 by `year`, count 1, gives 2024-04-01..2025-03-31; count −1 gives 2026-04-01..2027-03-31.
- [ ] Fiscal start January: the `year` case still returns 2025-01-01..2025-12-31 from 2026-01-01..2026-12-31.
- [ ] Three "previous" clicks from "Previous fiscal year" (fiscal start April, today 2026-11-15) land on 2024-04-01..2025-03-31, 2023-04-01..2024-03-31, 2022-04-01..2023-03-31 — no day-count drift across 29 Feb 2024.
- [ ] `computeComparisonWindow` for preset `previous-fiscal-year` (fiscal start April) returns periods that each run April–March, with exactly one `isSelected` period equal to the selection.
- [ ] Specs added to `date-buckets.spec.ts`, `range-state.store.spec.ts` and `period-window.spec.ts` for the cases above.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: set fiscal start to April, pick "Previous fiscal year", press previous twice; the category comparison bars show April–March periods with the right one marked selected.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Independent of the date-module tickets (SOLID-08/10/11). If SOLID-11 lands first, `period-window.ts` will already use the canonical `shiftRangeByDayCount`; nothing here depends on that.
- Fiscal _quarters_ already step correctly (the `quarter` case uses the start month).
