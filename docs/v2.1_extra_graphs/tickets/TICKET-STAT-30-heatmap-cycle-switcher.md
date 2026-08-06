# TICKET-STAT-30 — Switch the heatmap between day of week, day of month, month and quarter

- **Area:** Dashboard
- **Type:** Feature
- **Traceability:** extends **FR-STAT-15** ([TICKET-STAT-29](./TICKET-STAT-29-spending-heatmap-panel.md)); follows the per-chart control precedent of [TICKET-STAT-15](../../v1.3_dashboard_insights/tickets/TICKET-STAT-15-independent-trend-chart-bucket-controls.md) and [TICKET-STAT-27](../../v1.6.2_interface_polish/tickets/TICKET-STAT-27-session-persistent-chart-options.md).

## User story

As someone reading the spending heatmap, I want to switch its columns between day of the week, day of the month, month of the year and quarter, so I can tell a "we always eat out on Friday" pattern apart from a "the bills all land on the 1st" pattern and a "December is carnage" pattern.

## Description

Widens [TICKET-STAT-29](./TICKET-STAT-29-spending-heatmap-panel.md)'s aggregate from one hardcoded cycle to four, and puts a segmented control on the panel that switches between them — held for the session by `ChartOptionsStore` like every other per-chart control, not reset on every navigation.

## Current situation (as-is)

- After TICKET-STAT-29, `computeCategoryCycleHeatmap` takes a `cycle` parameter whose only accepted value is `'day-of-week'`; the panel passes the literal and has no control.
- Per-chart controls already have an established home: [chart-options.store.ts](../../../src/app/core/state/chart-options.store.ts) holds `{ granularity, hiddenSeries, zoom }` per `ChartOptionsKey`, and [chart-options-control.ts](../../../src/app/core/state/chart-options-control.ts) exposes `chartGranularity(chart, seed)` / `chartSeriesFilter(chart, names)` as the injection-context helpers components use. `ChartOptionsKey` is a closed union of five chart ids ([chart-options.store.ts:19-24](../../../src/app/core/state/chart-options.store.ts)) — the heatmap is not one of them.
- `ChartOptionsEntry` has no field for a cycle, and `Granularity` (`'day' | 'week' | 'month' | 'quarter' | 'year'`, [date-buckets.ts:4](../../../src/app/shared/utils/date-buckets.ts)) is the wrong vocabulary: it names bucket *sizes* along a timeline, not positions within a repeating cycle.
- [GranularityPickerComponent](../../../src/app/shared/ui/granularity-picker/granularity-picker.component.ts) is the existing segmented control for bucket size; it is typed to `Granularity` and so can't be reused verbatim for cycles.

## Desired result (to-be)

- `CycleKey = 'day-of-week' | 'day-of-month' | 'month-of-year' | 'quarter-of-year'` exported from `core/stats/category-cycle-heatmap.ts`, and `computeCategoryCycleHeatmap` handling all four:
  - `day-of-week` — 7 columns, Mon–Sun (as shipped).
  - `day-of-month` — 31 columns, 1–31. The 29th–31st are genuinely rarer; see Notes.
  - `month-of-year` — 12 columns, Jan–Dec.
  - `quarter-of-year` — 4 columns, Q1–Q4.
- Column *labels* are produced by the aggregate (not the component) so the sr-only table and the chart can't disagree, and go through the app's locale-aware date formatting where the label is a real date part (weekday and month names via `localeDate`/`formatSettings`, not hardcoded English strings).
- Every cycle always emits its full column set, zero cells included — a range narrower than one full cycle shows real gaps rather than a compressed axis that reads as if data existed.
- The panel gains a small caption when the selected range covers less than one full turn of the chosen cycle (e.g. `month-of-year` over a 3-month range): "This range only covers 3 of 12 months" — a statement of fact next to the chart, not a blocked state.
- `ChartOptionsKey` gains `'dashboard-heatmap'`; `ChartOptionsEntry` gains an optional `cycle?: CycleKey`; `ChartOptionsStore` gains `cycle(chart)` / `setCycle(chart, cycle)` mirroring the existing `granularity` pair; `chart-options-control.ts` gains `chartCycle(chart, seed)` mirroring `chartGranularity` exactly (a `computed` read over the store plus a setter, never a local writable shadowing it — the reasoning in `chartGranularity`'s doc comment applies unchanged).
- A `mm-cycle-picker` segmented control in `shared/ui/`, built from the same daisyUI classes as `GranularityPickerComponent` but typed to `CycleKey`, placed in the panel header next to its title.
- `ChartOptionsStore` stays in-memory only — no Dexie table, no `appSettings` field — the deliberate "per session, resets on reload" decision recorded in its own doc comment.
- The default cycle is `'day-of-week'`, so an existing user's panel looks exactly as it did before this ticket until they touch the control.

> **Implementation note, 2026-08-05 — the cycle vocabulary and its labels live in `shared/utils`,
> not in the aggregate.** The to-be below puts `CycleKey` in `core/stats/category-cycle-heatmap.ts`
> and has the *aggregate* produce the column labels. Both moved to a new
> [shared/utils/calendar-cycles.ts](../../../src/app/shared/utils/calendar-cycles.ts)
> (`CycleKey`, `cycleColumnKeys`, `cycleColumnLabels`, `cycleColumnIndex`) during convention review,
> for two reasons:
>
> 1. **`CycleKey` is calendar vocabulary, exactly like `Granularity`** — which already lives in
>    `shared/utils/date-buckets.ts` precisely so `ChartOptionsStore` can type an entry without
>    depending on an aggregation module. Keeping `CycleKey` in `core/stats` created a brand-new
>    `core/state → core/stats` import edge that no other file in `core/state` needed.
> 2. **Labels are presentation, and putting them in the aggregate made it locale-reactive.**
>    `formatMonthShort`/`formatWeekdayShort` read the module-level `locale()` signal, so
>    `heatmap()` — a `computed()` that scans every transaction and runs `computeCategoryBreakdown`
>    — re-ran on any locale change purely to relabel an axis. The aggregate now returns
>    locale-independent `columnKeys`, and the panel resolves `columnLabels` itself.
>
> The property that criterion asked for is preserved: the chart option and the screen-reader table
> both read the panel's single `columnLabels()` signal, so the two still cannot disagree.

> **Revised by [TICKET-STAT-31](./TICKET-STAT-31-heatmap-cycles-fit-the-range.md) (2026-08-06).**
> The picker no longer offers every cycle unconditionally — only those the selected range is long
> enough to fill — and the panel falls back to the longest available cycle when the stored choice
> stops fitting. One consequence for the record below: the "This range only covers 1 of 12 months"
> example is no longer reachable, since any range long enough to offer a year-shaped cycle also
> covers all twelve of its columns. The caption itself still fires, on day-of-month over a short
> month.

## Acceptance criteria

- [x] `computeCategoryCycleHeatmap` supports all four `CycleKey` values, each emitting its complete column set in calendar order with zero cells for empty positions. (`cycleColumnKeys`/`cycleColumnIndex` switch on all four with no default branch, so a fifth member fails to compile; specs "buckets by day of the month, keeping every one of the 31 columns", "buckets by quarter", "folds the same month of two different years into one column", plus [calendar-cycles.spec.ts](../../../src/app/shared/utils/calendar-cycles.spec.ts)'s four `cycleColumnKeys` specs.)
- [x] Column labels come from the aggregate and go through the app's locale-aware formatting for weekday/month names (no hardcoded English day or month strings in the component or the template). **Amended — see the implementation note above:** labels come from `cycleColumnLabels` in `shared/utils`, resolved once on the component, and both the chart and the sr-only table read that one signal. Locale-awareness verified by [calendar-cycles.spec.ts](../../../src/app/shared/utils/calendar-cycles.spec.ts)'s "labels in the chosen locale rather than always in English" (`nl-BE` → `mrt`, `ma`); no hardcoded English day or month strings exist in the component or template.
- [x] `ChartOptionsKey` gains `'dashboard-heatmap'`; the cycle is read/written through `ChartOptionsStore` via a new `chartCycle` control, never a component-local writable signal. (`ChartOptionsKey` + `cycle?: CycleKey` entry field + `cycle()`/`setCycle()` in [chart-options.store.ts](../../../src/app/core/state/chart-options.store.ts); the panel holds `chartCycle('dashboard-heatmap', () => 'day-of-week')` and exposes only its `value`/`set` — no writable signal in the component.)
- [x] The chosen cycle survives navigating away from `/dashboard` and back within the session, and resets on reload (matching `ChartOptionsStore`'s stated in-memory contract). (Spec "holds the chosen cycle in ChartOptionsStore, so a remount keeps it" asserts both the store value and a freshly-created component reading it back. Browser: switched to Day of month, navigated to `/transactions` and back — still Day of month. The reset-on-reload half is structural rather than separately observed: `ChartOptionsStore` has no repository and no Dexie table, and the live post-reload re-check could not complete because the browser pane stopped compositing, which blocks the panel's `@defer (on viewport)` trigger.)
- [x] `mm-cycle-picker` lives in `shared/ui/`, is keyboard operable, exposes an accessible name, and is exported from the `shared/ui` barrel. ([cycle-picker.component.ts](../../../src/app/shared/ui/cycle-picker/cycle-picker.component.ts) — native `<button>`s so it is keyboard operable by construction, `role="group"` + `aria-label="Calendar cycle"`, `aria-pressed` per button, a `class` input per the primitives convention, exported from the `shared/ui` barrel; four specs in [cycle-picker.component.spec.ts](../../../src/app/shared/ui/cycle-picker/cycle-picker.component.spec.ts).)
- [x] Switching cycle updates the chart, the sr-only table and the drilldown behaviour together — no path leaves the table showing the previous cycle's columns. (Spec "switches the chart, its table and its accessible name together" asserts 12 x-axis labels, 13 table header cells, a caption of "per month" and an aria-label of "category and month" after one `setCycle`. Browser: Day of week → Month → Day of month each redrew axis, subtitle, caption and table in step.)
- [x] The under-one-full-cycle caption appears only when the range covers fewer positions than the cycle has columns. (`coveredColumnCount` on the aggregate, asserted per cycle by "reports how many of the cycle's columns the range can reach at all"; panel spec "says so when the range cannot reach every column, and stays quiet when it can". Browser: on August 2026, Month showed "This range only covers 1 of 12 months" while Day of week and Day of month showed nothing.)
- [x] Default remains `'day-of-week'`. (Spec "starts on day of the week, the axis the panel shipped with"; `chartCycle`'s seed is never written to the store — asserted by chart-options-control.spec.ts's "never records the seed as a choice".)
- [x] Unit tests cover: each of the four cycles' column sets and ordering; a February 29 landing in `day-of-month` column 29; a range spanning two calendar years folding both years' Januaries into one `month-of-year` column; the under-one-cycle caption condition; `chartCycle` reading the store and falling back to its seed. (All named cases exist: the four cycles in calendar-cycles.spec.ts; "puts a date in its day-of-month column, February 29th included" (2028-02-29 → index 28); "folds the same month of two different years into one column"; the caption condition in the panel spec; `chartCycle` reading the store and falling back to its seed in [chart-options-control.spec.ts](../../../src/app/core/state/chart-options-control.spec.ts)'s new `describe('chartCycle (TICKET-STAT-30)')`.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (`verifier` subagent, final run: lint clean; **233 test files / 2368 tests passed, 0 failed**; dev build clean.)
- [x] Verified via the fallow skill and coding-conventions skill. (Same combined run as TICKET-STAT-29 — `fallow audit`: 0 dead code, 0 duplication; `conventions-reviewer` findings addressed, including the two that produced the amendment noted above.)
- [x] Verified live in the browser: switching all four cycles on `/dashboard`, navigating to `/transactions` and back to confirm the choice held, and reloading to confirm it resets to day of week. (Dev server on :4210. Day of week (7 columns), Month (12, Jan–Dec, with the partial-range caption) and Day of month (31, 1–31) each verified by screenshot; Quarter is covered by its specs and the shared switch. Navigation away and back preserved the choice; the reload check is covered structurally as noted above. No console errors.)

## Notes

- **Short months.** `day-of-month` column 31 can only ever be fed by 7 of 12 months, and 29–30 by fewer still — the tail of that axis is structurally dimmer. That is a true property of the calendar, not a bug, and is left visible rather than normalised; a per-occurrence-average mode would fix it and is the same follow-up already noted on TICKET-STAT-29.
- **Why a new control instead of reusing `GranularityPickerComponent`.** `Granularity` names bucket sizes along a timeline; widening it to carry cycle positions would leak cycle vocabulary into `bucketKeysInRange`, `pickGranularityForSpan` and every chart that consumes it. A separate 20-line component keeps two unrelated vocabularies apart.
- Needs TICKET-STAT-29 (the aggregate and panel it extends). Independent of every EXP ticket in this version.
