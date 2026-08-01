# TICKET-INC-16 — "Net vs gross" section: a 2×2 grid of take-home rate and three growth charts

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-13 (new) — builds on FR-INC-10/FR-INC-11

## User story

As a user, I want one "Net vs gross" section holding a 2×2 grid of four charts — my take-home rate plus
the absolute level, the absolute change since my first recorded month, and the percentage change since
that month, each plotting gross against net — so everything that compares the two lives in one place
instead of a take-home panel and a growth panel that never look at each other.

## Description

Turns the standalone take-home-rate panel into a **"Net vs gross" section**: the same take-home band chart
plus three new gross-vs-net charts, laid out as a 2×2 grid under one heading. The levels themselves, the
absolute distance travelled from the first comparable month, and that same distance as a percentage. The
percentage chart is the one that answers the real question — gross and net growing at the same rate means
raises pass through intact, gross outrunning net means the deduction rate is climbing.

## Current situation (as-is)

- Gross pay exists per month as `SalaryMetadata.grossWage` (FR-INC-10,
  [app-db.ts](../../../src/app/core/data-access/app-db.ts)), exposed as
  `IncomeStore.salaryMetadataByMonth()`.
- Exactly one surface joins gross to net:
  [gross-net-ratio.ts](../../../src/app/core/stats/gross-net-ratio.ts) →
  [income-gross-net-panel](../../../src/app/feature-income/components/income-gross-net-panel/income-gross-net-panel.component.ts),
  and it only ever plots their *ratio*. The two underlying levels are never drawn, so "my gross went up 4%,
  my net went up 2%" is not visible anywhere.
- That panel is a lone `mm-paper` holding one chart, mounted between the growth panel and the yearly panel
  in [income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html) —
  a full-width row for a single small chart, and no section on the page groups "things that compare gross
  to net".
- The growth panel (FR-INC-5) reports net-only percentage deltas as two stat cards, against fixed baselines
  (last complete month vs. the start of the year / a year earlier) — not a series over time, and never gross.
- The yearly panel (FR-INC-6/7) is net-only and bucketed by calendar year.

## Desired result (to-be)

- New pure helper `computeGrossNetGrowth(points)` in `core/stats/gross-net-growth.ts`, taking
  `computeGrossNetRatio`'s `GrossNetRatioPoint[]` (so gross, net and the exclusion rules are defined in
  exactly one place — see Notes) and returning per month:
  `{ bucketKey, grossValue, netValue, grossFromStart, netFromStart, grossPctFromStart, netPctFromStart }`,
  every field `number | null`.
- **Shared baseline:** the earliest bucket where gross *and* net are both known. Every `*FromStart` field is
  `null` before it (there is nothing to measure from), and `0` at it. One shared baseline rather than one
  per series, so the two lines are answering the same question — the whole point of drawing them together.
- `*PctFromStart` is `null` when the baseline value is zero, following `percentDelta`'s rule — never
  `±Infinity`/`NaN`.
- New **"Net vs gross" section** (`IncomeGrossNetSectionComponent`) — one `mm-paper` with one heading,
  holding a 2×2 grid (one column on narrow screens, two from `md:`), in the reading order of the reference
  screenshot:
  1. **Absolute growth** — `grossValue` / `netValue`, currency axis.
  2. **Take-home rate** — TICKET-INC-14's stacked 0–100% band, *moved here unchanged*: its chart and its
     option builder are re-mounted as a grid cell, losing only its own `mm-paper` and heading to the
     section's. `IncomeGrossNetPanelComponent` becomes a presentational chart component inside the section
     (or is folded into it outright — implementer's choice, document which), and disappears from
     `income-overview.component.html` as a standalone row.
  3. **Percentage growth from start** — `grossPctFromStart` / `netPctFromStart`, percent axis, zero line
     visible.
  4. **Absolute growth from start** — `grossFromStart` / `netFromStart`, currency axis, zero line visible.
- Months with no `SalaryMetadata` row leave the gross series `null` (`connectNulls: false`, the existing
  gap convention) while the net series continues — the net line is never interrupted by a month the user
  hasn't annotated.
- The gross series' color comes from TICKET-SET-08's resolver; the net series takes the theme's categorical
  slot. Both through `@/shared/echarts`, never hardcoded.
- Each chart carries the standard screen-reader companion table (`sr-only`, TICKET-UI-07 shape) built from
  the same signal it renders, and the **section** shows one empty state when no month has a gross wage —
  the refusal `IncomeGrossNetPanelComponent.hasAnyGross` already makes, lifted to cover all four cells
  (without a gross figure none of them can say anything) rather than four separate empty boxes.
- Each cell carries its own sub-heading, since one section heading can't name four charts.
- Mounted in [income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html)
  where the take-home panel is today — between the growth panel and the yearly panel — so the page keeps
  its current top-to-bottom story.

## Acceptance criteria

- [ ] `computeGrossNetGrowth` picks the earliest bucket where both gross and net are known as the shared
      baseline; unit test where gross starts three months after net and every `*FromStart` field is `null`
      for those three months and `0` at the baseline.
- [ ] `*FromStart` values equal `value − baseline` and `*PctFromStart` equal `(value − baseline) / baseline`
      for a hand-computed fixture; unit test asserting the actual numbers, both directions (a rise and a
      cut).
- [ ] A zero baseline yields `null` percentages, never `Infinity`/`NaN`; unit test.
- [ ] A month with no `SalaryMetadata` row yields `null` for every gross field while the net fields stay
      populated; unit test, plus a chart-option test asserting `connectNulls: false`.
- [ ] Net uses the same basis as the take-home panel — annually-smoothed categories excluded and the
      recorded `bonus` subtracted (TICKET-INC-14) — so a bonus can't read as a raise on the growth-from-start
      charts; unit test with a flagged bonus category asserting a flat percentage line across its deposit month.
- [ ] All three new charts render with the correct axis formatter (currency, currency, percent) and both
      series named; unit tests on the pure option builders, no TestBed.
- [ ] The section renders **four** chart cells under one "Net vs gross" heading in a grid that is one
      column on narrow screens and two from `md:`; component spec asserts the cell count, each cell's
      sub-heading, and the grid classes.
- [ ] The take-home band chart is the moved TICKET-INC-14 chart, not a reimplementation: its option builder
      is reused as-is and every assertion in `income-gross-net-panel.component.spec.ts` still holds (moved
      onto the section's spec if the component is folded in) — including the 0–100% axis, the two stacked
      bands, the >100% clip and the no-gross gap.
- [ ] The standalone take-home `mm-paper` row no longer exists in
      `income-overview.component.html`; overview spec asserts exactly one gross-vs-net surface on the page.
- [ ] Each chart has an `sr-only` companion table sourced from the same signal, and the **section** renders
      a single empty state when no gross wage exists anywhere — not four.
- [ ] The gross series' color comes from TICKET-SET-08's resolver; unit test that changing the setting
      changes the built options of all four charts (the band's withheld area included).
- [ ] No persistence changes, no Dexie version bump — every figure derives from existing
      `Transaction`/`SalaryMetadata` data.
- [ ] `angular.json` bundle budgets **not raised** — three more charts reuse the already-bundled echarts
      line/grid components and add no new dependency; confirm the dev build's budget output is unchanged.
- [ ] Four charts in one viewport stay responsive: each cell sizes from its grid track rather than a fixed
      width, and the section doesn't overflow horizontally at mobile width.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: the "Net vs gross" section renders as a 2×2 grid over real data with
      gross above net, the from-start charts start at zero, a month with no gross entry breaks only the
      gross line, and the grid collapses to one column on a narrow window.

## Notes

- Sourcing from `GrossNetRatioPoint[]` rather than re-deriving from the trend is the point: it makes
  "gross" and "net" mean the same thing on every panel of this page, and it means TICKET-INC-14's exclusion
  rules apply here for free instead of being restated (and eventually drifting).
- Depends on TICKET-INC-14 for **both** the net basis and the take-home chart this section absorbs, and on
  TICKET-SET-08 for the gross color (buildable ahead of SET-08 with a theme-palette fallback). Building
  INC-14 first and moving its finished chart is deliberately cheaper than building the section first and
  reworking the chart inside it.
- The section replaces the take-home panel's own wrapper rather than nesting one panel inside another —
  the same card-in-a-card the growth panel gets rid of in TICKET-INC-15.
- Cell order follows the reference screenshot (absolute, take-home, % from start, absolute from start)
  rather than grouping the three new charts together: it puts the two "levels" charts on the top row and
  the two "since the start" readings below, which is how the pair is actually read.
- Deliberately **not** a forecast: every line is retrospective, consistent with the version overview's
  parking of forecasting under v3.
