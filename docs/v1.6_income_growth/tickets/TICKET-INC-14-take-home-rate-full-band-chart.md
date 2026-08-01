# TICKET-INC-14 — Take-home rate as a full 0–100% band on plain salary

- **Area:** Income
- **Type:** Feature
- **Traceability:** revises FR-INC-11 (gross/net ratio)

## User story

As a user, I want the take-home-rate chart to compare my *plain salary* against its gross on a fixed
0–100% scale, drawn as a filled band of "what I kept" under "what was withheld", so I can read my
deduction rate at a glance instead of squinting at a wobbly line whose axis rescales itself.

## Description

Three changes to the take-home-rate panel: exclude annually-smoothed income from the net side so the ratio
is salary-against-salary-gross; pin the y-axis to 0–100% instead of letting echarts fit it; and render it
as two stacked bands (kept / withheld) that always fill the plot area, so the chart reads as a proportion
rather than as a line hovering somewhere in the middle.

## Current situation (as-is)

- [gross-net-ratio.ts](../../../src/app/core/stats/gross-net-ratio.ts)'s `computeGrossNetRatio` sums
  **every** series in the trend it's handed, i.e. every category the user counts under FR-INC-3. A category
  flagged as an annual lump sum under FR-INC-4 is still in that sum — the helper is given
  `rawIncomeTrend()`, and "raw" means unsmoothed, not unfiltered. So a separately-categorised 13th month
  lands whole in its deposit month's `net` and drives that month's ratio well above the user's real
  take-home rate, sometimes past 100%.
- [income-gross-net-panel.component.ts](../../../src/app/feature-income/components/income-gross-net-panel/income-gross-net-panel.component.ts)'s
  `buildGrossNetChartOption` draws one `type: 'line'` series of `ratio` values with a bare
  `yAxis: { type: 'value' }` — echarts fits the axis to the data, so a history sitting between 82% and 88%
  renders as dramatic hills across a ~6-point axis, and one out-of-band month rescales the whole chart.
- Months with no `SalaryMetadata` row are already `null` with `connectNulls: false`, which is correct and
  stays.

## Desired result (to-be)

- `computeGrossNetRatio(trend, salaryMetadataByMonth, excludedCategoryIds)` gains a third argument — the
  category ids whose income must not count toward `net`. The panel passes
  `IncomeStore.smoothedBonusCategoryIds()`: income the user has already declared to be a once-a-year lump
  sum is not part of the monthly wage a monthly gross figure describes. The existing per-month `bonus`
  subtraction (FR-INC-10) is unchanged and still applies on top, so both bonus mechanisms are excluded from
  the take-home basis by the same rule.
- `GrossNetRatioPoint` gains a derived companion for the chart rather than changing meaning: the panel maps
  each point to a `kept` / `withheld` pair —
  `kept = ratio === null ? null : Math.min(ratio, 1)`, `withheld = ratio === null ? null : Math.max(0, 1 - ratio)`.
- `buildGrossNetChartOption` renders two stacked area series on a fixed axis:
  - `yAxis: { type: 'value', min: 0, max: 1 }` with `formatPercent` labels — the scale is the point, so it
    never rescales.
  - Series 1 "Take-home" (`kept`), series 2 "Withheld" (`withheld`), `stack: 'rate'`, both with
    `areaStyle`, so together they always fill the plot area — the shape in the reference screenshot.
  - A month whose ratio exceeds 100% clips at the top: `kept` fills the band, `withheld` is 0. The
    **tooltip still names the true figure** (e.g. "104% — more reached the account than the gross entered
    for this month"), so a clipped month is legible rather than silently flattened.
  - Colors: "Withheld" (the top band) uses the gross-series color resolver from TICKET-SET-08; "Take-home"
    keeps the theme's categorical slot. Both are read through `@/shared/echarts`, never hardcoded in the
    component.
- Months with no gross entry stay `null` in **both** series — `connectNulls: false` leaves a genuine gap in
  the band, not a column of zero.

## Acceptance criteria

- [ ] Income from a category in `smoothedBonusCategoryIds` is excluded from `net`; unit test where flagging
      the bonus category drops that month's ratio from >100% back to the regular rate, and the other months
      are unchanged.
- [ ] Passing an empty exclusion set reproduces the current figures exactly — regression test, so every
      existing `gross-net-ratio.spec.ts` case still holds.
- [ ] The per-month `bonus` subtraction still applies after the exclusion, and both together are applied
      exactly once (a month with a flagged category *and* an embedded bonus doesn't double-subtract) — unit
      test.
- [ ] The chart option pins `yAxis.min: 0` and `yAxis.max: 1`; unit test on `buildGrossNetChartOption`
      asserting both, over data that would otherwise auto-fit to a narrow band.
- [ ] Two stacked area series ("Take-home" and "Withheld") sharing one `stack` id, whose values sum to
      exactly 1 for every month with a gross entry; unit test over a mixed fixture.
- [ ] A month whose ratio exceeds 100% renders `kept: 1, withheld: 0` and its tooltip states the real
      percentage; unit test.
- [ ] A month with no `SalaryMetadata` row is `null` in both series with `connectNulls: false` — the
      existing gap behaviour, re-asserted as a regression test.
- [ ] The accessible companion table still prints the true (unclipped) ratio and `—` for a month with no
      entry, from the same signal the chart renders.
- [ ] The gross/withheld band's color comes from the TICKET-SET-08 resolver, not a literal in the
      component; unit test that changing the setting changes the built option.
- [ ] No persistence changes (no new `AppSettings` field here — the color setting is TICKET-SET-08), no
      Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: the panel renders a full-height two-tone band with a fixed 0–100% axis;
      flagging a bonus category visibly removes its spike; a month with no gross entry shows a gap.

## Notes

- Deliberately the **opposite** call from TICKET-INC-13 for the same underlying data, and consistent with
  it: on the trend chart a lump sum is real income that should be spread out; on the take-home rate it
  isn't part of the monthly wage the gross figure describes at all, so it's removed rather than spread. The
  two never disagree about what counts as a bonus — both read the same `smoothedBonusCategoryIds` /
  `SalaryMetadata.bonus`.
- Still reads `rawIncomeTrend()`, never the smoothed series — TICKET-INC-11's core rule (a gross wage is
  entered for a specific month, so the comparison must be against what actually landed that month) is
  unchanged. This ticket changes *which categories* are summed, not *which month* they're summed in.
- Clipping at 100% rather than extending the axis is a deliberate trade: a >100% month means the entered
  gross is wrong or incomplete, and rescaling the whole history around one such month hides the trend the
  panel exists to show. The tooltip carries the truth.
- Depends on TICKET-SET-08 for the band color; the rest can be built before it lands, falling back to the
  theme palette.
- This chart keeps its own panel only until TICKET-INC-16 lands, which re-homes it as one cell of a 2×2
  "Net vs gross" section. Build it here as a chart with a pure option builder plus a thin host, so that
  move is a re-mount rather than a rewrite.
