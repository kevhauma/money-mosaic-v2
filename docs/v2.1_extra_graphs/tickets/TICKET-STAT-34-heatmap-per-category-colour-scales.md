# TICKET-STAT-34 — Each heatmap row shaded in its own category colour, readable in light and dark

- **Area:** Dashboard
- **Type:** Feature
- **Traceability:** revises **FR-STAT-15**'s colour encoding
  ([TICKET-STAT-29](./TICKET-STAT-29-spending-heatmap-panel.md) ships
  the single ramp this replaces). Consumed by
  [TICKET-STAT-33](./TICKET-STAT-33-heatmap-all-row.md)'s separately-scaled band. Touches
  `resolveChartHeatmapColors`, shared with no other chart.

## User story

As someone reading the spending heatmap, I want each row shaded in its own category's colour —
lighter or darker than that colour depending on whether I spent more or less than usual — so I can
tell rows apart at a glance and read each one against its own normal, in whichever theme I'm using.

## Description

Replaces the heatmap's one global colour ramp with a ramp per row, built from the row's own category
colour: the colour lands exactly on the category's configured colour at that row's **average**, and
moves away from it toward higher contrast against the page for a heavier cycle position and toward
lower contrast for a lighter one. The direction flips with the theme's mode, so "more spend" always
means "stands out more", on light and dark alike.

## Current situation (as-is)

- `resolveChartHeatmapColors`
  ([chart-theme.ts](../../../src/app/shared/echarts/chart-theme.ts)) returns **one** three-stop
  sequential ramp for the whole grid — the theme's leading accent mixed 88% and 45% into a flat
  `#000000`/`#ffffff` plot background, then the accent itself.
- `buildHeatmapChartOption`
  ([spending-heatmap-panel.component.ts](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.ts))
  feeds that ramp to a single `visualMap` spanning `0..maxAmount` across every cell in the grid.
- So **every row is the same hue**, and every cell is read against the *grid's* maximum. Two
  consequences:
  - The categories' own colours — which the user configured, and which the legend dot beside each
    category on every other panel uses — appear nowhere in the chart.
  - One heavy category sets the scale for all of them, so a lighter row's whole range of behaviour
    collapses into two barely-distinguishable pale shades. That is the same complaint
    [TICKET-STAT-32](./TICKET-STAT-32-heatmap-exclude-categories.md)
    answered by letting the user *remove* the offender; this answers it without making them.
- The `HeatmapRow` the aggregate already returns carries the category's `color`
  ([category-cycle-heatmap.ts](../../../src/app/core/stats/category-cycle-heatmap.ts)), so the
  colour is already in the panel's hands and simply unused.

## Desired result (to-be)

- **Each row gets its own ramp**, anchored on that row's own cells:
  - a cell at the row's **average** is drawn in the category's configured colour, exactly;
  - a cell **below** it moves toward *less* contrast against the plot background;
  - a cell **above** it moves toward *more* contrast against the plot background;
  - the extremes are the row's own minimum and maximum, so every row uses its full range.
- **The direction is the theme's, stated once:** on a dark theme less contrast is darker and more
  contrast is lighter; on a light theme it is the other way round. One rule — *heavier spend always
  stands out more* — rather than two palettes to keep in sync.
- **Hue stays the category's throughout.** Only lightness moves, so a row is recognisably "the
  Groceries row" at every intensity and matches the category's dot elsewhere in the app.
- A category with no configured colour keeps `CHART_NO_COLOR_FALLBACK`'s neutral grey as its anchor
  and ramps in lightness like any other row — the `Other` fold included.
- A row whose cells are all equal (including all-zero) draws flat in the category colour rather than
  dividing by a zero range.
- **The single amount scale under the chart goes away.** It maps one colour to one amount, which is
  no longer true of any row; a caption stating that shade is relative to each category's own average
  replaces it. The per-cell amounts stay available where they always were — the tooltip, and the
  `sr-only` companion table.
- Nothing else about the panel changes: the cycle picker, exclusions, drill-down, the accessible
  table's figures, and privacy mode's withholding all behave exactly as they do today.

## Implementation note — 2026-08-09, after the browser check

Two things changed during the live check and the criteria below are amended to match, rather than
left describing code that does not exist:

1. **The `visualMap` could not be removed outright.** ECharts throws
   `Error: Heatmap must use with visualMap` for a `heatmap` series on a cartesian grid and renders
   **no cells at all** without one — the whole chart came up blank. A hidden, label-less `visualMap`
   now exists purely to satisfy that; every cell's colour still comes from its own `itemStyle`,
   which takes precedence. The *reader-visible* amount scale is gone, which was the point. No
   option-shape unit test can catch this, which is why the criterion below now names the browser as
   its evidence.
2. **Per-row scales became one shared category scale**, at the user's direction on 2026-08-09:
   every category row is now read against a single scale pooled over the whole grid, so a shade
   means the same thing in every row and the rows can be compared with each other. Hue is still the
   row's own category colour. TICKET-STAT-33's `All` band is now the *only* row with its own scale.
   This deliberately gives up this ticket's original "read each row against its own normal" — the
   trade the user chose is cross-row comparability, and one heavy category can once again flatten a
   lighter one (which is what TICKET-STAT-32's exclusions exist for).

## Acceptance criteria

- [x] A pure, unit-tested colour function takes a category colour, a row's min/average/max and the
      active theme's mode, and returns the cell's colour — no component reimplements the mixing.
      (`resolveHeatmapCellColor(categoryColor, HeatmapRowScale, amount, ChartPlotMode)` in
      `shared/echarts/chart-theme.ts`; the panel's `buildHeatmapChartOption` only calls it, and the
      `#ffffff`/`#000000` endpoints live in that file's `HEATMAP_RAMP` table alone.)
- [x] A cell at its row's average resolves to the category's configured colour exactly.
      (`chart-theme.spec.ts` › "draws a cell at its row's average in the category colour exactly,
      in either mode".)
- [x] On a dark theme, a below-average cell is darker than the category colour and an above-average
      cell is lighter; on a light theme both are reversed. Asserted against the theme's actual
      `data-theme` value, the way `chart-theme.spec.ts` already drives it. (`chart-theme.spec.ts` ›
      "on a dark theme, draws below average darker and above average lighter" / "on a light theme,
      reverses both directions" — each calls `setDataTheme(...)` then `resolveChartPlotMode()`,
      which itself is specced in "resolveChartPlotMode (TICKET-STAT-34)".)
- [x] Hue is preserved: only the lightness of the category colour moves along a row's ramp.
      (`chart-theme.spec.ts` › "moves lightness only, keeping the category's hue at every
      intensity" — hue drift under 1° across five amounts × both modes; mixing toward pure
      white/black scales every channel difference uniformly.)
- [x] ~~Every row is scaled against its **own** min/max, so changing one category's amounts leaves
      every other row's colours untouched.~~ **Superseded 2026-08-09 (see the implementation note):
      every category row shares one scale pooled over the whole grid; only the `All` band has its
      own.** The colour function still takes a scale per call and is specced both ways
      (`chart-theme.spec.ts` › "scales every row against its own extent" — the function's own
      contract); what the panel *passes* is now one shared category scale, asserted in
      `spending-heatmap-panel.component.spec.ts` › "reads every category row against the same scale,
      so equal amounts shade equally".
- [x] A row with no spread (all cells equal, including all zero) renders flat in the category colour
      and never produces `NaN`, a division by zero, or a non-hex string. (`chart-theme.spec.ts` ›
      "draws a row with no spread flat in the category colour, all-zero included".)
- [x] Colours are emitted as `#rrggbb`, never `oklch()` or a CSS variable — an echarts canvas option
      cannot consume those (the existing `chart-theme.spec.ts` rule). (`chart-theme.spec.ts` ›
      "never emits NaN, a division by zero or a non-hex string an echarts canvas could not
      consume" — every theme in the catalogue × five anchors, an `oklch(...)` string and `''`
      included, which `normalizeHex` routes to `CHART_NO_COLOR_FALLBACK`.)
- [x] A category with no colour, and the `Other` fold, ramp from `CHART_NO_COLOR_FALLBACK`.
      (The aggregate already sets `row.color` to that gray for both — `category-cycle-heatmap.ts`'s
      `buildRows` — and the panel ramps from whatever `row.color` holds:
      `spending-heatmap-panel.component.spec.ts` › "ramps the \"Other\" fold from the neutral gray
      the aggregate hands it", plus `chart-theme.spec.ts` › "ramps an uncoloured category".)
- [x] The single global amount scale is gone and a caption states what the shading is relative to.
      (The *reader-visible* scale is gone — no bar, no amount labels, and the room it claimed under
      the axis is back. A hidden `visualMap` remains because echarts will not draw a cartesian
      heatmap without one at all; see the implementation note. `HEATMAP_SHADING_CAPTION` renders
      under the chart and now names both scales. Specs: "draws no reader-visible amount scale" and
      "states what the shading is relative to". Confirmed in the browser: no scale is drawn.)
- [x] The cycle picker, category exclusion, cell drill-down, the `sr-only` table's figures and
      privacy mode's withholding are all unchanged (their existing specs pass untouched). (All of
      TICKET-STAT-29..32's specs pass as written. Two assertions inside the privacy-mode specs were
      rewritten because they asserted on the *removed* `visualMap` — `visualMap.show === false`
      became `visualMap` is `undefined`; the withholding itself, the tooltip suppression and the
      `sr-only` figures are asserted exactly as before.)
- [x] Unit tests cover: the average anchor; both directions on both theme modes; hue preservation;
      the no-spread row; the missing-colour fallback; per-row independence; the hex-only rule.
      (Nine cases in `chart-theme.spec.ts` › "resolveHeatmapCellColor (TICKET-STAT-34)" plus two in
      "resolveChartPlotMode (TICKET-STAT-34)", and four more through the option builder in
      `spending-heatmap-panel.component.spec.ts` › "per-category colour scales (TICKET-STAT-34)".)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (2026-08-09: lint
      clean, 2633 tests / 243 files green, dev build completes.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`:
      verdict **pass**, 0 dead code, 0 duplication, 0 introduced complexity — `resolveHeatmapCellColor`
      first landed at CRAP 42 and was restructured around the `HEATMAP_RAMP` table to clear it.
      `conventions-reviewer` on the diff: no blocking violations; its three notes were all applied —
      `HEATMAP_SHADING_CAPTION` un-exported, the row-slice de-duplicated into `rowAmounts`, and
      `coding-conventions/SKILL.md`'s now-stale `visualMap` privacy example refreshed.)
- [x] Verified live in the browser: the heatmap on `/dashboard` in a light theme and a dark one,
      confirming each row carries its category's hue and that the heavier cells are the ones that
      stand out in both. (2026-08-09, initially waived then run at the user's request — and it
      earned its keep: it is what found the `Heatmap must use with visualMap` throw that left the
      chart blank. Canvas pixels sampled per cell, cross-checked against the `sr-only` figures.
      Light theme (`deformable`): Housing `[950,0,950,0,950,0,950]` → `#7e491e` / `#fedec5`
      alternating exactly with the data; Utilities blue, Groceries green, Eating Out olive, `Other`
      grey — one hue per row. Dark theme (`deformable-dark`, switched through the real theme
      picker): the same Housing row → `#fdc99e` (luminance 204) on heavy days against `#4b2c12`
      (46) on quiet ones — the direction flips, heavier still stands out.)

## Notes

- **`visualMap` cannot express this.** It maps one scale across a series, so per-row ramps mean
  either resolving each cell's colour in the option builder (`itemStyle` per data item, one series)
  or one series plus one `visualMap` per row. The first keeps the option shape flat and is why the
  amount scale disappears rather than multiplying; the choice is the implementer's, but the
  behaviour above is not.
- **Ships before [TICKET-STAT-33](./TICKET-STAT-33-heatmap-all-row.md)** by preference: that ticket's
  separately-scaled `All` band needs exactly the per-row colour resolution this one introduces, and
  built the other way round it would arrange two scales only for this ticket to delete them.
- **Anchored at the average, not the midpoint of the range.** A row with one huge Friday and four
  quiet days has an average far below its midpoint, and it is the average — "what this category
  usually costs on a day like this" — that the user reads a cell against. It also means the
  configured colour is the colour most cells are near, which is what makes the row recognisable.
- **Colour is the heatmap's only visual encoding**, so this changes nothing about accessibility
  either way: the `sr-only` table (TICKET-STAT-20's convention) remains the accessible rendering, and
  the y-axis labels — not hue — are what identify a row. Category colours are user-chosen, so two
  rows *can* end up similar; that is true of every other chart in the app and is the user's own call.
- Only the heatmap is in scope. A wider review of the categorical palette and the gross/net series
  colours across all nine themes — including a colour-vision-deficiency check none of them has had —
  is worth its own ticket and is not attempted here.
