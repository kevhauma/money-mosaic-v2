# TICKET-STAT-31 — Only offer heatmap cycles the selected range can actually fill

- **Area:** Dashboard
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Bug fix
- **Traceability:** revises **FR-STAT-15** ([TICKET-STAT-30](./TICKET-STAT-30-heatmap-cycle-switcher.md) — the cycle picker offers all four cycles regardless of the Dashboard's date range, so a one-week range can be switched to "Month", where eleven of twelve columns are structurally empty and the twelfth just repeats the total).

## User story

As someone looking at a week of spending, I don't want the heatmap to offer me a month-of-year or quarter view, so I'm not shown a chart whose columns are empty for reasons that have nothing to do with my spending.

## Description

Restricts the cycle picker to the cycles the current Dashboard range is long enough to fill: a week-long range offers day-of-week only; a month-long one adds day-of-month; a year adds month and quarter.

## Current situation (as-is)

- [cycle-picker.component.ts](../../../src/app/shared/ui/cycle-picker/cycle-picker.component.ts) derives its four buttons from a fixed `CYCLE_LABELS` map and always renders all of them; the panel passes only `value`.
- The panel handles the mismatch *after the fact*: `partialCycleNote` ([spending-heatmap-panel.component.ts](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.ts)) says "This range only covers 1 of 12 months" once the user has already switched to a view that can't work. Explaining an unusable chart is not the same as not offering it.
- Nothing in [calendar-cycles.ts](../../../src/app/shared/utils/calendar-cycles.ts) knows how long a cycle's period *is*; `cycleColumnKeys`/`cycleColumnIndex` only describe positions.
- The chosen cycle is session state (`ChartOptionsStore`, TICKET-STAT-30), so a cycle picked under a wide range is still the stored choice after the user narrows the range to a week.

## Desired result (to-be)

- New `cyclesForRange(from, to): CycleKey[]` in [calendar-cycles.ts](../../../src/app/shared/utils/calendar-cycles.ts), returning the cycles whose full period fits inside the range, shortest first. Minimum spans: **7 days** for day-of-week, **28 days** (the shortest calendar month) for day-of-month, **365 days** for month-of-year and quarter-of-year.
- `'day-of-week'` is always in the list, even for a 3-day range: it is the panel's default and its smallest unit, and a picker with nothing in it is worse than one honest option.
- `mm-cycle-picker` takes an `available` input (defaulting to every cycle) and renders only those buttons, so an unavailable cycle isn't shown at all — not shown-and-disabled, per the reported behaviour ("should not be able to see").
- The panel's **effective** cycle falls back to the longest available one when the stored choice doesn't fit the current range, *without* overwriting the stored choice — widening the range back restores what the user picked, since `ChartOptionsStore` still holds it.
- `partialCycleNote` stays: an offered cycle can still be partly covered (a 28-day February range fills day-of-month columns 1–28, not 29–31), which is exactly the case the note was written for.

## Acceptance criteria

- [x] `cyclesForRange` returns cycles shortest-first, gated on the minimum spans above, and always includes `'day-of-week'`. ([calendar-cycles.ts](../../../src/app/shared/utils/calendar-cycles.ts); specs "offers day of week alone for a week, and nothing bigger", "adds day of month at 28 days, the shortest calendar month, and not at 27", "adds month and quarter at a full year, and not a day earlier", "returns cycles shortest-first, so the last entry is the longest available".)
- [x] The picker renders only the available cycles; a week-long Dashboard range shows the day-of-week button alone. (`available` input on [cycle-picker.component.ts](../../../src/app/shared/ui/cycle-picker/cycle-picker.component.ts), defaulting to all four; picker spec "renders only the cycles the caller says are available (TICKET-STAT-31)" and panel spec "offers day of week alone on a week-long range", which asserts the rendered button list is exactly `['Day of week']`.)
- [x] With a stored cycle that no longer fits the range, the panel renders the longest available cycle instead, and restores the stored one when the range widens again — the store is never written to as a side effect of a range change. (Panel spec "falls back to the longest cycle the range can fill, without overwriting the stored choice" — picks month-of-year on a year-long range, narrows to a week and asserts the effective cycle is day-of-week while `ChartOptionsStore.cycle('dashboard-heatmap')` is still `month-of-year`, then widens again and gets month-of-year back.)
- [x] The chart, the screen-reader table, the caption and the accessible name all follow the effective cycle, not the stored one. (They all read the same `cycle()` computed; panel spec "draws the effective cycle, not the stored one, in the chart and the table" asserts a 7-column x-axis and a "day of the week" table caption while the store still holds month-of-year.)
- [x] `partialCycleNote` still appears for an available-but-not-fully-covered cycle (e.g. a 28-day range on day-of-month). (Panel spec "says so when an offered cycle still cannot reach every column, and stays quiet when it can" — a whole February offers day-of-month and reports "This range only covers 28 of 31 days of the month", while day-of-week on the same range says nothing. Note that this ticket makes the month-of-year example from TICKET-STAT-30 unreachable: any range long enough to offer a year-shaped cycle also covers all twelve of its columns.)
- [x] Unit tests cover: each cycle's threshold (a 6- vs. 7-day range, a 27- vs. 28-day range, a 364- vs. 365-day range); a 3-day range still returning day-of-week; the panel falling back and then restoring the stored choice; the picker rendering a subset. (All named cases exist: the 6-vs-7, 27-vs-28 and 364-vs-365 day boundaries and the 3-day range in [calendar-cycles.spec.ts](../../../src/app/shared/utils/calendar-cycles.spec.ts); the fallback-and-restore and subset-rendering cases in the panel and picker specs.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (`verifier` subagent, final run: lint clean; **234 test files / 2392 tests, 2391 passed**; dev build clean, `angular.json` untouched. The one failure is a known load-dependent flake in `feature-import`'s wizard spec — it settles async parse work with a fixed 350 ms wall-clock sleep — which passes on an isolated re-run and touches no dashboard code.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`: 0 dead code, 0 duplication. Conventions: `cyclesForRange` sits beside the rest of the calendar vocabulary in `shared/utils`, and the picker takes the available list as a typed `input()` rather than reaching for a store — it stays presentational.)
- [ ] Verified live in the browser: on a one-week Dashboard range the picker shows only "Day of week"; widening to a year brings the other three back with the previously-picked one re-selected. **Open — blocked, not skipped:** the Browser pane stopped being displayed, so the page never composites frames and the panel's `@defer (on viewport)` trigger never fires; the dev server, navigation and DOM reads all work, the panel simply never renders. Covered by the component specs above in the meantime.

## Notes

- **Thresholds are range *length*, not column coverage.** "Covers every column" would reject a whole 28-day February for day-of-month (it never reaches the 29th–31st), which is plainly enough range to look at day-of-month patterns. Length is the honest test of "is this cycle askable"; coverage remains the honest test of "is every column reachable", which is what the caption reports.
- Quarter takes the same 365-day threshold as month rather than ~90 days: four quarters is a year, and a single-quarter range would put everything in one of four columns — the same defect this ticket fixes.
