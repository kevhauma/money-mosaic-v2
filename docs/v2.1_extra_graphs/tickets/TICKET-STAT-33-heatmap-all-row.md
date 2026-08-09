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

- [ ] `computeCategoryCycleHeatmap` returns a `totalsRow` whose value at each column equals the sum
      of that column across `cells`, and leaves `rows`, `cells`, `maxAmount` and
      `coveredColumnCount` byte-for-byte unchanged (the existing STAT-29..32 specs still pass).
- [ ] The heatmap renders the band as its top row, labelled `All`, above the category rows.
- [ ] The band is coloured against its own maximum, so the category rows' shading is identical with
      and without it.
- [ ] A visible gap or divider separates the band from the category rows.
- [ ] Excluded categories (STAT-32) are absent from the totals, and changing the cycle (STAT-30)
      re-folds the band with the grid.
- [ ] The `sr-only` companion table carries the band as its first row, named `All`, reading
      `hidden` per cell under privacy mode like every other row.
- [ ] Clicking a band cell navigates to `/transactions` with the panel's range and no `categoryId`.
- [ ] The panel still renders nothing at all when there is no spend (`hasSpend()` is unchanged — a
      band of zeroes is not a reason to show an empty chart).
- [ ] Unit tests cover: the column sums against a known grid; exclusions leaving the totals; the
      untouched `maxAmount`; the band's own scale; the accessible table's first row, including its
      privacy-mode text; the band's drill-down params.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the `All` band on `/dashboard`, separated from the categories,
      with a category excluded and re-included to watch the totals follow.

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
