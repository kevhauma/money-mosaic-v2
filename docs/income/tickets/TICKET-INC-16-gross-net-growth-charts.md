# TICKET-INC-16 — "Net vs gross" section: a 2×2 grid of take-home rate and three growth charts

- **Area:** Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
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
- **Added 2026-08-01, at the user's request after the section shipped.** A month whose gross or net comes
  out as **zero** is dropped from all four cells rather than plotted: no counted income landed (or the
  entered gross was zero), so the comparison has nothing to say about it, and drawing it drags the net
  line to the floor and squashes the scale every other month is read on. Deliberately *not* the same as a
  **missing** gross (`null`), which keeps its documented gap while the net line carries on — "not entered"
  is a different fact from "zero", and the section still has something to say about that month. The filter
  runs before `computeGrossNetGrowth`, so the from-start baseline is the first *shown* month.
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

> **Implementation note, 2026-08-01.** Two choices the ticket left open, resolved while building:
> - **`IncomeGrossNetPanelComponent` was folded in**, not kept as a child: its folder was renamed to
>   `income-gross-net-section/` (a `git mv`, so the history follows), its option builder moved to
>   `feature-income/gross-net-chart-options.ts` next to the three new ones, and its component spec
>   became the section spec's "the take-home cell (moved from TICKET-INC-14)" block. Keeping a
>   component called "panel" that is no longer a panel would have been the worse half of the choice.
> - **The four cells share one presentational `IncomeChartCellComponent`** (sub-heading + chart +
>   `sr-only` table) rather than each re-authoring that chrome — the `income-category-checklist`
>   pattern, and four copies of the same table markup is four chances to drift.

- [x] `computeGrossNetGrowth` picks the earliest bucket where both gross and net are known as the shared
      baseline; unit test where gross starts three months after net and every `*FromStart` field is `null`
      for those three months and `0` at the baseline. (`core/stats/gross-net-growth.ts`;
      `gross-net-growth.spec.ts` → "anchors on the earliest bucket where gross and net are both known",
      "uses one baseline for both series, not one each", "still reports the levels for the months before
      the baseline — they are real data", "leaves every from-start field null when no month has a gross
      wage at all".)
- [x] `*FromStart` values equal `value − baseline` and `*PctFromStart` equal `(value − baseline) / baseline`
      for a hand-computed fixture; unit test asserting the actual numbers, both directions (a rise and a
      cut). (Specs "reports value − baseline for a rise and for a cut", "reports (value − baseline) /
      baseline as the percentage, both directions", "shows gross outrunning net when the deduction rate
      climbs".)
- [x] A zero baseline yields `null` percentages, never `Infinity`/`NaN`; unit test. (Spec "yields null
      percentages for a zero baseline, never Infinity or NaN", which also asserts the absolute distance
      stays well-defined.)
- [x] A month with no `SalaryMetadata` row yields `null` for every gross field while the net fields stay
      populated; unit test, plus a chart-option test asserting `connectNulls: false`. (Spec "nulls every
      gross field while the net fields carry on"; `gross-net-chart-options.spec.ts` → "breaks only the
      gross line over a month with no wage entered", asserting `connectNulls === false` on both series.)
- [x] **Added 2026-08-01** — a month whose gross or net is zero is dropped from all four cells, while a
      *missing* gross keeps its gap; the from-start baseline is the first shown month. (Section spec →
      "months with nothing to compare" → "skips a month where no counted income landed, rather than
      dragging net to the floor", "skips a month whose entered gross was zero", "keeps a month with income
      but no gross entered — 'not entered' is not 'zero'", "measures growth from the first *shown* month,
      so a skipped one cannot be the baseline".)
- [x] Net uses the same basis as the take-home panel — annually-smoothed categories excluded and the
      recorded `bonus` subtracted (TICKET-INC-14) — so a bonus can't read as a raise on the growth-from-start
      charts; unit test with a flagged bonus category asserting a flat percentage line across its deposit month.
      (The section feeds `computeGrossNetRatio`'s output straight into `computeGrossNetGrowth`, so the
      basis is defined in one place; section spec "keeps a flagged bonus category out of the growth basis,
      so it cannot read as a raise" — a 12,000 13th month in February leaves the percentage line at 0%.)
- [x] All three new charts render with the correct axis formatter (currency, currency, percent) and both
      series named; unit tests on the pure option builders, no TestBed. (`gross-net-chart-options.spec.ts`
      → "plots the levels themselves on the absolute chart, with a currency axis", "plots the distance
      travelled on the from-start chart, with a currency axis", "plots the same distance as a percentage
      on the percent chart, with a percent axis", plus "draws the baseline on both from-start charts".)
- [x] The section renders **four** chart cells under one "Net vs gross" heading in a grid that is one
      column on narrow screens and two from `md:`; component spec asserts the cell count, each cell's
      sub-heading, and the grid classes. (Section spec → "the grid" → "renders four chart cells under one
      'Net vs gross' heading", "names each cell, since one section heading cannot name four charts", "is
      one column on narrow screens and two from md:".)
- [x] The take-home band chart is the moved TICKET-INC-14 chart, not a reimplementation: its option builder
      is reused as-is and every assertion in ~~`income-gross-net-panel.component.spec.ts`~~ still holds
      (moved onto the section's spec, since the component **was** folded in — see the note above) —
      including the 0–100% axis, the two stacked bands, the >100% clip and the no-gross gap.
      (`buildTakeHomeChartOption` moved verbatim to `gross-net-chart-options.ts`; all eleven of its builder
      assertions moved verbatim to `gross-net-chart-options.spec.ts`, and all seven component assertions
      to the section spec's "the take-home cell" block.)
- [x] The standalone take-home `mm-paper` row no longer exists in
      `income-overview.component.html`; overview spec asserts exactly one gross-vs-net surface on the page.
      (`income-overview.component.html:66` now mounts `app-income-gross-net-section`; overview spec "has
      exactly one gross-vs-net surface on the page (TICKET-INC-16)".)
- [x] Each chart has an `sr-only` companion table sourced from the same signal, and the **section** renders
      a single empty state when no gross wage exists anywhere — not four. (`IncomeChartCellComponent`'s
      template; section specs "gives every cell an sr-only companion table" and "shows one empty state for
      the whole section, not four, when no gross wage exists yet" — which asserts zero cells render.)
- [x] The gross series' color comes from TICKET-SET-08's resolver; unit test that changing the setting
      changes the built options of all four charts (the band's withheld area included). (Resolved once into
      `grossColor()` and handed to all four builders; section spec "draws gross in the picked color across
      every cell (TICKET-SET-08)", plus the two builder specs "takes the withheld band's color from the
      gross-series resolver, not a literal" and "takes the gross line's color from the resolver, leaving
      net on the theme's slot".)
- [x] No persistence changes, no Dexie version bump — every figure derives from existing
      `Transaction`/`SalaryMetadata` data. (`git diff` touches no `app-db.ts` and no repository.)
- [x] `angular.json` bundle budgets **not raised** — three more charts reuse the already-bundled echarts
      line/grid components and add no new dependency; confirm the dev build's budget output is unchanged.
      (`git diff` touches no `angular.json`. Measured rather than assumed: `ng build` at HEAD and with the
      change both report an initial total of **844.74 kB / 160.37 kB** — identical, because the section is
      inside the lazy `income-overview-component` chunk. The dev build emits no budget output at all.)
- [x] Four charts in one viewport stay responsive: each cell sizes from its grid track rather than a fixed
      width, and the section doesn't overflow horizontally at mobile width. (Grid is
      `grid-cols-1 md:grid-cols-2`; every chart host is `w-full` with no fixed width anywhere in
      `income-chart-cell.component.html`; section spec "sizes each cell from its grid track rather than a
      fixed width".)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD` →
      `verdict: pass`, `complexity_introduced: 0` after splitting `unmeasurable`/`measured` out of
      `computeGrossNetGrowth`'s map callback, `duplication_introduced: 0` — the shared cell component is
      what keeps the four cells from being a clone group. Conventions: pure builders in a feature-root
      `.ts` module, one folder per component, `sr-only` companion tables per TICKET-UI-07, currency and
      percentages through `formatCurrency`/`formatPercent`.)
- [ ] Verified live in the browser: the "Net vs gross" section renders as a 2×2 grid over real data with
      gross above net, the from-start charts start at zero, a month with no gross entry breaks only the
      gross line, and the grid collapses to one column on a narrow window. — **skipped at the user's
      request** ("skip the browser check"), not verified.

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
