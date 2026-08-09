# TICKET-STAT-33 — An "All" row at the top of the spending heatmap

- **Area:** Dashboard
- **Type:** Feature
- **Traceability:** extends **FR-STAT-15**
  ([TICKET-STAT-29](./TICKET-STAT-29-spending-heatmap-panel.md) ships
  the panel this adds a row to; the cycle it folds onto comes from
  [TICKET-STAT-30](./TICKET-STAT-30-heatmap-cycle-switcher.md), and the
  categories it sums honour
  [TICKET-STAT-32](./TICKET-STAT-32-heatmap-exclude-categories.md)'s
  exclusions). Colouring is
  [TICKET-STAT-34](./TICKET-STAT-34-heatmap-per-category-colour-scales.md)'s subject.

## User story

As someone reading the spending heatmap, I want a summary row across the top showing what I spend in
total per day of the week, so I can see the overall rhythm of my spending before I start reading it
category by category.

## Description

Adds a totals band above the category rows: one cell per column holding the sum of every category the
heatmap is currently showing. It answers "when do I spend, full stop", which the per-category grid
can only be read to infer — four moderate rows can hide a Friday that is the heaviest day overall.

## Current situation (as-is)

- `computeCategoryCycleHeatmap`
  ([category-cycle-heatmap.ts](../../../src/app/core/stats/category-cycle-heatmap.ts)) returns
  `rows` (the top 4 categories plus an `Other` fold), a dense row-major `cells` grid, `maxAmount` and
  `coveredColumnCount`. There is no total per column anywhere in the result.
- The panel
  ([spending-heatmap-panel.component.ts](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.ts))
  maps `rows`/`cells` straight onto one echarts `heatmap` series with a single `visualMap` spanning
  `0..maxAmount`, and mirrors the same signal into the `sr-only` companion table via
  `accessibleRows`.
- Reading the total for a column today means adding four or five cells by eye, in a chart whose
  encoding is colour rather than number.

## Desired result (to-be)

- The aggregate gains a **`totalsRow`** — its own field on `CategoryCycleHeatmap`, holding one amount
  per column, the sum of the `cells` grid down each column. Deliberately *not* pushed into `rows`:
  `rows`/`cells`/`maxAmount` are the per-category contract three other things already read, and a
  summary band that is always the largest value in the grid has no business redefining them.
- The panel renders it as the **top band** of the heatmap, above the category rows, labelled `All`.
- **It is scaled on its own**, against its own maximum — not against the category rows'. A shared
  scale would set every category cell against a number 4–5× larger than anything they contain and
  flatten the whole grid to the pale end, which is the opposite of what the row is for.
- **A visible gap separates it from the category rows**, so it reads as a summary band rather than as
  a fifth category competing with them.
- Everything already true of the grid stays true of the band: it honours STAT-32's exclusions (it
  sums what the chart is showing, never what it is hiding), it re-folds when STAT-30's cycle changes,
  its figures appear in the `sr-only` table as a first row, and its amounts are withheld under
  privacy mode exactly as the category rows' are.
- Clicking a cell in the band drills down to the panel's range with **no category filter** — the same
  thing the `Other` row already does, for the same reason: the cell stands for several categories.

## Acceptance criteria

- [x] `computeCategoryCycleHeatmap` returns a `totalsRow` whose value at each column equals the sum
      of that column across `cells`, and leaves `rows`, `cells`, `maxAmount` and
      `coveredColumnCount` byte-for-byte unchanged (the existing STAT-29..32 specs still pass).
      (Accumulated inside `buildGrid` off the same clamped cell the grid draws, so the two can't
      disagree. `category-cycle-heatmap.spec.ts` › "holds the sum of every column of the grid" —
      which asserts the literal `[940, 0, 0, 0, 0, 25, 0]` *and* re-derives every column from
      `cells` — and "leaves rows, cells, maxAmount and coveredColumnCount exactly as they were",
      which pins `maxAmount` at 900 while the band's Monday is 940. Every pre-existing STAT-29..32
      aggregate spec passes untouched — the diff to that spec file is purely additive, with no
      removed lines.)
- [x] The heatmap renders the band as its top row, labelled `All`, above the category rows.
      (`buildHeatmapChartOption`'s y-axis is `[...categories reversed, '', 'All']`;
      `spending-heatmap-panel.component.spec.ts` › "draws the band on top, separated from the
      categories by an empty axis row" and "plots one band cell per column, holding the aggregate's
      totals".)
- [x] The band is coloured against its own maximum, so the category rows' shading is identical with
      and without it. (Its own `rowScale(totalsRow)` fed to STAT-34's `resolveHeatmapCellColor`.
      Spec › "scales the band on its own maximum, off the theme's leading accent", and ›
      "leaves the category rows' shading identical to what it is without the band", which
      multiplies the band 100× and re-asserts all four category cells byte-for-byte.)
- [x] A visible gap or divider separates the band from the category rows. (**Revised 2026-08-09 at
      the user's direction**: the first build used a whole empty y-axis row, which the browser check
      showed to be a ~32px band — far more than a separator needs. The band and the categories are
      now **two grids**, the band's 22px strip above the categories' with a 10px margin between
      them; an echarts category axis spaces its rows evenly, so a single grid could only separate
      them with a whole row. Spec › "draws the band on its own grid above the categories, with a
      margin between them", which asserts the categories' grid starts below the band's strip plus a
      gap and that both grids share a left inset so the columns line up.)
- [x] Excluded categories (STAT-32) are absent from the totals, and changing the cycle (STAT-30)
      re-folds the band with the grid. (`category-cycle-heatmap.spec.ts` › "sums what the chart is
      showing, never what an exclusion is hiding" and › "re-folds with the cycle"; end-to-end
      through the panel in `spending-heatmap-panel.component.spec.ts` › "follows the totals when a
      category is excluded", where Monday drops €940 → €40, and › "re-folds with the cycle".)
- [x] The `sr-only` companion table carries the band as its first row, named `All`, reading
      `hidden` per cell under privacy mode like every other row. (`accessibleRows` prepends it and
      routes every amount — the band's included — through the same `asText`. Specs › "leads the
      screen-reader table with an \"All\" row of the column totals" and › "withholds the band's
      figures under privacy mode like every other row".)
- [x] Clicking a band cell navigates to `/transactions` with the panel's range and no `categoryId`.
      (`drilldownFor` returns `{}` for the band — identified by its `seriesIndex`, now that it is
      its own series — exactly what it returns for the `Other` fold's `null` category. Spec ›
      "drills down to the range with no category filter, like the \"Other\" fold".)
- [x] The panel still renders nothing at all when there is no spend (`hasSpend()` is unchanged — a
      band of zeroes is not a reason to show an empty chart). (`hasSpend` is the same expression it
      was; spec › "still renders nothing at all when there is no spend". The aggregate returns a
      `totalsRow` of zeroes rather than an empty array in that case —
      `category-cycle-heatmap.spec.ts` › "is a column of zeroes — not an empty array".)
- [x] Unit tests cover: the column sums against a known grid; exclusions leaving the totals; the
      untouched `maxAmount`; the band's own scale; the accessible table's first row, including its
      privacy-mode text; the band's drill-down params. (Five cases in `category-cycle-heatmap.spec.ts`
      › "the totals band (TICKET-STAT-33)", five in the panel spec's › "the \"All\" band
      (TICKET-STAT-33)", and five more through the option builder in its own › "the \"All\" band"
      block. 2649 tests green overall, up from 2633.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (2026-08-09: lint
      clean, 243 files / 2649 tests green, dev build completes. Two specs unrelated to this ticket —
      `import-wizard.component.spec.ts` and `app.routes.spec.ts` — flake intermittently under load,
      a known pre-existing issue; a clean full run was obtained and neither heatmap spec ever
      appeared among the failures.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`:
      verdict **pass**, 0 dead code, 0 duplication, 0 introduced complexity — `onChartClick` first
      landed at CRAP 56 and the row→drill-down decision was extracted into the pure `drilldownFor`
      to clear it. `conventions-reviewer` on the diff: convention-clean, no violations.)
- [ ] Verified live in the browser: the `All` band on `/dashboard`, separated from the categories,
      with a category excluded and re-included to watch the totals follow. **Partly done, 2026-08-09
      — not yet complete.** Confirmed on the canvas *before* the two-grid revision: the band drew on
      top, its cells matched `totalsRow` (`[1174.54, 56.29, 1173.25, …]`, verified against the
      `sr-only` table), and the separator was a real ~32px empty band. That check is also what
      exposed the blank-chart bug. **Still to confirm on the revised build**: the 10px margin, and
      the exclusion round-trip. The Browser pane stopped compositing, so the panel's `@defer` block
      no longer mounts — waiting on the pane being displayed again.

## Notes

- **Cheaper after [TICKET-STAT-34](./TICKET-STAT-34-heatmap-per-category-colour-scales.md).** That
  ticket replaces the panel's single `visualMap` with per-row colour resolution, which is exactly the
  machinery a separately-scaled band needs. Built first instead, this ticket has to arrange two
  scales on its own (two series with a `visualMap` each, targeted by `seriesIndex`) — workable, but
  STAT-34 then deletes it. Either order ships; this is why the overview lists STAT-34 first.
- **The band has no category colour**, since it is not a category. It takes the theme's leading
  accent — the slot STAT-29's ramp is already built from — rather than
  `CHART_NO_COLOR_FALLBACK`'s grey, which reads as "uncategorised" and would be a lie.
- The row is `All`, not `Total`: the columns are cyclical folds, so the number is a sum across every
  Monday in the range, and "total" invites reading it as a period total.
- A per-column **average** band was considered and rejected — it would need its own denominator
  ("how many Mondays does this range contain"), which is `coveredColumnCount`'s question at day
  granularity and a ticket of its own.
